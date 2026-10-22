import os; os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from apps.invoicing.serializers import ProviderInvoiceCreateSerializer
import uuid

s = ProviderInvoiceCreateSerializer()
print(s.validate.__module__ + "." + s.validate.__qualname__)
