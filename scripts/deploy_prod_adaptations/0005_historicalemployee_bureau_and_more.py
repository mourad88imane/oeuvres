# Reconstructed 2026-09-16 — restored verbatim from the production server
# (10.10.10.244), where it was generated and applied on 2026-07-14.
# The local chain (0005_make_date_hired_nullable / 0006_make_department_nullable /
# 0007_add_history_fk_fields) covers the same schema state; this file keeps the
# already-applied production migration loadable so the graph stays consistent.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0003_alter_department_managers_department_tenant_and_more'),
        ('employees', '0004_employee_bureau_function_grade_ref'),
        ('organization', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='historicalemployee',
            name='bureau',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='organization.bureau', verbose_name='Bureau'),
        ),
        migrations.AddField(
            model_name='historicalemployee',
            name='function',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='organization.function', verbose_name='Fonction'),
        ),
        migrations.AddField(
            model_name='historicalemployee',
            name='grade_ref',
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='+', to='organization.grade', verbose_name='Grade (référentiel)'),
        ),
        migrations.AlterField(
            model_name='employee',
            name='date_hired',
            field=models.DateField(blank=True, null=True, verbose_name="Date d'embauche"),
        ),
        migrations.AlterField(
            model_name='employee',
            name='department',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='employees', to='departments.department', verbose_name='Département'),
        ),
        migrations.AlterField(
            model_name='employee',
            name='job_title',
            field=models.CharField(blank=True, default='', max_length=150, verbose_name='Intitulé du poste'),
        ),
        migrations.AlterField(
            model_name='historicalemployee',
            name='date_hired',
            field=models.DateField(blank=True, null=True, verbose_name="Date d'embauche"),
        ),
        migrations.AlterField(
            model_name='historicalemployee',
            name='job_title',
            field=models.CharField(blank=True, default='', max_length=150, verbose_name='Intitulé du poste'),
        ),
    ]
