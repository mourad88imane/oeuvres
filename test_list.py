import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.invoicing.views import ProviderInvoiceViewSet
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
factory = APIRequestFactory()
view = ProviderInvoiceViewSet.as_view(actions={"get": "list"})

req = factory.get("/api/v1/invoicing/invoices/")
force_authenticate(req, user=admin)
resp = view(req)
print("Status:", resp.status_code)
print("Data type:", type(resp.data))
if hasattr(resp, 'data'):
    if isinstance(resp.data, dict):
        print("Keys:", list(resp.data.keys())[:5])
        if 'status' in resp.data and resp.data['status'] == 'error':
            print("ERROR:", resp.data.get('message'))
            print("Details:", resp.data.get('errors'))
    elif isinstance(resp.data, list):
        print("Count:", len(resp.data))
        if resp.data:
            print("First:", list(resp.data[0].keys())[:10])
