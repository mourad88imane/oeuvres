# Deployed 2026-09-16 — reconciliation migration.
# On the production server (10.10.10.244), the equivalent changes
# (historicalemployee bureau/function/grade_ref + date_hired/department/job_title
# nullability) were already applied by 0005_historicalemployee_bureau_and_more
# (generated on the server on 2026-07-14).
# The local chain 0005_make_date_hired_nullable / 0006_make_department_nullable /
# 0007_add_history_fk_fields was therefore NOT shipped to prod; this empty
# migration keeps the migration graph consistent so that migrate is a no-op
# and any future employees migrations chain from here.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0005_historicalemployee_bureau_and_more"),
    ]

    operations = []
