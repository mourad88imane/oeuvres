"""
============================================================
0010 — SEED ROADMAP PERMISSIONS
============================================================
Corrige les écarts identifiés par l'audit « Feuille de route
Application des œuvres sociales » :

- Agent Gestionnaire : accès aux Statistiques / Analytiques
  (analytics.view, analytics.decisions, analytics.anomalies),
  aux ayants droit réutilisables (dependent.*), aux factures
  (invoice.*) et au tableau de bord (dashboard.view).
- Comptable / Validateur : factures (invoice.view/create/
  update/validate), tableau de bord, statistiques.
- Consultation / Direction : statistiques + tableau de bord.

Idempotent (update_or_create) — n'enlève JAMAIS une permission
non listée ici et RESTAURE une ligne soft-déléguée (is_deleted
remis à False) afin que le grant soit réellement effectif.
"""

from django.db import migrations


ROLE_PERMISSION_GRANTS = {
    # ── Agent Gestionnaire (feuille de route : Statistiques,
    #    Assistant/Decision AI, Gestion Employés – Ayant droit,
    #    Gestion Finance – Factures, Tableau de bord) ─────────
    "gestionnaire": [
        "analytics.view",
        "analytics.decisions",
        "analytics.anomalies",
        "dependent.view",
        "dependent.create",
        "dependent.update",
        "invoice.view",
        "invoice.create",
        "invoice.update",
        "dashboard.view",
        "statistics.view",
    ],
    # ── Comptable / Validateur (feuille de route : Gestion
    #    Finance – Factures, validation, états, tableau de bord) ─
    "comptable": [
        "invoice.view",
        "invoice.create",
        "invoice.update",
        "invoice.validate",
        "dashboard.view",
        "statistics.view",
    ],
    # ── Consultation / Direction (lecture + statistiques) ────
    "consultant": [
        "statistics.view",
        "dashboard.view",
    ],
    "director": [
        "statistics.view",
        "dashboard.view",
    ],
}


def seed_roadmap_permissions(apps, schema_editor):
    Role = apps.get_model("administration", "Role")
    Permission = apps.get_model("administration", "Permission")
    RolePermission = apps.get_model("administration", "RolePermission")

    for role_slug, codenames in ROLE_PERMISSION_GRANTS.items():
        role = Role.all_objects.filter(slug=role_slug).first()
        if not role:
            continue
        for codename in codenames:
            perm = Permission.all_objects.filter(codename=codename).first()
            if not perm:
                continue
            # update_or_create via all_objects : restaure une ligne
            # éventuellement soft-déléguée (is_deleted -> False) au lieu
            # de matcher une ligne inactive qui rendrait le grant muet.
            RolePermission.all_objects.update_or_create(
                role=role,
                permission=perm,
                defaults={"is_deleted": False},
            )


def reverse_seed(apps, schema_editor):
    # Migration additive — pas de réversibilité pour ne pas retirer
    # des permissions qui auraient été ré-attribuées via l'UI.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("administration", "0009_seed_reusable_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_roadmap_permissions, reverse_seed),
    ]
