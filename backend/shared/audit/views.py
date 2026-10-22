from datetime import timedelta

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from core.permissions import HasModuleAccess
from rest_framework.response import Response

from django.db.models import Count
from django.utils import timezone

from .models import AuditLog
from .serializers import ValidationTraceSerializer
from .validation import ValidationTrace


class AuditViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]

    @action(detail=False, methods=["get"])
    def logs(self, request):
        days = int(request.query_params.get("days", 30))
        limit = int(request.query_params.get("limit", 100))
        action_filter = request.query_params.get("action")
        severity = request.query_params.get("severity")
        user = request.query_params.get("user")

        since = timezone.now() - timedelta(days=days)
        qs = AuditLog.objects.filter(timestamp__gte=since)

        if action_filter:
            qs = qs.filter(action=action_filter)
        if severity:
            qs = qs.filter(severity=severity)
        if user:
            qs = qs.filter(user_email__icontains=user)

        qs = qs.order_by("-timestamp")[:limit]

        data = []
        for log in qs:
            data.append(
                {
                    "id": str(log.id),
                    "action": log.action,
                    "action_display": log.get_action_display(),
                    "severity": log.severity,
                    "severity_display": log.get_severity_display(),
                    "user_email": log.user_email,
                    "user_role": log.user_role,
                    "content_type_name": log.content_type_name,
                    "object_id": log.object_id,
                    "object_repr": log.object_repr,
                    "changed_fields": log.changed_fields,
                    "ip_address": log.ip_address,
                    "endpoint": log.endpoint,
                    "request_id": log.request_id,
                    "timestamp": log.timestamp.isoformat(),
                }
            )
        return Response({"status": "success", "data": data})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)
        qs = AuditLog.objects.filter(timestamp__gte=since)

        by_action = list(qs.values("action").annotate(count=Count("id")).order_by("-count"))
        by_severity = list(qs.values("severity").annotate(count=Count("id")).order_by("severity"))
        top_users = list(
            qs.values("user_email").annotate(count=Count("id")).order_by("-count")[:10]
        )

        return Response(
            {
                "status": "success",
                "data": {
                    "total": qs.count(),
                    "by_action": by_action,
                    "by_severity": by_severity,
                    "top_users": top_users,
                },
            }
        )

    @action(detail=False, methods=["get"])
    def validations(self, request):
        days = int(request.query_params.get("days", 90))
        validation_type = request.query_params.get("validation_type")
        status_filter = request.query_params.get("status")

        since = timezone.now() - timedelta(days=days)
        qs = ValidationTrace.objects.filter(created_at__gte=since)

        if validation_type:
            qs = qs.filter(validation_type=validation_type)
        if status_filter:
            qs = qs.filter(status=status_filter)

        qs = qs.order_by("-created_at")[:100]
        serializer = ValidationTraceSerializer(qs, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=False, methods=["get"])
    def validation_stats(self, request):
        days = int(request.query_params.get("days", 90))
        since = timezone.now() - timedelta(days=days)
        qs = ValidationTrace.objects.filter(created_at__gte=since)

        by_type = list(qs.values("validation_type").annotate(count=Count("id")).order_by("-count"))
        by_status = list(qs.values("status").annotate(count=Count("id")).order_by("status"))
        top_validators = list(
            qs.values("validated_by_email").annotate(count=Count("id")).order_by("-count")[:10]
        )

        return Response(
            {
                "status": "success",
                "data": {
                    "total": qs.count(),
                    "by_type": by_type,
                    "by_status": by_status,
                    "top_validators": top_validators,
                },
            }
        )
