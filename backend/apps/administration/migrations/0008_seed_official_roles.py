from django.db import migrations


OFFICIAL_ROLES = [
    {"name": "Administrator", "slug": "admin", "rank": 0, "is_system": True},
    {"name": "Agent Gestionnaire", "slug": "gestionnaire", "rank": 1, "is_system": True},
    {"name": "Accountant / Validator", "slug": "comptable", "rank": 2, "is_system": True},
    {"name": "Beneficiary", "slug": "beneficiary", "rank": 3, "is_system": True},
    {"name": "Consultation", "slug": "consultant", "rank": 4, "is_system": True},
]


def seed_official_roles(apps, schema_editor):
    Role = apps.get_model("administration", "Role")
    for r in OFFICIAL_ROLES:
        Role.all_objects.update_or_create(
            slug=r["slug"],
            defaults={k: v for k, v in r.items() if k != "slug"},
        )


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("administration", "0007_generic_approval_history"),
    ]

    operations = [
        migrations.RunPython(seed_official_roles, reverse_seed),
    ]
