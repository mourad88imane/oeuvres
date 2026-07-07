from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("medical_coverage", "0005_historicalmedicalcoveragerequest_tenant_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="medicalcoveragerequest",
            name="printed_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="Date d'impression"
            ),
        ),
        migrations.AddField(
            model_name="medicalcoveragerequest",
            name="print_count",
            field=models.PositiveIntegerField(
                default=0, verbose_name="Nombre d'impressions"
            ),
        ),
        migrations.AddField(
            model_name="historicalmedicalcoveragerequest",
            name="printed_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="Date d'impression"
            ),
        ),
        migrations.AddField(
            model_name="historicalmedicalcoveragerequest",
            name="print_count",
            field=models.PositiveIntegerField(
                default=0, verbose_name="Nombre d'impressions"
            ),
        ),
    ]
