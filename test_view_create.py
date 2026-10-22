import os, json, uuid
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory
from apps.invoicing.views import ProviderInvoiceViewSet
from apps.invoicing.models import ProviderInvoice
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()

# Test the view's create method directly
from rest_framework.test import force_authenticate
from rest_framework import status

factory = APIRequestFactory()
data = {
    "partner": "698267ed-0262-4183-9165-76ae2545be50",
    "category": "medical_analysis_lab",
    "month": 7,
    "year": 2026,
    "period_start": "2026-07-01",
    "period_end": "2026-08-01",
    "coverage_request_lines": [
        {"coverage_request": "6bcd01ab-bfbe-4d00-a8ef-c7e891c5eb8c", "amount": "5000.00", "notes": "test"}
    ]
}
request = factory.post("/api/v1/invoicing/invoices/", data, format="json")
force_authenticate(request, user=admin)

view = ProviderInvoiceViewSet.as_view(actions={"post": "create"})
response = view(request)
print(f"Response status: {response.status_code}")
print(f"Response data: {json.dumps(response.data, indent=2, ensure_ascii=False, default=str)[:1000]}")

# Check the log output
print("\n--- Checking existing invoices ---")
inv = ProviderInvoice.objects.filter(
    partner_id="698267ed-0262-4183-9165-76ae2545be50",
    month=7, year=2026
).exclude(status="cancelled").first()
print(f"Existing: {inv}")
