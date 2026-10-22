import os, django, json, datetime
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from apps.invoicing.views import ProviderInvoiceViewSet
from apps.invoicing.models import ProviderInvoice, InvoiceCoverageRequestLine

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
inv = ProviderInvoice.objects.filter(status="draft").first()
print(f"Invoice: {inv.id} ref={inv.reference}")
print(f"Coverage lines before: {inv.coverage_lines.count()}")

factory = APIRequestFactory()
view = ProviderInvoiceViewSet.as_view({"patch": "partial_update"})

# Build a new invoice data payload (like frontend does)
data = {
    "notes": "Save with coverage lines",
    "coverage_request_lines": [
        {
            "coverage_request": str(cl.coverage_request_id),
            "amount": float(cl.amount),
            "notes": cl.notes or ""
        }
        for cl in inv.coverage_lines.all()
    ]
}
print(f"Payload coverage lines: {len(data['coverage_request_lines'])}")

req = factory.patch(f"/api/v1/invoicing/invoices/{inv.id}/", data, format="json")
force_authenticate(req, user=admin)
resp = view(req, pk=str(inv.id))
print(f"Status: {resp.status_code}")
if resp.status_code != 200:
    print(f"ERROR: {resp.data}")
    import traceback
    traceback.print_exc()
else:
    print(f"PASS: response has keys: {list(resp.data.keys())}")
    inv.refresh_from_db()
    print(f"Notes: {inv.notes}")
    print(f"Coverage lines after: {inv.coverage_lines.count()}")

# Test adding a NEW coverage line
from apps.medical_coverage.models import MedicalCoverageRequest
import random
other_cr = MedicalCoverageRequest.objects.filter(
    workflow_state="validated"
).exclude(
    id__in=inv.coverage_lines.values_list("coverage_request_id", flat=True)
).first()
if other_cr:
    new_data = {
        "notes": "Added a new line",
        "coverage_request_lines": [
            {
                "coverage_request": str(cl.coverage_request_id),
                "amount": float(cl.amount),
                "notes": cl.notes or ""
            }
            for cl in inv.coverage_lines.all()
        ] + [
            {
                "coverage_request": str(other_cr.id),
                "amount": 500.00,
                "notes": "New line via test"
            }
        ]
    }
    req2 = factory.patch(f"/api/v1/invoicing/invoices/{inv.id}/", new_data, format="json")
    force_authenticate(req2, user=admin)
    resp2 = view(req2, pk=str(inv.id))
    print(f"\nTest add line: status={resp2.status_code}")
    if resp2.status_code == 200:
        inv.refresh_from_db()
        print(f"Coverage lines count after add: {inv.coverage_lines.count()}")
        print("PASS")
    else:
        print(f"FAIL: {resp2.data}")
