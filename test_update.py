import os, json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.invoicing.views import ProviderInvoiceViewSet
from apps.invoicing.models import InvoiceCoverageRequestLine
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
factory = APIRequestFactory()

# Clean up any existing test data
InvoiceCoverageRequestLine.objects.filter(invoice_id="8d6beaaa-2882-4f36-bd07-2712e0d54f63").delete()

update_view = ProviderInvoiceViewSet.as_view(actions={"patch": "partial_update"})

coverage_id = "6bcd01ab-bfbe-4d00-a8ef-c7e891c5eb8c"  # PEC-2026-000002
body = {
    "coverage_request_lines": [
        {"coverage_request": coverage_id, "amount": "15000.00", "notes": "Test update"}
    ]
}
req = factory.patch("/api/v1/invoicing/invoices/8d6beaaa-2882-4f36-bd07-2712e0d54f63/", json.dumps(body), content_type="application/json")
force_authenticate(req, user=admin)
resp = update_view(req, pk="8d6beaaa-2882-4f36-bd07-2712e0d54f63")
print("PATCH Status:", resp.status_code)
if resp.status_code == 200:
    d = resp.data.get("data", {})
    print("coverage_lines count:", len(d.get("coverage_lines", [])))
    print("Status:", d.get("status"))
    print("Total amount:", d.get("total_amount"))
else:
    print("Error:", resp.data)
