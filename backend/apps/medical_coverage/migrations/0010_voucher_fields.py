from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical_coverage", "0009_alter_historicalmedicalprovider_partner"),
    ]

    operations = [
        migrations.AddField(
            model_name="medicalcoveragerequest",
            name="consumption_status",
            field=models.CharField(
                choices=[("not_consumed", "Non consomm\u00e9"), ("consumed", "Consomm\u00e9")],
                default="not_consumed", max_length=20, verbose_name="Statut de consommation",
            ),
        ),
        migrations.AddField(
            model_name="medicalcoveragerequest",
            name="consumed_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Date de consommation"),
        ),
        migrations.AddField(
            model_name="medicalcoveragerequest",
            name="invoice_status",
            field=models.CharField(
                choices=[
                    ("not_invoiced", "Non factur\u00e9"), ("invoiced", "Factur\u00e9"),
                    ("paid", "Pay\u00e9"),
                ],
                default="not_invoiced", max_length=20, verbose_name="Statut de facturation",
            ),
        ),
        migrations.AddField(
            model_name="medicalcoveragerequest",
            name="voucher_number",
            field=models.CharField(
                blank=True, max_length=50, null=True, unique=True, verbose_name="Num\u00e9ro du bon",
            ),
        ),
        migrations.AddField(
            model_name="historicalmedicalcoveragerequest",
            name="consumption_status",
            field=models.CharField(
                choices=[("not_consumed", "Non consomm\u00e9"), ("consumed", "Consomm\u00e9")],
                default="not_consumed", max_length=20, verbose_name="Statut de consommation",
            ),
        ),
        migrations.AddField(
            model_name="historicalmedicalcoveragerequest",
            name="consumed_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Date de consommation"),
        ),
        migrations.AddField(
            model_name="historicalmedicalcoveragerequest",
            name="invoice_status",
            field=models.CharField(
                choices=[
                    ("not_invoiced", "Non factur\u00e9"), ("invoiced", "Factur\u00e9"),
                    ("paid", "Pay\u00e9"),
                ],
                default="not_invoiced", max_length=20, verbose_name="Statut de facturation",
            ),
        ),
        migrations.AddField(
            model_name="historicalmedicalcoveragerequest",
            name="voucher_number",
            field=models.CharField(
                blank=True, max_length=50, null=True, verbose_name="Num\u00e9ro du bon",
            ),
        ),
    ]
