# Charte d'utilisation — Plateforme de Gestion des Œuvres Sociales

**Version** : 1.0 — 28 septembre 2026
**Portée** : tous les utilisateurs de la plateforme (accès interne organisme — https://10.10.10.244)
**Valeur** : document interne d'utilisation. Son acceptation conditionne l'octroi et le maintien des accès.

---

## Préambule

La plateforme de gestion des œuvres sociales traite des données personnelles et sociales des agents de l'organisme : identité, famille (ayants droit), situation médicale (prises en charge), données financières (prêts, aides, factures prestataires). Chaque accès est nominatif, tracé et audité. La présente charte définit les droits et devoirs de chaque utilisateur. Elle ne remplace ni les textes en vigueur, ni le règlement intérieur de l'organisme.

---

## 1. Engagements généraux de tout utilisateur

Tout utilisateur s'engage à :

1. **Accès nominatif** — utiliser uniquement son compte personnel. Le partage de compte ou de mot de passe est interdit.
2. **Mot de passe** — choisir un mot de passe conforme à la politique de l'application (10 caractères minimum), ne jamais le communiquer, le changer immédiatement si un doute de compromission existe. Un mot de passe provisoire remis par l'administrateur doit être changé à la première connexion (l'application l'impose).
3. **Confidentialité** — ne pas divulguer, copier ou exporter hors de l'application les données des agents, de leurs familles ou des prestataires, sauf mission explicite.
4. **Usage professionnel** — n'utiliser la plateforme que dans le cadre de ses fonctions. Toute consultation sans motif professionnel (curiosité, recherche nominative sans dossier) est une faute.
5. **Exactitude des données** — saisir des informations exactes ; corriger ou signaler sans délai toute erreur constatée.
6. **Traçabilité** — tout est journalisé : connexions, créations, modifications, validations, impressions, changements de statut, modifications de factures et de bons. L'utilisateur est présumé auteur des actions réalisées avec son compte.
7. **Signalement** — signaler à l'administrateur toute anomalie, erreur de droits, donnée incohérente ou suspicion d'incident de sécurité.
8. **Sortie de poste** — se déconnecter en fin de session sur les postes partagés (l'inactivité finit par fermer la session, mais cela ne dispense pas de la déconnexion volontaire).

---

## 2. Rôles et périmètres d'action

La plateforme distingue les rôles suivants ; chacun s'engage à rester dans son périmètre et à ne pas tenter de contourner les restrictions.

| Rôle | Périmètre principal | Ne doit pas |
|---|---|---|
| **Administrateur** | Administration des comptes, rôles, permissions, paramètres ; validation des demandes sensibles ; supervision générale | Pas d'abus de privilèges : pas de modification de données sans motif ; pas de consultation de dossiers hors supervision légitime |
| **Agent Gestionnaire** | Création et prétraitement des demandes de prise en charge ; gestion des prestations (bons de prise en charge, aides, prêts) ; gestion des employés et ayants droit ; saisie des factures prestataires | Valider ses propres demandes sensibles ; imprimer un bon non validé ; modifier un montant de facture sans justificatif |
| **Comptable / Validateur** | Validation des paiements ; suivi budgétaire ; états financiers et rapports comptables | Modifier les dossiers sociaux hors périmètre financier |
| **Responsable / Validateur (chef de service)** | Approbation ou rejet des demandes soumises à validation (règle des 3 mois, demandes sensibles) | Approuver sans vérification de l'historique du bénéficiaire présenté |
| **Bénéficiaire / Employé** | Dépôt et consultation de ses propres demandes | Consulter les dossiers d'autres agents |
| **Consultation / Direction** | Lecture seule : tableaux de bord, statistiques, rapports, historique | Toute création, modification ou suppression |

**Règle transversale de validation** : le Gestionnaire crée et prétraite ; la validation des demandes sensibles reste réservée au Responsable/Validateur. Un même agent ne valide pas une demande qu'il a lui-même créée lorsqu'elle est soumise à validation.

---

## 3. Règles spécifiques au module « Prise en charge médicale »

Le workflow étant le cœur de l'activité quotidienne, les règles suivantes s'appliquent :

1. **Ordre de création** : toute nouvelle demande commence par la **catégorie** (Centre médical, Centre d'analyse, Imagerie), puis le **partenaire/prestataire**, puis l'**employé**, puis le **bénéficiaire** (l'employé lui-même ou un ayant droit actif et éligible).
2. **Véracité du bénéficiaire** : le bénéficiaire sélectionné doit correspondre au cas réel ; la sélection d'un ayant droit inéligible ou inactif est impossible et ne doit pas être contournée.
3. **Règle des 3 mois** : si le bénéficiaire a déjà un bon au cours des trois derniers mois, la demande reste enregistrable mais passe automatiquement **en attente de validation du responsable**. Il est interdit de fractionner artificiellement des demandes pour contourner cette règle.
4. **Bons et impression** : une demande en attente ou rejetée n'est pas un bon définitif. L'impression d'un bon n'est possible qu'après approbation, et uniquement par un utilisateur disposant de la permission d'impression.
5. **Consommation des bons** : un bon devient **Consommé** uniquement lorsqu'il est réellement ajouté à une facture prestataire. Un bon consommé ne peut plus être facturé une seconde fois (contrôle bloquant côté serveur). Il est interdit de facturer un même bon auprès de plusieurs prestataires.
6. **Cohérence prestataire** : chaque bon facturé doit appartenir au prestataire de la facture.

---

## 4. Protection des données personnelles

1. **Finalité** — les données ne sont utilisées que pour la gestion des œuvres sociales de l'organisme.
2. **Minimisation** — ne consulter que les dossiers nécessaires à la tâche en cours.
3. **Extraction et impression** — toute extraction (export, copie, impression PDF) est tracée ; les documents imprimés contenant des données personnelles sont détruits de façon sécurisée après usage.
4. **Rectification** — tout agent peut demander la rectification de ses données ; la demande est traitée par le Gestionnaire ou l'Administrateur.
5. **Durée de conservation** — les données sont conservées selon les durées fixées par la réglementation applicable et les règles internes de l'organisme.
6. **Litiges famille** — les ayants droit sont saisis conformément aux pièces justificatives officielles.

---

## 5. Sécurité du système

1. **Poste de travail** : verrouiller sa session en cas d'absence ; ne pas laisser un poste connecté sans surveillance.
2. **Verrouillage anti-intrusion** : après 5 tentatives de connexion échouées, l'accès est bloqué temporairement (django-axes). Ne pas tenter de deviner des mots de passe.
3. **Expiration des mots de passe** : le mot de passe expire après **90 jours** ; un avertissement s'affiche **15 jours** avant. L'utilisateur est invité à le renouveler dans ce délai sans attendre la notification.
4. **Matériel et réseau** : la plateforme est réservée au réseau interne de l'organisme ; aucune exposition sur Internet sans décision expresse de l'administrateur.
5. **Incidents** : toute suspicion d'accès frauduleux (connexion inhabituelle, action non réalisée par soi-même) est signalée immédiatement à l'Administrateur, avec date/heure et constat.
6. **Interdictions techniques** : tenter d'accéder à des fonctionnalités au-delà de ses permissions, forcer des URL, altérer ou contourner les contrôles de l'application est une faute grave.
7. **Sauvegardes** : effectuées par l'Administrateur ; aucun utilisateur ne manipule la base directement.

---

## 6. Administration des comptes

1. Création et suppression de comptes : uniquement par l'Administrateur, sur base des besoins validés par la hiérarchie.
2. Attribution des rôles : selon le principe du **moindre privilège** — chaque rôle ne reçoit que les permissions nécessaires à ses fonctions.
3. Réinitialisation de mot de passe : l'Administrateur peut remettre un mot de passe provisoire ; l'utilisateur le change à la première connexion. L'administrateur ne doit jamais connaître le mot de passe définitif de l'utilisateur.
4. Départ d'un agent : le compte est désactivé sans délai le jour du départ (les données sont conservées selon les règles d'archivage).
5. Mouvement / changement de fonction : les permissions sont réajustées au plus vite pour suivre la nouvelle fonction.
6. Revue périodique : l'Administrateur vérifie périodiquement que les comptes actifs correspondent à des agents en activité et que les rôles restent adaptés.

---

## 7. Sanctions

Tout manquement à la présente charte peut entraîner, selon la gravité et après la procédure interne applicable :

- rappel à l'ordre ou avertissement ;
- suspension temporaire des accès ;
- retrait définitif des droits ;
- mesures disciplinaires prévues par le statut de l'agent, et le cas échéant poursuites conformément aux textes en vigueur (notamment en cas d'atteinte à la confidentialité des données personnelles).

Les faits graves (tentative d'intrusion, détournement de bons ou de paiements, falsification de dossiers) sont signalés à la hiérarchie.

---

## 8. Entrée en vigueur et évolution

La charte entre en vigueur dès sa diffusion. Toute modification substantielle est portée à la connaissance des utilisateurs avant application. L'acceptation est matérialisée à la remise des accès (signature papier ou déclaration électronique selon la procédure interne).

**Contacts** :
- Incidents de sécurité, comptes, droits : **Administrateur** de la plateforme.
- Questions métier (workflow prise en charge, prestations) : **chef de service / Responsable**.

---

*Document de référence associé : `docs/INSTALLATION_LINUX.md` (exploitation), README (architecture).*
