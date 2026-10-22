# Deployed 2026-09-16 — manual merge migration.
# The production server already had 0010_rename_approval_history_gfk_idx...
# (index rename applied on 2026-07-14) while the local chain added
# 0011_seed_roadmap_permissions (RBAC seed, depends on 0009).
# This empty merge joins both leaves, exactly as
# `makemigrations --merge` would, without introspecting models.
# 0011 (seeding) will execute for the first time during this deployment;
# it is idempotent (update_or_create), so no risk on replay.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("administration", "0010_rename_approval_history_gfk_idx_administrat_content_85b389_idx"),
        ("administration", "0011_seed_roadmap_permissions"),
    ]

    operations = []
