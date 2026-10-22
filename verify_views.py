import os, sys
sys.path.insert(0, "/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
import django; django.setup()
from apps.organization.views import OrganizationLookupViewSet
pc = OrganizationLookupViewSet.permission_classes
names = [c.__name__ if hasattr(c, '__name__') else c.__class__.__name__ for c in pc]
print("OrganizationLookupViewSet:", names)
assert "HasModuleAccess" in str(names), f"Missing HasModuleAccess in {names}"

from apps.medical_coverage.views import MedicalCoverageTypeViewSet, MedicalProviderViewSet, MedicalCoverageVoucherViewSet, MedicalCoverageRequestViewSet
for name, vs in [("Type", MedicalCoverageTypeViewSet), ("Provider", MedicalProviderViewSet), ("Voucher", MedicalCoverageVoucherViewSet), ("Request", MedicalCoverageRequestViewSet)]:
    pc_names = [c.__name__ if hasattr(c, '__name__') else c.__class__.__name__ for c in vs.permission_classes]
    print(f"  MedicalCoverage{name}: {pc_names}")
    assert "IsAuthenticated" in str(pc_names), f"Missing IsAuthenticated in MedicalCoverage{name}"
print("ALL CHECKS PASSED")
