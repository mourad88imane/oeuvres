from django.db import migrations

NEW_PERMISSIONS = [
    {"codename": "dashboard.view", "name": "Voir le tableau de bord", "module": "dashboard"},
    {"codename": "dependent.view", "name": "Consulter les ayants droit", "module": "dependent"},
    {"codename": "dependent.create", "name": "Créer des ayants droit", "module": "dependent"},
    {"codename": "dependent.update", "name": "Modifier des ayants droit", "module": "dependent"},
    {"codename": "assistance.view", "name": "Consulter les assistances", "module": "assistance"},
    {"codename": "assistance.create", "name": "Créer des assistances", "module": "assistance"},
    {"codename": "invoice.view", "name": "Consulter les factures", "module": "invoice"},
    {"codename": "invoice.create", "name": "Créer des factures", "module": "invoice"},
    {"codename": "invoice.update", "name": "Modifier des factures", "module": "invoice"},
    {"codename": "invoice.validate", "name": "Valider des factures", "module": "invoice"},
    {"codename": "contract.view", "name": "Consulter les conventions", "module": "contract"},
    {"codename": "contract.create", "name": "Créer des conventions", "module": "contract"},
    {"codename": "statistics.view", "name": "Voir les statistiques", "module": "statistics"},
    {"codename": "user.manage", "name": "Gérer les utilisateurs", "module": "user"},
    {"codename": "role.manage", "name": "Gérer les rôles", "module": "role"},
    {"codename": "settings.manage", "name": "Gérer les paramètres", "module": "settings"},
]


def seed_permissions(apps, schema_editor):
    Permission = apps.get_model("administration", "Permission")
    for p in NEW_PERMISSIONS:
        Permission.all_objects.update_or_create(
            codename=p["codename"],
            defaults={"name": p["name"], "module": p["module"]},
        )


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("administration", "0008_seed_official_roles"),
    ]

    operations = [
        migrations.RunPython(seed_permissions, reverse_seed),
    ]
