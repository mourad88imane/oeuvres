import os, json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.invoicing.views import ProviderInvoiceViewSet
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
factory = APIRequestFactory()
create_view = ProviderInvoiceViewSet.as_view(actions={"post": "create"})

# Simulate creating for yougourta partner with no analysis bons
body = {
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
req = factory.post("/api/v1/invoicing/invoices/", json.dumps(body), content_type="application/json")
force_authenticate(req, user=admin)
resp = create_view(req)
print("Status:", resp.status_code)
print("Response:", json.dumps(resp.data, indent=2, default=str)[:500] if hasattr(resp, 'data') else "no data")
