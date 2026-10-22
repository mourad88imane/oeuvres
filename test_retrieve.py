import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.invoicing.views import ProviderInvoiceViewSet
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
factory = APIRequestFactory()
view = ProviderInvoiceViewSet.as_view(actions={"get": "retrieve"})

# First get a list of invoices
list_view = ProviderInvoiceViewSet.as_view(actions={"get": "list"})
req = factory.get("/api/v1/invoicing/invoices/")
force_authenticate(req, user=admin)
resp = list_view(req)
results = resp.data.get("results", [])
print(f"Total invoices: {len(results)}")
for inv in results:
    print(f"  id={inv.get('id')} ref={inv.get('reference')} status={inv.get('status')}")
    print(f"    partner={inv.get('partner_name')} category={inv.get('category')}")
    print(f"    coverage_lines={inv.get('coverage_lines', [])}")
    print(f"    lines={inv.get('lines', [])}")
    print()
