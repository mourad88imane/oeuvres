import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from apps.medical_coverage.models import MedicalCoverageRequest
from django.db.models import Count

# Show distinct partner_ids per category
data = MedicalCoverageRequest.objects.filter(workflow_state="validated").values("category", "partner_id").annotate(cnt=Count("id")).order_by("category", "partner_id")
for d in data:
    print(d["category"], d["partner_id"], d["cnt"])
