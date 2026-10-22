import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.invoicing.views import ProviderInvoiceViewSet
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
factory = APIRequestFactory()
view = ProviderInvoiceViewSet.as_view(actions={"get": "available_vouchers"})

tests = [
    ("analysis partner1", {"partner_id": "38a58e9c-5f14-49bc-bd3a-63ff870ff9ac", "category": "medical_analysis_lab"}),
    ("analysis partner2", {"partner_id": "698267ed-0262-4183-9165-76ae2545be50", "category": "medical_analysis_lab"}),
    ("center", {"partner_id": "2ae8106b-ea78-40a3-ae2c-e11f84f379d4", "category": "medical_center"}),
]

for label, params in tests:
    p = {**params, "month": 7, "year": 2026, "period_start": "2026-07-01", "period_end": "2026-08-01"}
    req = factory.get("/api/v1/invoicing/invoices/available_vouchers/", p)
    force_authenticate(req, user=admin)
    resp = view(req)
    c = resp.data.get("count", 0)
    print(f"{label}: count={c}")
    for d in resp.data.get("data", []):
        print(f"  {d.get('request_number')} {d.get('coverage_date')}")
