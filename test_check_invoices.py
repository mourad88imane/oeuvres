import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from apps.invoicing.models import ProviderInvoice

for inv in ProviderInvoice.objects.all():
    print(f"id={inv.id} ref={inv.reference} partner={inv.partner_id} month={inv.month} year={inv.year} status={inv.status}")
