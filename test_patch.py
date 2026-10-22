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
if not inv:
    print("No draft invoice found")
    exit()

print(f"Invoice: {inv.id} ref={inv.reference}")
old_notes = inv.notes
print(f"Old notes: {old_notes!r}")

factory = APIRequestFactory()
new_notes = f"Updated by test at {datetime.datetime.now().isoformat()}"
data = {"notes": new_notes}
request = factory.patch(f"/api/v1/invoicing/invoices/{inv.id}/", data, format="json")
force_authenticate(request, user=admin)
view = ProviderInvoiceViewSet.as_view({"patch": "partial_update"})
response = view(request, pk=str(inv.id))
print(f"Status: {response.status_code}")

if response.status_code != 200:
    print(f"Error response data: {response.data}")
    # Check if response has .data or .content
    if hasattr(response, 'content'):
        print(f"Content: {response.content[:500]}")
else:
    inv.refresh_from_db()
    print(f"New notes: {inv.notes!r}")
    if inv.notes == new_notes:
        print("PASS: notes updated successfully")
    else:
        print(f"FAIL: notes={inv.notes!r} expected={new_notes!r}")

# Test 2: PATCH with coverage_request_lines
print("\n--- Test 2: PATCH with coverage lines ---")
lines_data = {"notes": "Updated coverage lines", "coverage_request_lines": []}
request2 = factory.patch(f"/api/v1/invoicing/invoices/{inv.id}/", lines_data, format="json")
force_authenticate(request2, user=admin)
response2 = view(request2, pk=str(inv.id))
print(f"Status: {response2.status_code}")
if response2.status_code != 200:
    print(f"Error: {response2.data}")
else:
    print("PASS: PATCH with empty coverage lines works")
    inv.refresh_from_db()
    print(f"Notes: {inv.notes}")
    print(f"Coverage lines count: {inv.coverage_lines.count()}")
