import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.db import connection, transaction

TABLE = "invoicing_invoicecoveragerequestline"
with connection.cursor() as c:
    c.execute(f"""
        ALTER TABLE {TABLE}
        ADD COLUMN IF NOT EXISTS deleted_by_id UUID NULL,
        ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;
    """)
    transaction.commit()
    print(f"Table {TABLE}: deleted_by_id, tenant_id added")
