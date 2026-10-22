from django.db import migrations


def backfill_null_tenants(apps, schema_editor):
    """Affecte le tenant par défaut à toutes les lignes tenant_id = NULL.

    La migration 0003 couvrait une liste fixe de modèles et pas le module
    invoicing ; en outre, des lignes créées ensuite via des flux qui
    contournaient perform_create ont de nouveau tenant_id = NULL. Cette
    migration est générique (tous les modèles portant un FK tenant) et
    idempotente.
    """
    Tenant = apps.get_model("tenant", "Tenant")
    default = Tenant.objects.filter(slug="default").first()
    if default is None:
        return
    for model in apps.get_models():
        if model._meta.abstract or model._meta.proxy:
            continue
        try:
            field = model._meta.get_field("tenant")
        except Exception:
            continue
        related_model = getattr(field, "related_model", None)
        if related_model is None or related_model._meta.model_name != "tenant":
            continue
        manager = getattr(model, "objects", None) or getattr(model, "_base_manager", None)
        if manager is None:
            continue
        try:
            manager.filter(tenant__isnull=True).update(tenant=default)
        except Exception:
            pass


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("tenant", "0003_assign_default_tenant_to_all"),
        ("invoicing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(backfill_null_tenants, reverse_backfill),
    ]
