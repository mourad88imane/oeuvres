import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.invoicing.views import ProviderInvoiceViewSet
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
print(f"User: {admin}")

factory = APIRequestFactory()
view = ProviderInvoiceViewSet.as_view(actions={"get": "available_vouchers"})

request = factory.get("/api/v1/invoicing/invoices/available_vouchers/", {
    "partner_id": "38a58e9c-5f14-49bc-bd3a-63ff870ff9ac",
    "category": "medical_analysis_lab",
    "month": 7,
    "year": 2026,
    "period_start": "2026-07-01",
    "period_end": "2026-08-01",
})
force_authenticate(request, user=admin)
response = view(request)
print("Status:", response.data.get("status"))
print("Count:", response.data.get("count"))
for d in response.data.get("data", []):
    print(" ", d.get("request_number"), d.get("category"), d.get("coverage_date"))
