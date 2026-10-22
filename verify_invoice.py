import sys; sys.path.insert(0,"/app")
import django; django.setup()
from core.permissions import HasAnyModuleAccess
print("IMPORT_OK", HasAnyModuleAccess)
from apps.invoicing.views import ProviderInvoiceViewSet
pc = ProviderInvoiceViewSet.permission_classes
print("VIEWS_OK", pc)
assert len(pc) == 1, f"Expected 1 permission class, got {len(pc)}"
name = pc[0].__name__
assert "Any" in name, f"Expected HasAnyModuleAccess, got {name}"
print("ASSERT_OK")
