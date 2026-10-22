import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.db import connection, transaction

HIST_TABLE = "invoicing_historicalinvoicecoveragerequestline"
MAIN_TABLE = "invoicing_invoicecoveragerequestline"

with connection.cursor() as c:
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS {HIST_TABLE} (
            LIKE {MAIN_TABLE} INCLUDING DEFAULTS EXCLUDING CONSTRAINTS EXCLUDING INDEXES,
            history_id SERIAL PRIMARY KEY,
            history_date TIMESTAMPTZ NOT NULL,
            history_change_reason TEXT,
            history_type VARCHAR(1) NOT NULL,
            history_user_id UUID REFERENCES users_user(id) DEFERRABLE INITIALLY DEFERRED
        );
    """)
    c.execute(f"CREATE INDEX IF NOT EXISTS idx_{HIST_TABLE}_history_date ON {HIST_TABLE}(history_date);")
    transaction.commit()
    print(f"Table {HIST_TABLE} created")
