# Generated manually — add quantity and unit_price to InvoiceLine

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("invoicing", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="invoiceline",
            name="quantity",
            field=models.PositiveIntegerField(default=1, verbose_name="Quantité"),
        ),
        migrations.AddField(
            model_name="invoiceline",
            name="unit_price",
            field=models.DecimalField(
                blank=True, null=True, max_digits=12, decimal_places=2, verbose_name="Prix unitaire"
            ),
        ),
    ]
