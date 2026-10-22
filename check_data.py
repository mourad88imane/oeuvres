import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from apps.medical_coverage.models import MedicalCoverageRequest

qs = MedicalCoverageRequest.objects.filter(workflow_state="validated")
print("Total validated:", qs.count())
for r in qs[:10]:
    print(r.request_number, r.category, r.partner_id, r.coverage_date)
