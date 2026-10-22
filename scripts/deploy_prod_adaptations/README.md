# Adaptations de migrations pour la prod (10.10.10.244)

Déploiement du 2026-09-16. L'historique de migrations en prod a divergé
(migrations générées sur le serveur en juillet 2026). À réutiliser à chaque
déploiement tant que les arbres ne sont pas unifiés :

- `employees/0005_historicalemployee_bureau_and_more.py` : reconstitué à
  l'identique de la prod (appliqué le 2026-07-14). La chaîne locale
  0005/0006/0007 ne doit PAS partir en prod.
- `employees/0006_reconcile_prod_chain.py` : no-op qui raccorde la chaîne
  locale à la prod.
- `invoicing/0002_add_invoiceline_quantity_unit_price.py` : idempotent
  (no-op si les colonnes existent déjà, comme en prod).
- `administration/0012_merge_0010_rename_0011_seed.py` : merge des deux
  feuilles (0010_rename prod + 0011_seed local).
- À faire aussi : dans `invoicing/0001_initial.py`, garder les dépendances
  historiques (conventions 0006, medical_coverage 0007) — PAS 0007/0012.

Procédure : build frontend → tar backend+dist → scp → extraction →
`deploy_vm.sh` (SANS makemigrations) → migrate → seed_providers → restart
backend + celery worker/beat (docker cp du même payload).
