import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()
from apps.invoicing.models import ProviderInvoice
for inv in ProviderInvoice.objects.filter(status="draft"):
    print(f"{inv.id} | {inv.reference} | notes={inv.notes!r} | lines={inv.coverage_lines.count()} | total={inv.total_amount}")
