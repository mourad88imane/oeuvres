import logging
from datetime import timedelta

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from core.permissions import HasModuleAccess
from rest_framework.response import Response

from django.db import connections
from django.db.utils import OperationalError
from django.utils import timezone

from .models import BusinessMetric, SecurityEvent
from .serializers import (
    APIEndpointStatusSerializer,
    APIRequestLogSerializer,
    BusinessMetricSerializer,
    ResolveSecurityEventSerializer,
    SecurityEventSerializer,
)
from .services import monitoring_service

logger = logging.getLogger("apps.monitoring")


class MonitoringViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        hours = int(request.query_params.get("hours", 24))
        stats = monitoring_service.get_dashboard_stats(hours=hours)
        return Response({"status": "success", "data": stats})

    @action(detail=False, methods=["get"])
    def api_logs(self, request):
        is_error = request.query_params.get("is_error")
        if is_error is not None:
            is_error = is_error.lower() == "true"
        logs = monitoring_service.get_api_logs(
            limit=int(request.query_params.get("limit", 100)),
            is_error=is_error,
            method=request.query_params.get("method"),
            endpoint=request.query_params.get("endpoint"),
            days=int(request.query_params.get("days", 7)),
        )
        serializer = APIRequestLogSerializer(logs, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=False, methods=["get"])
    def security_events(self, request):
        events = monitoring_service.get_security_events(
            limit=int(request.query_params.get("limit", 50)),
            severity=request.query_params.get("severity"),
            resolved=request.query_params.get("resolved"),
        )
        serializer = SecurityEventSerializer(events, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        try:
            event = SecurityEvent.objects.get(pk=pk)
        except SecurityEvent.DoesNotExist:
            return Response(
                {"status": "error", "message": "Événement non trouvé"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ResolveSecurityEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event.resolved = True
        event.resolved_at = timezone.now()
        event.resolved_by = request.user
        event.resolution_note = serializer.validated_data.get("resolution_note", "")
        event.save(update_fields=["resolved", "resolved_at", "resolved_by", "resolution_note"])

        return Response({"status": "success", "data": {"id": str(event.pk), "resolved": True}})

    @action(detail=False, methods=["get"])
    def endpoint_status(self, request):
        statuses = monitoring_service.get_endpoint_statuses()
        serializer = APIEndpointStatusSerializer(statuses, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=False, methods=["get"])
    def audit_summary(self, request):
        days = int(request.query_params.get("days", 30))
        summary = monitoring_service.get_audit_summary(days=days)
        return Response({"status": "success", "data": summary})

    @action(detail=False, methods=["get"])
    def system_health(self, request):
        checks = {}
        db_ok = False
        try:
            conn = connections["default"]
            conn.ensure_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.execute("""
                    SELECT schemaname, COUNT(*) as tbl_count
                    FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')
                    GROUP BY schemaname
                """)
                table_info = list(cursor.fetchall())
                cursor.execute("SELECT pg_database_size(current_database())")
                db_size = cursor.fetchone()[0]
            db_ok = True
            checks["database"] = {
                "healthy": True,
                "table_count": sum(r[1] for r in table_info),
                "size_bytes": db_size,
                "size_mb": round(db_size / 1024 / 1024, 1),
            }
        except OperationalError as e:
            checks["database"] = {"healthy": False, "error": str(e)}

        try:
            from django.core.cache import cache
            cache.set("__health__", 1, timeout=5)
            checks["cache"] = {"healthy": cache.get("__health__") == 1}
        except Exception as e:
            checks["cache"] = {"healthy": False, "error": str(e)}

        try:
            from celery import current_app
            stats = current_app.control.inspect().stats()
            checks["celery"] = {
                "healthy": bool(stats),
                "workers": list(stats.keys()) if stats else [],
            }
        except Exception as e:
            checks["celery"] = {"healthy": False, "error": str(e)}

        try:
            checks["python"] = {
                "version": __import__("sys").version,
                "django_version": __import__("django").get_version(),
            }
        except Exception:
            pass

        all_healthy = all(c.get("healthy", False) for c in checks.values() if "healthy" in c)
        return Response({
            "status": "ok" if all_healthy else "degraded",
            "timestamp": timezone.now().isoformat(),
            "checks": checks,
        })

    @action(detail=False, methods=["get"])
    def metrics(self, request):
        metric_type = request.query_params.get("metric_type")
        hours = int(request.query_params.get("hours", 24))
        since = timezone.now() - timedelta(hours=hours)
        qs = BusinessMetric.objects.filter(timestamp__gte=since)
        if metric_type:
            qs = qs.filter(metric_type=metric_type)
        qs = qs.order_by("-timestamp")[:200]
        serializer = BusinessMetricSerializer(qs, many=True)
        return Response({"status": "success", "data": serializer.data})
