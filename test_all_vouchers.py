import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from apps.medical_coverage.models import MedicalCoverageRequest

requests = MedicalCoverageRequest.objects.filter(workflow_state="validated")
print(f"Total validated: {requests.count()}")
for r in requests:
    print(f"  {r.request_number} category={r.category} partner={r.partner_id} date={r.coverage_date}")
