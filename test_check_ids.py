import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from apps.medical_coverage.models import MedicalCoverageRequest

requests = MedicalCoverageRequest.objects.filter(workflow_state="validated")[:10]
for r in requests:
    print(f"id={r.id} num={r.request_number} emp={r.employee}")
