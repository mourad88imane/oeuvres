import os, sys
sys.path.insert(0, "/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
import django; django.setup()
from apps.medical_coverage.serializers import MedicalCoverageRequestUpdateSerializer
print("SERIALIZERS_OK")
from apps.medical_coverage.views import MedicalCoverageRequestViewSet
print("VIEWS_OK")
from apps.medical_coverage.services import MedicalCoverageRequestService
svc = MedicalCoverageRequestService()
s = svc.get_statistics()
print("STATS_FIELDS:", list(s.keys()))
print("ALL_OK")
