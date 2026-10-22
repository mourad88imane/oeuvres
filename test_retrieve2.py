import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.invoicing.views import ProviderInvoiceViewSet
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
factory = APIRequestFactory()

detail_view = ProviderInvoiceViewSet.as_view(actions={"get": "retrieve"})
req = factory.get("/api/v1/invoicing/invoices/8d6beaaa-2882-4f36-bd07-2712e0d54f63/")
force_authenticate(req, user=admin)
resp = detail_view(req, pk="8d6beaaa-2882-4f36-bd07-2712e0d54f63")
print("Status:", resp.status_code)
d = resp.data.get("data", {})
print("Keys:", list(d.keys()))
print("Has coverage_lines:", "coverage_lines" in d)
print("Has lines:", "lines" in d)
print("partner:", d.get("partner_name"))
print("coverage_lines count:", len(d.get("coverage_lines", [])))
print("lines count:", len(d.get("lines", [])))
