from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("medical_coverage", "0008_medicalprovider_partner"),
    ]

    operations = [
        migrations.AlterField(
            model_name="historicalmedicalprovider",
            name="partner",
            field=models.ForeignKey(
                blank=True,
                db_constraint=False,
                null=True,
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="+",
                to="conventions.partner",
                verbose_name="Prestataire conventionné",
            ),
        ),
    ]
