# Deployed 2026-09-16 — reconciliation migration.
# On the production server, quantity/unit_price were already added to
# invoicing_invoiceline (and its history table) in July 2026 by an earlier
# on-server migration chain whose files were corrupt leftovers
# (null-byte AppleDouble artifacts) and have been removed.
# This migration re-introduces the fields idempotently: it is a no-op
# when the columns already exist (prod) and a real ADD COLUMN on a
# fresh database (dev), keeping the graph linear after 0001_initial.

from django.db import migrations, models


def add_fields_if_missing(apps, schema_editor):
    conn = schema_editor.connection
    table = "invoicing_invoiceline"
    htable = "invoicing_historicalinvoiceline"
    with conn.cursor() as cur:
        cols = [c.name for c in conn.introspection.get_table_description(cur, table)]
    if "quantity" not in cols:
        schema_editor.execute(
            "ALTER TABLE invoicing_invoiceline ADD COLUMN quantity integer NOT NULL DEFAULT 1"
        )
    if "unit_price" not in cols:
        schema_editor.execute(
            "ALTER TABLE invoicing_invoiceline ADD COLUMN unit_price numeric(12,2) NULL"
        )
    # History table (simple_history) may or may not exist yet; guard it.
    try:
        with conn.cursor() as cur:
            hcols = [
                c.name for c in conn.introspection.get_table_description(cur, htable)
            ]
        if "quantity" not in hcols:
            schema_editor.execute(
                "ALTER TABLE invoicing_historicalinvoiceline ADD COLUMN quantity integer NULL"
            )
        if "unit_price" not in hcols:
            schema_editor.execute(
                "ALTER TABLE invoicing_historicalinvoiceline ADD COLUMN unit_price numeric(12,2) NULL"
            )
    except Exception:
        pass


def remove_fields_if_present(apps, schema_editor):
    # Reversible safety: drop only if present (best effort, never critical).
    conn = schema_editor.connection
    for table in ("invoicing_invoiceline", "invoicing_historicalinvoiceline"):
        try:
            with conn.cursor() as cur:
                cols = [
                    c.name for c in conn.introspection.get_table_description(cur, table)
                ]
            if "unit_price" in cols:
                schema_editor.execute(
                    f"ALTER TABLE {table} DROP COLUMN IF EXISTS unit_price"
                )
            if "quantity" in cols:
                schema_editor.execute(
                    f"ALTER TABLE {table} DROP COLUMN IF EXISTS quantity"
                )
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ("invoicing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_fields_if_missing, remove_fields_if_present),
        migrations.AlterField(
            model_name="invoiceline",
            name="quantity",
            field=models.PositiveIntegerField(default=1, verbose_name="Quantité"),
        ),
        migrations.AlterField(
            model_name="invoiceline",
            name="unit_price",
            field=models.DecimalField(
                decimal_places=2, max_digits=12, null=True, blank=True,
                verbose_name="Prix unitaire",
            ),
        ),
    ]
