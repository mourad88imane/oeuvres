from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination
from core.permissions import IsAdminOrGestionnaire, IsAdminOrReadOnly
from shared.tenant.mixins import TenantViewSetMixin
from django.utils import timezone

from .models import Convention, ConventionDocument
from .serializers import (
    ConventionAlertSerializer,
    ConventionCreateSerializer,
    ConventionDocumentSerializer,
    ConventionDocumentUploadSerializer,
    ConventionListSerializer,
    ConventionRenewSerializer,
    ConventionSerializer,
    PartnerCreateSerializer,
    PartnerListSerializer,
    PartnerSerializer,
)
from .services import (
    ConventionAlertService,
    ConventionService,
    ConventionValidationError,
    PartnerService,
)

partner_service = PartnerService()
convention_service = ConventionService()
alert_service = ConventionAlertService()


class PartnerViewSet(viewsets.ModelViewSet):
    queryset = partner_service.get_queryset()
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsAdminOrGestionnaire]

    def get_serializer_class(self):
        if self.action == "list":
            return PartnerListSerializer
        elif self.action == "create":
            return PartnerCreateSerializer
        return PartnerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return partner_service.search(
            qs,
            search=self.request.query_params.get("search", ""),
            type=self.request.query_params.get("type", ""),
            category=self.request.query_params.get("category", ""),
            is_active=self.request.query_params.get("is_active", ""),
            wilaya=self.request.query_params.get("wilaya", ""),
            has_active_convention=self.request.query_params.get("has_active_convention", ""),
        )

    def perform_create(self, serializer):
        instance = partner_service.create(
            serializer.validated_data,
            user=self.request.user,
            request=self.request,
        )
        return instance

    def perform_update(self, serializer):
        partner_service.update(
            self.get_object(),
            serializer.validated_data,
            user=self.request.user,
            request=self.request,
        )

    @action(detail=True, methods=["get"])
    def has_active_convention(self, request, pk=None):
        partner = self.get_object()
        from .models import Convention
        active = partner.conventions.filter(status=Convention.Status.ACTIVE).exists()
        return Response({"has_active_convention": active})


class ConventionViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = convention_service.get_queryset()
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsAdminOrGestionnaire]

    def get_serializer_class(self):
        if self.action == "list":
            return ConventionListSerializer
        elif self.action == "create":
            return ConventionCreateSerializer
        return ConventionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return convention_service.search(
            qs,
            search=self.request.query_params.get("search", ""),
            status=self.request.query_params.get("status", ""),
            partner_id=self.request.query_params.get("partner_id", ""),
            date_from=self.request.query_params.get("date_from", ""),
            date_to=self.request.query_params.get("date_to", ""),
            expiring_soon=self.request.query_params.get("expiring_soon", "") == "true",
            expired=self.request.query_params.get("expired", "") == "true",
            ordering=self.request.query_params.get("ordering", "-start_date"),
        )

    def perform_create(self, serializer):
        return convention_service.create(
            serializer.validated_data,
            user=self.request.user,
            request=self.request,
        )

    def perform_update(self, serializer):
        convention_service.update(
            self.get_object(),
            serializer.validated_data,
            user=self.request.user,
            request=self.request,
        )

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        convention = self.get_object()
        serializer = ConventionRenewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            new_conv = convention_service.renew(
                convention,
                new_end_date=serializer.validated_data["new_end_date"],
                new_amount=serializer.validated_data.get("new_amount"),
                notes=serializer.validated_data.get("notes", ""),
                user=request.user,
                request=request,
            )
        except ConventionValidationError as e:
            return Response(
                {"detail": e.message, "code": e.code}, status=status.HTTP_400_BAD_REQUEST
            )
        out = ConventionSerializer(new_conv, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def terminate(self, request, pk=None):
        convention = self.get_object()
        terminated_date = request.data.get("terminated_date")
        reason = request.data.get("reason", "")
        try:
            convention_service.terminate(
                convention,
                terminated_date=terminated_date,
                reason=reason,
                user=request.user,
                request=request,
            )
        except ConventionValidationError as e:
            return Response(
                {"detail": e.message, "code": e.code}, status=status.HTTP_400_BAD_REQUEST
            )
        out = ConventionSerializer(convention, context={"request": request})
        return Response(out.data)

    @action(detail=True, methods=["post"])
    def mark_expired(self, request, pk=None):
        convention = self.get_object()
        if convention.status in (Convention.Status.EXPIRED, Convention.Status.TERMINATED):
            return Response(
                {"detail": "Déjà expirée ou résiliée."}, status=status.HTTP_400_BAD_REQUEST
            )
        convention.status = Convention.Status.EXPIRED
        convention.save(update_fields=["status", "updated_at"])
        return Response({"detail": f"Convention {convention.reference} marquée comme expirée."})

    @action(detail=True, methods=["post"])
    def upload_document(self, request, pk=None):
        convention = self.get_object()
        serializer = ConventionDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file = serializer.validated_data["file"]
        doc = ConventionDocument.objects.create(
            convention=convention,
            doc_type=serializer.validated_data["doc_type"],
            file=file,
            original_name=file.name,
            description=serializer.validated_data.get("description", ""),
            file_size=file.size,
            mime_type=file.content_type or "",
        )
        out = ConventionDocumentSerializer(doc, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        qs = self.get_queryset()
        today = timezone.localdate()
        total = qs.count()
        active = qs.filter(status=Convention.Status.ACTIVE).count()
        expiring_soon = qs.filter(
            end_date__lte=today + timezone.timedelta(days=30),
            end_date__gte=today,
        ).count()
        expired = qs.filter(end_date__lt=today).count()
        draft = qs.filter(status=Convention.Status.DRAFT).count()
        terminated = qs.filter(status=Convention.Status.TERMINATED).count()
        return Response(
            {
                "total": total,
                "active": active,
                "expiring_soon": expiring_soon,
                "expired": expired,
                "draft": draft,
                "terminated": terminated,
            }
        )


class ConventionDocumentViewSet(viewsets.ModelViewSet):
    queryset = ConventionDocument.objects.filter(is_deleted=False)
    serializer_class = ConventionDocumentSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        convention_id = self.request.query_params.get("convention_id")
        if convention_id:
            qs = qs.filter(convention_id=convention_id)
        doc_type = self.request.query_params.get("doc_type")
        if doc_type:
            qs = qs.filter(doc_type=doc_type)
        return qs


class ConventionAlertViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = alert_service.get_queryset()
    serializer_class = ConventionAlertSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsAdminOrGestionnaire]

    def get_queryset(self):
        qs = super().get_queryset()
        convention_id = self.request.query_params.get("convention_id")
        if convention_id:
            qs = qs.filter(convention_id=convention_id)
        alert_type = self.request.query_params.get("alert_type")
        if alert_type:
            qs = qs.filter(alert_type=alert_type)
        severity = self.request.query_params.get("severity")
        if severity:
            qs = qs.filter(severity=severity)
        unresolved = self.request.query_params.get("unresolved")
        if unresolved:
            qs = qs.filter(is_resolved=False)
        return qs

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert_service.resolve(alert, user=request.user)
        return Response({"detail": "Alerte résolue."})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        alert_service.mark_all_read()
        return Response({"detail": "Toutes les alertes marquées comme lues."})
