import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()
from apps.invoicing.models import ProviderInvoice
inv = ProviderInvoice.objects.filter(notes__contains="Save with coverage lines").first()
if inv:
    print(f"Invoice: {inv.reference}")
    print(f"  Notes: {inv.notes}")
    print(f"  Coverage lines: {inv.coverage_lines.count()}")
    print(f"  Total amount: {inv.total_amount}")
    print(f"  Status: {inv.status}")
else:
    print("Not found")
