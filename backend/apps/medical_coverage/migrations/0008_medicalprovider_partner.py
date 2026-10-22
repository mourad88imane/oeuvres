from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("conventions", "0005_convention_covered_services_and_more"),
        ("medical_coverage", "0007_alter_historicalmedicalcoveragevoucher_workflow_state_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="medicalprovider",
            name="partner",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="medical_provider",
                to="conventions.partner",
                verbose_name="Prestataire conventionné",
                help_text="Lien vers la fiche partenaire dans le module conventions",
            ),
        ),
        migrations.AddField(
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
