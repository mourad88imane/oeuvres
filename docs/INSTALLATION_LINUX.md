# Guide d'installation — Linux

Plateforme de Gestion des Œuvres Sociales (Django 5.1 + DRF / React 18 + Vite / PostgreSQL 16 / Redis 7 / Celery / Nginx / Docker).

---

## 1. Prérequis

```bash
# Docker Engine + plugin Compose (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Autoriser Docker sans sudo (puis SE DÉCONNECTER/RECONNECTER)
sudo usermod -aG docker $USER

# Git + Make
sudo apt-get install -y git make

# Vérification
docker --version && docker compose version && make --version | head -1
```

---

## 2. Récupérer le projet

```bash
git clone <url-du-repo> oeuvres-sociales
cd oeuvres-sociales
```

---

## 3. Installation — Environnement de DÉVELOPPEMENT (recommandé)

Tout tourne en Docker : rien à installer côté Python/Node.

### 3.1 Fichiers d'environnement

```bash
# Backend (le Makefile le fait aussi automatiquement)
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Valeurs par défaut dev (dans `backend/.env`) — conviennent telles quelles :

| Variable | Valeur dev |
|---|---|
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `oeuvres_sociales_dev` / `oeuvres_user` / `oeuvres_password_dev` |
| `SECRET_KEY` | clé de dev (à remplacer en prod) |
| `JWT_ACCESS_LIFETIME_MINUTES` | 480 |
| Email | MailHog (aucun envoi réel) |

### 3.2 Démarrer

```bash
make dev          # = docker compose up -d (build au 1er lancement : 5-10 min)
```

Le conteneur backend applique automatiquement les migrations au démarrage.

### 3.3 Créer le compte admin + données de démo

```bash
make createsuperuser       # suit les invites (email + mot de passe)
# OU jeu de données de démonstration (employés, partenaires, prestations...) :
make seed
```

### 3.4 URLs

| Service | URL |
|---|---|
| **Application** | http://localhost |
| API / Docs | http://localhost/api/docs/ |
| Admin Django | http://localhost/admin/ |
| MailHog (emails de dev) | http://localhost:8025 |
| Backend direct | http://localhost:8000 |
| Frontend direct (HMR) | http://localhost:3000 |
| pgAdmin (optionnel) | `docker compose --profile tools up -d pgadmin` → http://localhost:5050 (admin@oeuvres.dz / admin123) |

### 3.5 Commandes utiles (Makefile)

```bash
make status        # état des services
make logs          # logs tous services (-f)
make logs-backend  # logs Django
make shell         # shell Django (shell_plus)
make migrate       # appliquer les migrations
make test          # tests + coverage
make test-app APP=users   # tests d'un module
make lint          # ruff (backend) + eslint (frontend)
make stop          # arrêter
make restart       # redémarrer
make backup-db     # dump PostgreSQL → backups/
make restore-db FILE=backups/backup_XXXX.sql
```

---

## 4. Installation — PRODUCTION

### 4.1 Environnement

```bash
cp backend/.env.example backend/.env.production
```

Renseigner **obligatoirement** dans `.env.production` :

```bash
# Générer les secrets
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
openssl rand -base64 32   # REDIS_PASSWORD
openssl rand -base64 32   # POSTGRES_PASSWORD / DB_PASSWORD
```

| Variable | Rôle |
|---|---|
| `SECRET_KEY` | clé Django (32+ caractères aléatoires) |
| `DEBUG` | **False** |
| `ALLOWED_HOSTS` | domaine ou IP du serveur |
| `CORS_ALLOWED_ORIGINS` | origine frontend exacte |
| `POSTGRES_DB/USER/PASSWORD` | utilisés aussi par le compose prod |
| `REDIS_PASSWORD` | requis (Redis non exposé sans mot de passe) |

### 4.2 Certificats SSL

```bash
mkdir -p nginx/ssl
# Let's Encrypt (si domaine public) :
sudo apt install certbot
sudo certbot certonly --standalone -d oeuvres-sociales.dz
sudo cp /etc/letsencrypt/live/oeuvres-sociales.dz/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/oeuvres-sociales.dz/privkey.pem  nginx/ssl/key.pem
```

### 4.3 Lancer

```bash
docker compose -f docker-compose.prod.yml up -d --build

# Puis dans l'ordre :
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput --clear
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Vérifier
docker compose -f docker-compose.prod.yml ps
curl -k https://localhost/api/v1/health/live/
```

Application : https://votre-serveur (80 → 443).

### 4.4 Sauvegardes

```bash
mkdir -p backups
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backups/prod_$(date +%F_%H%M).sql.gz
```

---

## 5. Installation MANUELLE (sans Docker) — optionnelle

Nécessaire uniquement si Docker est impossible.

**Prérequis** : Python 3.12, PostgreSQL 16, Redis 7, Node.js ≥ 20, npm.

```bash
# ── Backend ──────────────────────────────────────────────
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements/development.txt     # (prod : production.txt)
cp .env.example .env                            # adapter DB_HOST=127.0.0.1, REDIS_URL=redis://127.0.0.1:6379/0
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000

# ── Celery (2 terminaux) ─────────────────────────────────
celery -A config worker --loglevel=info
celery -A config beat  --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# ── Frontend ─────────────────────────────────────────────
cd ../frontend
npm install
cp .env.example .env.local                      # VITE_API_URL=/api/v1 (relatif : le proxy Vite forward /api)
npm run dev                                     # http://localhost:3000

# NB : le proxy Vite cible « backend:8000 » (DNS Docker). Hors Docker :
# VITE_PROXY_TARGET=http://127.0.0.1:8000 npm run dev
```

---

## 6. Dépannage

| Symptôme | Solution |
|---|---|
| `permission denied ... docker.sock` | `sudo usermod -aG docker $USER` puis reconnexion |
| Port 80 occupé | Changer `"80:80"` en ex. `"8080:80"` dans `docker-compose.yml` |
| Backend redémarre en boucle | `docker compose logs backend` (souvent `.env` manquant ou DB pas prête) |
| `docker compose` inconnu | Installer le **plugin compose** (`docker-compose-plugin`) |
| Connexion bloquée après 5 échecs de login | Verrou django-axes 30 min : `docker compose exec backend python manage.py shell -c "from axes.utils import reset; reset()"` |
| Frontend ne voit pas l'API | Vérifier `VITE_API_URL` (dev compose : `/api/v1`) et reconstruire |
| `400 Bad Request` sur `https://<IP>` | `ALLOWED_HOSTS` ne contient pas cette IP → l'ajouter dans `backend/.env.production` puis `docker compose -f docker-compose.prod.yml up -d backend` |
| Page de connexion OK mais rien ne se passe (console : `ERR_CERT_AUTHORITY_INVALID` / `OPTIONS … FAILED` vers une autre IP) | `VITE_API_URL` pointe vers un **autre** serveur → `VITE_API_URL=/api/v1` puis `docker compose -f docker-compose.prod.yml up -d --build frontend` |
| `401 Aucun compte actif n'a été trouvé avec les identifiants fournis` | Aucun utilisateur en base → `docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser` |
| `git status` : `index file … is too small` + des centaines de fichiers `._*` | Fichiers AppleDouble macOS → `find . -name '._*' -type f -delete` |
| Avertissement navigateur sur le certificat (auto-signé) | Normal en interne : « Avancé → Continuer ». Sinon déposer un certificat signé dans `nginx/ssl/` |

**Règles d'or (production)** :

- Ne **jamais** lancer `makemigrations` sur le serveur — générer les migrations en local et les déployer.
- Ne jamais committer les fichiers `.env`.
- Toujours sauvegarder la base (`make backup-db` / `pg_dump`) avant toute migration.
