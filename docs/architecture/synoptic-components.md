# Schéma synoptique — Composants & Interactions

> Plateforme « Oeuvres Sociales » — lecture de l'architecture **telle qu'elle est codée aujourd'hui**
> (vérifiée le 04/10/2026 sur l'environnement `docker compose` local).
>
> Deux formats : ce fichier Markdown (diagrammes Mermaid, lisible sur GitHub/GitLab)
> et le rendu navigateur [synoptic-components.html](./synoptic-components.html).

---

## 1. Vue d'ensemble — conteneurs et flux réseau

Tout tourne dans un réseau Docker `oeuvres_network`. Le navigateur ne parle qu'à **Nginx** (port 80),
qui route selon l'URL.

```mermaid
flowchart LR
    U["Navigateur<br/>(utilisateur)"]

    subgraph DOCKER["Réseau Docker : oeuvres_network"]
        NG["<b>Nginx</b><br/>reverse proxy :80"]

        subgraph APP["Application"]
            FE["<b>Frontend</b> React 18 + Vite 6<br/>:3000 (HMR, code hot-reload)"]
            BE["<b>Backend</b> Django 5.1 + DRF<br/>runserver :8000 (hot-reload)"]
            CW["<b>Celery worker</b><br/>tâches asynchrones"]
            CB["<b>Celery beat</b><br/>plannification (DatabaseScheduler)"]
        end

        subgraph DATA["Données"]
            PG[("PostgreSQL 16<br/>:5432 — volume postgres_data")]
            RD[("Redis 7<br/>:6379 — cache + broker<br/>volume redis_data")]
        end

        MH["<b>MailHog</b><br/>SMTP :1025 / UI :8025"]
    end

    U -->|"HTTP / /api/ /admin/"| NG
    NG -->|"/  (SPA, assets)"| FE
    NG -->|"/api/**  /metrics"| BE
    NG -->|"/admin/(sauf modules React)"| BE

    BE --> PG
    BE --> RD
    BE -.->|"email (SMTP)"| MH
    CW --> PG
    CW --> RD
    CB --> PG
    CB --> RD
    FE -->|"fetch/XHR : /api/v1/**"| NG
```

**Ports exposés sur l'hôte :** `80` (app), `3000` (Vite direct), `8000` (API direct),
`5432` (Postgres/DBeaver), `6379` (Redis), `1025`/`8025` (MailHog), `5050` (pgAdmin, profil `tools`).

**Routing Nginx** (`nginx/conf.d/default.conf`) :

| Location | Destination | Remarque |
|---|---|---|
| `/api/v1/auth/login/` | backend | rate-limit **5 req/min** (anti-brute-force) |
| `/api/**` | backend | rate-limit **120 req/min**, headers sécurité + CSP |
| `/admin/(roles\|permissions\|org-structure\|workflow-…)` | **frontend** | l'admin avancé est une page React |
| `/admin/**` | backend | Django admin classique |
| `/static/`, `/media/` | fichiers locaux | |
| `/metrics` | backend | Prometheus (restreint) |
| `/` | frontend | `try_files` → SPA React Router |

---

## 2. Cycle de vie d'une requête API (côté serveur)

Le chemin d'une requête `GET /api/v1/employees/` : Nginx → pile de middleware Django → URLconf → permission → ViewSet → sérialiseur → modèle.

```mermaid
flowchart TD
    R["Requête HTTP"] --> N["Nginx<br/>rate-limit + sécurité + proxy"]
    N --> M1["PrometheusBefore<br/>Cors → Session → Locale"]
    M1 --> M2["<b>CorrelationIDMiddleware</b><br/>X-Request-ID / X-Correlation-ID"]
    M2 --> M3["CSRF → CSP → Auth (JWT) → Axes<br/>(brute-force 5 essais / 30 min)"]
    M3 --> M4["<b>TenantMiddleware</b> (multi-tenant)"]
    M4 --> M5["<b>AuditMiddleware</b> + signaux post_save/post_delete<br/>→ journal d'audit (ENGINE_AUDIT_MODELS)"]
    M5 --> M6["<b>APIMonitoringMiddleware</b><br/>→ monitoring_apirequestlog / apiendpointstatus"]
    M6 --> M7["PrometheusAfter"]
    M7 --> U1["config/urls.py<br/>/api/v1/&lt;module&gt;/"]
    U1 --> P{"permission_classes<br/>IsAuthenticated + HasModuleAccess('x')"}
    P -->|KO| E403["403 / 401"]
    P -->|OK| V["ViewSet DRF<br/>(DefaultRouter)"]
    V --> S["Serializer + validation"]
    S --> DB[("PostgreSQL")]
    DB --> S --> J["Réponse JSON paginée<br/>(PAGE_SIZE = 25)"]
    J --> MON["écriture monitoring + audit"]
    MON --> N
```

**RBAC en deux niveaux :**
- **Backend** : `core/permissions.py` (`IsAdmin`, `IsComptable`, `HasRoles`…)
  + `HasModuleAccess("<module>")` — vérifie qu'une permission Django du module est possédée.
- **Frontend** : `ProtectedRoute module="benefits"` → `authStore.hasModuleAccess()`
  lit les permissions reçues au login, sinon redirection `/403`.

---

## 3. Frontend — structure et interactions

```mermaid
flowchart TD
    ENTRY["main.tsx → App.tsx → RouterProvider"] --> RT["<b>app/router.tsx</b><br/>createBrowserRouter (lazy loading)"]

    RT --> L1["Public : /login, /change-password, /403"]
    RT --> PR["<b>ProtectedRoute</b>"]
    PR -->|"non authentifié"| LOGIN["→ /login"]
    PR -->|"module interdit"| F403["→ /403"]
    PR -->|OK| AL["<b>AppLayout</b><br/>sidebar / header / i18n fr-ar-en"]

    AL --> M1["dashboard, analytics, ai"]
    AL --> M2["employees, beneficiaries, benefits, loans"]
    AL --> M3["finance, conventions, invoicing,<br/>medical-coverage"]
    AL --> M4["users, organization, administration,<br/>monitoring, notifications, documents"]

    M1 & M2 & M3 & M4 --> API["<b>shared/api/apiClient.ts</b><br/>(instance Axios)"]

    subgraph INTER["Intercepteurs Axios"]
        REQ["Requête : + Authorization Bearer,<br/>+ X-Request-ID, mesure durée"]
        RES["Réponse : 401 → POST /auth/refresh/<br/>(file d'attente anti-boucle) → retry,<br/>échec → logout + /login"]
    end

    API --> REQ --> RES
    RES -->|"GET/POST /api/v1/..."| NGX["Nginx"]
    NGX --> DJ["Django DRF"]

    ST["<b>modules/auth/store/authStore.ts</b><br/>Zustand + persist (localStorage)<br/>accessToken / refreshToken / user / permissions"] --- AL
    ST --- PR
```

- Chaque dossier `frontend/src/modules/<module>` = **pages + api/ + store**, miroir d'une app Django.
- Pas de WebSocket : tout est HTTP + polling ; le temps réel est géré par le refresh automatique des données.
- Vite sert l'app sur `:3000` avec HMR ; Nginx lui sert le reste des URLs non-API.

---

## 4. Backend — applications métier et leurs dépendances

```mermaid
flowchart TD
    subgraph AUTH["Accès & identité"]
        AUTHZ["authentication<br/>JWT login/logout/refresh/me"]
        USERS["users<br/>rôles & permissions"]
        DEPT["departments"]
        ORG["organization<br/>bureaux, fonctions, grades"]
        ADMIN["administration<br/>settings, matrice d'approbation,<br/>règles de workflow, audit-logs"]
    end

    subgraph CORE_DOM["Population"]
        EMP["<b>employees</b><br/>dossiers employés"]
        BEN["beneficiaries<br/>ayants droit"]
    end

    subgraph PREST["Prestations & engagement"]
        BENE["<b>benefits</b><br/>prestations (workflow)"]
        LOAN["loans<br/>prêts (workflow)"]
        MED["<b>medical_coverage</b><br/>demandes, bons, prestataires"]
        CONV["<b>conventions</b><br/>partenaires & conventions"]
        INV["<b>invoicing</b><br/>factures prestataires"]
        FIN["<b>finance</b><br/>budgets, lots & paiements"]
    end

    subgraph RES["Restitution"]
        REP["reporting<br/>exports & planification"]
        DASH["dashboard<br/>KPIs"]
        MON["monitoring<br/>santé API & métriques"]
        AI["shared/ai<br/>scoring, anomalies, forecast"]
    end

    AUTHZ --> USERS
    DEPT --> EMP
    EMP --> BEN & BENE & LOAN & MED
    BEN --> BENE
    BENE --> MED
    CONV --> MED
    MED --> INV
    INV --> CONV
    BENE --> FIN
    FIN --> BENE
    REP --> EMP & BEN & BENE & FIN & DEPT & USERS
    DASH --> REP
    AI --> BEN & EMP & FIN & REP & DEPT
    LOAN --> ADMIN
    MED --> ADMIN
    ADMIN --> AUTHZ
    ORG -.-> ADMIN
```

*Lecture : une flèche `A → B` signifie « l'app A importe/consomme l'app B »
(relevé par grep des `from apps.*` dans `backend/apps`).*

**Modules exposés dans `config/urls.py`** sous `/api/v1/` :
`auth, users, departments, employees, beneficiaries, benefits, loans, finance, conventions,
reporting, dashboard, notifications, monitoring, medical-coverage, invoicing, admin, organization,
tenants, audit, ai, documents` + `health/health/live/health/ready` (publics),
`/api/schema/` et `/api/docs/` (OpenAPI/Swagger via drf-spectacular).

---

## 5. Transversal — `core/` et `shared/` (les briques réutilisables)

```mermaid
flowchart LR
    subgraph REQ_IN["Entrée requête"]
        MW["core/middleware<br/>CorrelationID, CSRF exempt API"]
        TEN["shared/tenant"]
        AUD["shared/audit<br/>journal d'audit"]
        APM["apps/monitoring<br/>APIMonitoringMiddleware"]
    end

    subgraph BRIQUES["Briques de domaine"]
        WF["<b>shared/workflow</b><br/>WorkflowEngine : états, transitions,<br/>rôles autorisés, hooks avant/après"]
        NOTIF["shared/notifications<br/>Notification + préférences + email"]
        DOCS["shared/documents<br/>pièces jointes → media/"]
        REPO["shared/reporting<br/>agrégations & exports"]
        AIENG["shared/ai<br/>scoring, anomalies, prévision,<br/>recommandations"]
        RBAC["shared/permissions (RBAC)"]
        WH["shared/warehouse<br/>entrepôt analytique"]
        REG["shared/registry<br/>référentiels"]
    end

    subgraph KERNEL["kernel Django"]
        CORE["core/: BaseModel, managers,<br/>pagination (25/page), exceptions,<br/>permissions (IsAdmin, HasRoles…)"]
        ST["Django simple_history<br/>historique des lignes"]
    end

    WF --> CORE
    AUD --> ST
    NOTIF --> CORE
    DOCS --> CORE
    REPO --> CORE
    AIENG --> REPO
    REQ_IN --> BRIQUES
    BRIQUES --> KERNEL
```

**WorkflowMixin** est branché sur `Benefit`, `MedicalCoverageVoucher`, `MedicalCoverageRequest` et `Loan` :
la machine à états est déclarée (`apps/<module>/workflow.py`) et peut être **surchargée par la base**
(`WorkflowRule` gérée depuis l'écran *Administration → Règles de workflow*).

---

## 6. Séquence — authentification JWT

```mermaid
sequenceDiagram
    autonumber
    participant B as Navigateur
    participant F as apiClient.ts (Axios)
    participant N as Nginx
    participant D as Django (authentication)
    participant DB as PostgreSQL

    B->>F: submit login (email + mot de passe)
    F->>N: POST /api/v1/auth/login/
    Note over N: rate-limit 5 req/min
    N->>D: proxy_pass → LoginView (throttle AnonRateThrottle)
    D->>DB: vérifie credentials (Axes : 5 échecs → blocage 30 min)
    D-->>F: 200 {access, refresh} + profil + permissions
    F->>F: authStore.setTokens() → Zustand persist (localStorage)
    F-->>B: redirection vers /dashboard

    loop à chaque requête protégée
        B->>F: action utilisateur
        F->>N: GET /api/v1/... + Authorization: Bearer
        N->>D: JWTAuthentication
        D-->>F: 200 données
    end

    Note over F,D: access token expiré
    F->>N: POST /api/v1/auth/refresh/
    N->>D: TokenRefreshView (rotation)
    D-->>F: nouveau access token
    Note over F: si le refresh échoue → logout → /login
```

---

## 7. Flux métier — une prestation (cœur du domaine)

```mermaid
stateDiagram-v2
    [*] --> draft: création
    draft --> submitted: Soumettre<br/>(admin, gestionnaire, department_manager)
    draft --> cancelled: Annuler
    submitted --> under_review: Prendre en charge
    submitted --> on_hold: Mettre en attente
    submitted --> validated: Valider directement
    submitted --> rejected: Rejeter
    submitted --> cancelled: Annuler
    on_hold --> submitted: Re-soumettre
    under_review --> on_hold: Mettre en attente
    under_review --> validated: Valider<br/>(admin, gestionnaire, department_manager)
    under_review --> rejected: Rejeter
    validated --> paid: Confirmer le paiement<br/>→ création Payment (finance)
    validated --> rejected: Rejeter après validation
    rejected --> [*]
    paid --> [*]
    cancelled --> [*]
```

**Effets de bord d'une transition** (hooks du moteur, `apps/benefits/workflow.py`) :

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant FE as Page React
    participant API as DRF (BenefitViewSet)
    participant WFE as WorkflowEngine
    participant DB as PostgreSQL
    participant CL as Celery worker
    participant EM as MailHog

    U->>FE: cliquer « Valider »
    FE->>API: POST /api/v1/benefits/:id/transition/
    API->>WFE: can_transition() → transition()
    WFE->>WFE: vérifie rôle autorisé + règle en base
    WFE->>DB: UPDATE workflow_state + simple_history
    WFE->>DB: INSERT audit log + notification in-app
    WFE--)CL: notify_benefit_transition.delay(...)
    CL--)EM: envoi email de notification
    API-->>FE: 200 {état, transitions disponibles}
    FE-->>U: badge d'état mis à jour
```

**Chemin prestation → paiement (flux transversal) :**

```mermaid
flowchart LR
    EMP["Employee"] --> BENF["Beneficiary"]
    BENF --> B["Benefit<br/>(workflow)"]
    B -->|"validée → payée"| P["Payment<br/>+ PaymentBatch + FinancialEntry"]
    B --> BL["BudgetLine<br/>consommation du budget"]
    MED["MedicalCoverageRequest"] --> V["MedicalCoverageVoucher<br/>(bon)"]
    V -->|"consommé"| INV["ProviderInvoice<br/>+ InvoiceLine, VoucherConsumption"]
    CONV["Convention / Partner"] --> MED
    INV --> PAY2["Validation → paiement prestataire"]
    B & P & INV --> REP["reporting / dashboard (KPIs)"]
```

---

## 8. Couche asynchrone — Celery

```mermaid
flowchart LR
    subgraph SYNC["Synchronique (requête HTTP)"]
        APIV["Vue DRF qui appelle .delay()"]
        SIG["signaux post_save (audit, notifications)"]
    end

    subgraph BROK["Redis (broker + result backend)"]
        Q[("file de tâches")]
    end

    subgraph WORK["Celery worker (--concurrency=2)"]
        T1["benefits.notify_benefit_transition<br/>(retry ×3, 60 s)"]
        T2["loans.notify_loan_transition"]
        T3["notifications.send_notification_email<br/>+ send_digest_emails + cleanup"]
        T4["reporting.snapshot_kpis / generate_scheduled_reports<br/>/ cleanup_old_exports"]
        T5["conventions.check_convention_expirations"]
        T6["monitoring.aggregate_api_metrics<br/>/ monitor_endpoint_health / cleanup"]
        T7["ai.run_ai_pipeline (scoring, anomalies,<br/>forecast, recommandations)"]
    end

    subgraph OUT["Sorties"]
        PG[("PostgreSQL<br/>résultats, notifications, métriques")]
        MAIL["MailHog :1025 → UI :8025"]
        MED2["Documents / exports"]
    end

    APIV --> Q
    SIG --> Q
    Q --> T1 & T2 & T3 & T4 & T5 & T6 & T7
    T1 & T2 & T3 --> MAIL
    T1 & T2 & T3 & T4 & T5 & T6 & T7 --> PG
    T4 --> MED2
```

> **Point d'attention constaté :** le scheduler est `django_celery_beat.schedulers:DatabaseScheduler`,
> or la table `django_celery_beat_periodictask` ne contient **qu'une seule** tâche
> (`celery.backend_cleanup`, tous les jours à 04:00). Les tâches métier
> (`snapshot_kpis`, `check_convention_expirations`, `generate_scheduled_reports`,
> `run_ai_pipeline`, `aggregate_api_metrics`, `send_digest_emails`…) sont donc **définies mais non planifiées** :
> elles ne s'exécutent que si on les déclenche à la main (`celery -A config call <task>`).
> Ajouter les entrées correspondantes (interface *Administration* ou migration) activerait la
> rotation des KPIs, des rappels de conventions et des rapports planifiés.

---

## 9. Cartographie frontend ↔ API

| Module React (`frontend/src/modules/`) | Point d'entrée API (`/api/v1/`) | App Django |
|---|---|---|
| `auth` | `/auth/`, `/users/me/` | authentication, users |
| `dashboard`, `analytics` | `/dashboard/`, `/reporting/` | dashboard, reporting |
| `employees`, `beneficiaries` | `/employees/`, `/beneficiaries/` | employees, beneficiaries |
| `benefits`, `loans` | `/benefits/`, `/loans/` | benefits, loans |
| `finance` | `/finance/` | finance |
| `conventions` | `/conventions/` | conventions |
| `medical-coverage`, `invoicing` | `/medical-coverage/`, `/invoicing/` | medical_coverage, invoicing |
| `users`, `organization`, `administration` | `/users/`, `/organization/`, `/admin/` | users, organization, administration |
| `monitoring`, `notifications`, `documents`, `ai` | `/monitoring/`, `/notifications/`, `/documents/`, `/ai/` | apps + shared/* |

---

## 10. Enchaînement type (synthèse)

```mermaid
flowchart LR
    A["1. Login"] --> B["2. Dashboard / KPIs"]
    B --> C["3. Créer un employé<br/>+ ayant droits"]
    C --> D["4. Déposer une prestation<br/>ou une demande de couverture"]
    D --> E["5. Circuit de validation<br/>(workflow + matrice d'approbation)"]
    E --> F["6. Paiement / bon consommé<br/>+ facture prestataire"]
    F --> G["7. Budget & finance"]
    G --> H["8. Reporting, audit,<br/>monitoring, IA"]
    H -->|"rétroaction (KPIs, règles)"--> E
```

---

### Où regarder dans le code

| Question | Fichier |
|---|---|
| Routage API complet | `backend/config/urls.py` |
| Pile middleware | `backend/config/settings/base.py` (L81) |
| Routage Nginx | `nginx/conf.d/default.conf` |
| Moteur de workflow | `backend/shared/workflow/engine.py` + `backend/apps/benefits/workflow.py` |
| Permissions backend | `backend/core/permissions.py`, `HasModuleAccess` |
| Routes React / RBAC | `frontend/src/app/router.tsx`, `shared/components/layout/ProtectedRoute.tsx` |
| Client HTTP + refresh JWT | `frontend/src/shared/api/apiClient.ts` |
| Tâches Celery | `backend/apps/*/tasks.py`, `backend/shared/*/tasks.py` |
| Conteneurs & volumes | `docker-compose.yml` |
