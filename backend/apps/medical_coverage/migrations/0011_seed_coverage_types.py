"""Seed the three official medical coverage categories.

The category codes are used by the request workflow (analysis / imaging /
center) and by the eligibility engine.  Without these rows the voucher
3-month rule silently never runs, so we guarantee them on every deploy.
"""

from django.db import migrations


COVERAGE_TYPES = [
    {
        "code": "analysis",
        "name": "Centre d'analyse",
        "description": "Analyses médicales en laboratoire",
        "waiting_period_months": 3,
        "max_per_year": 4,
        "requires_provider": True,
        "color": "#10b981",
    },
    {
        "code": "imaging",
        "name": "Imagerie",
        "description": "Imagerie médicale (radiologie, IRM, scanner)",
        "waiting_period_months": 3,
        "max_per_year": 4,
        "requires_provider": True,
        "color": "#3b82f6",
    },
    {
        "code": "center",
        "name": "Centre médical",
        "description": "Centre médical / consultation spécialisée",
        "waiting_period_months": 3,
        "max_per_year": 4,
        "requires_provider": True,
        "color": "#f59e0b",
    },
]


def seed_coverage_types(apps, schema_editor):
    MedicalCoverageType = apps.get_model("medical_coverage", "MedicalCoverageType")
    for data in COVERAGE_TYPES:
        MedicalCoverageType.all_objects.update_or_create(
            code=data["code"],
            defaults=data,
        )


def unseed_coverage_types(apps, schema_editor):
    MedicalCoverageType = apps.get_model("medical_coverage", "MedicalCoverageType")
    MedicalCoverageType.all_objects.filter(
        code__in=[t["code"] for t in COVERAGE_TYPES]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("medical_coverage", "0010_voucher_fields"),
    ]

    operations = [
        migrations.RunPython(seed_coverage_types, unseed_coverage_types),
    ]
