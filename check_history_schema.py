import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.db import connection

with connection.cursor() as c:
    c.execute("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%historical%' LIMIT 5")
    tables = c.fetchall()
    print("Historical tables found:")
    for t in tables:
        print(f"  {t[0]}")

    if tables:
        tname = tables[0][0]
        c.execute(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", [tname])
        cols = c.fetchall()
        print(f"\nColumns of {tname}:")
        for col in cols:
            print(f"  {col[0]:35s} {col[1]:20s} {col[2]}")
