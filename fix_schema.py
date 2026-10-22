import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.db import connection, transaction

TABLE = "invoicing_invoiceline"
with connection.cursor() as c:
    c.execute(f"""
        ALTER TABLE {TABLE}
        ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NULL;
    """)
    transaction.commit()
    print(f"Table {TABLE}: quantity, unit_price added")
