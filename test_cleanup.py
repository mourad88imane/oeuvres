import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from apps.invoicing.models import InvoiceCoverageRequestLine

# Force delete using the database directly to bypass soft delete
from django.db import connection
with connection.cursor() as c:
    c.execute("DELETE FROM invoicing_invoicecoveragerequestline WHERE invoice_id = %s", ["8d6beaaa-2882-4f36-bd07-2712e0d54f63"])
    print(f"Deleted {c.rowcount} records from coverage request lines")
