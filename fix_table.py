import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.db import connection, transaction

TABLE = "invoicing_invoicecoveragerequestline"
with connection.cursor() as c:
    c.execute(f"""
        ALTER TABLE {TABLE}
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS created_by_id UUID NULL,
        ADD COLUMN IF NOT EXISTS updated_by_id UUID NULL;
    """)
    c.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE}_is_deleted ON {TABLE}(is_deleted);")
    transaction.commit()
    print(f"Table {TABLE}: base columns added")
