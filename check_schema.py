import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.db import connection

lines_table = "invoicing_invoiceline"
with connection.cursor() as c:
    c.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = %s", [lines_table])
    cols = c.fetchall()
    print(f"Columns in {lines_table}:")
    for col in cols:
        print(f"  {col[0]:30s} {col[1]:20s} {col[2]}")
