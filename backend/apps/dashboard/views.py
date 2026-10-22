from rest_framework import views
from rest_framework.permissions import IsAuthenticated

from core.permissions import HasModuleAccess
from rest_framework.response import Response

from apps.reporting.services import aggregation_service
from django.utils import timezone


class GlobalDashboardView(views.APIView):
    permission_classes = [HasModuleAccess("dashboard")]

    def get(self, request):
        months = int(request.query_params.get("months", 12))
        stats = aggregation_service.get_global_stats(user=request.user)
        trends = aggregation_service.get_monthly_trends(months=months)
        kpis = aggregation_service.get_all_kpis()
        top = aggregation_service.get_top_stats(limit=5)
        today = timezone.localdate()

        return Response(
            {
                "status": "success",
                "data": {
                    "kpis": kpis,
                    "summary": stats,
                    "trends": trends,
                    "top": top,
                    "date": today.isoformat(),
                },
            }
        )
