import os, django, json, datetime
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from apps.invoicing.views import ProviderInvoiceViewSet
from apps.invoicing.models import ProviderInvoice

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
inv = ProviderInvoice.objects.filter(status="draft").first()
print(f"Invoice: {inv.id} ref={inv.reference}")

factory = APIRequestFactory()
view = ProviderInvoiceViewSet.as_view({"patch": "partial_update"})

# Test with just notes
data1 = {"notes": "Debug test at " + datetime.datetime.now().isoformat()}
req1 = factory.patch(f"/api/v1/invoicing/invoices/{inv.id}/", data1, format="json")
force_authenticate(req1, user=admin)
resp1 = view(req1, pk=str(inv.id))
print(f"Test 1 (notes only): status={resp1.status_code}")
if hasattr(resp1, 'data'):
    print(f"  response keys: {list(resp1.data.keys()) if isinstance(resp1.data, dict) else type(resp1.data)}")

# Test with empty coverage_request_lines
inv.refresh_from_db()
print(f"\nCoverage lines before: {inv.coverage_lines.count()}")
data2 = {"notes": "Test with empty coverage lines", "coverage_request_lines": []}
req2 = factory.patch(f"/api/v1/invoicing/invoices/{inv.id}/", data2, format="json")
force_authenticate(req2, user=admin)
try:
    resp2 = view(req2, pk=str(inv.id))
    print(f"Test 2 (empty coverage): status={resp2.status_code}")
except Exception as e:
    print(f"Test 2 ERROR: {e}")
import traceback
try:
    resp2 = view(req2, pk=str(inv.id))
except Exception as e:
    traceback.print_exc()
