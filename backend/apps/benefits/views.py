"""Benefits views — API REST complète."""

import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.pagination import StandardResultsSetPagination
from core.permissions import HasModuleAccess
from shared.workflow.engine import WorkflowError

from .models import BenefitType
from .serializers import (
    AttachmentUploadSerializer,
    BenefitCreateSerializer,
    BenefitDetailSerializer,
    BenefitListSerializer,
    BenefitTypeListSerializer,
    BenefitTypeSerializer,
    BenefitUpdateSerializer,
    CommentCreateSerializer,
    TransitionSerializer,
    WorkflowLogSerializer,
)
from .services import BenefitService

logger = logging.getLogger("apps.benefits")
service = BenefitService()


# ═══════════════════════════════════════════════════════════
# BENEFIT TYPE VIEWSET
# ═══════════════════════════════════════════════════════════
class BenefitTypeViewSet(ModelViewSet):
    queryset = BenefitType.objects.filter(is_deleted=False)

    def get_serializer_class(self):
        if self.action == "list":
            return BenefitTypeListSerializer
        return BenefitTypeSerializer

    def get_permissions(self):
        return [IsAuthenticated(), HasModuleAccess("benefits")()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active_only"):
            qs = qs.filter(is_active=True)
        if cat := self.request.query_params.get("category"):
            qs = qs.filter(category=cat)
        return qs.order_by("category", "name")


# ═══════════════════════════════════════════════════════════
# BENEFIT VIEWSET
# ═══════════════════════════════════════════════════════════
from shared.tenant.mixins import TenantViewSetMixin


class BenefitViewSet(TenantViewSetMixin, ModelViewSet):
    pagination_class = StandardResultsSetPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == "list":
            return BenefitListSerializer
        if self.action == "create":
            return BenefitCreateSerializer
        if self.action in ("update", "partial_update"):
            return BenefitUpdateSerializer
        if self.action == "transition":
            return TransitionSerializer
        if self.action == "add_attachment":
            return AttachmentUploadSerializer
        if self.action == "add_comment":
            return CommentCreateSerializer
        return BenefitDetailSerializer

    def get_permissions(self):
        return [IsAuthenticated(), HasModuleAccess("benefits")()]

    def get_queryset(self):
        p = self.request.query_params
        return service.search(
            queryset=service.get_queryset(),
            search_term=p.get("search", ""),
            workflow_state=p.get("state", ""),
            benefit_type_id=p.get("benefit_type", ""),
            employee_id=p.get("employee", ""),
            department_id=p.get("department", ""),
            priority=p.get("priority", ""),
            ai_anomaly=(
                True
                if p.get("ai_anomaly") == "true"
                else (False if p.get("ai_anomaly") == "false" else None)
            ),
            date_from=p.get("date_from", ""),
            date_to=p.get("date_to", ""),
            ordering=p.get("ordering", "-created_at"),
        )

    # ── CRUD standard ────────────────────────────────────
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        ser = BenefitListSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(ser.data)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response(
            {
                "status": "success",
                "data": BenefitDetailSerializer(obj, context={"request": request}).data,
            }
        )

    def create(self, request, *args, **kwargs):
        ser = BenefitCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        benefit = service.create(ser.validated_data, user=request.user, request=request)
        return Response(
            {
                "status": "success",
                "data": BenefitDetailSerializer(benefit, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        benefit = self.get_object()
        try:
            ser = BenefitUpdateSerializer(
                benefit, data=request.data, partial=partial, context={"request": request}
            )
            ser.is_valid(raise_exception=True)
            benefit = service.update(
                benefit, ser.validated_data, user=request.user, request=request
            )
        except WorkflowError as e:
            return Response(
                {"status": "error", "code": e.code, "message": e.message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "status": "success",
                "data": BenefitDetailSerializer(benefit, context={"request": request}).data,
            }
        )

    def destroy(self, request, *args, **kwargs):
        benefit = self.get_object()
        try:
            service.delete(benefit, user=request.user, request=request)
        except WorkflowError as e:
            return Response(
                {"status": "error", "code": e.code, "message": e.message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"status": "success", "message": "Demande supprimée."})

    # ── Transitions workflow ──────────────────────────────
    @action(detail=True, methods=["post"], url_path="transition")
    def transition(self, request, pk=None):
        """
        POST /api/v1/benefits/{id}/transition/
        Body: { to_state, reason?, approved_amount?, payment_reference?, comment? }

        Exécute une transition de workflow.
        """
        benefit = self.get_object()
        ser = TransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        metadata = {}
        if "approved_amount" in data:
            metadata["approved_amount"] = float(data["approved_amount"])
        if "payment_reference" in data:
            metadata["payment_reference"] = data["payment_reference"]
        if "paid_amount" in data:
            metadata["paid_amount"] = float(data["paid_amount"])

        try:
            result = service.transition(
                benefit=benefit,
                to_state=data["to_state"],
                user=request.user,
                reason=data.get("reason", ""),
                metadata=metadata,
                request=request,
            )
        except WorkflowError as e:
            return Response(
                {"status": "error", "code": e.code, "message": e.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ajouter un commentaire automatique si fourni
        if comment_text := data.get("comment"):
            service.add_comment(benefit, comment_text, "internal", request.user)

        benefit.refresh_from_db()
        return Response(
            {
                "status": "success",
                "message": f"Transition {result.from_state} → {result.to_state} effectuée.",
                "from_state": result.from_state,
                "to_state": result.to_state,
                "data": BenefitDetailSerializer(benefit, context={"request": request}).data,
            }
        )

    @action(detail=True, methods=["get"], url_path="available-transitions")
    def available_transitions(self, request, pk=None):
        """Liste les transitions disponibles pour l'utilisateur connecté."""
        benefit = self.get_object()
        transitions = service.get_available_transitions(benefit, request.user)
        return Response({"status": "success", "data": transitions})

    @action(detail=True, methods=["get"], url_path="workflow-log")
    def workflow_log(self, request, pk=None):
        """Historique complet des transitions de cette prestation."""
        benefit = self.get_object()
        logs = benefit.get_workflow_logs()
        ser = WorkflowLogSerializer(logs, many=True)
        return Response({"status": "success", "count": logs.count(), "data": ser.data})

    # ── Pièces jointes ────────────────────────────────────
    @action(
        detail=True,
        methods=["post"],
        url_path="attachments",
        parser_classes=[MultiPartParser, FormParser],
    )
    def add_attachment(self, request, pk=None):
        benefit = self.get_object()
        ser = AttachmentUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        att = service.add_attachment(
            benefit,
            ser.validated_data["file"],
            ser.validated_data.get("doc_type", "other"),
            ser.validated_data.get("description", ""),
            user=request.user,
        )
        from .serializers import BenefitAttachmentSerializer

        return Response(
            {
                "status": "success",
                "data": BenefitAttachmentSerializer(att, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path="attachments/(?P<att_id>[^/.]+)")
    def delete_attachment(self, request, pk=None, att_id=None):
        from django.shortcuts import get_object_or_404

        from .models import BenefitAttachment

        benefit = self.get_object()
        att = get_object_or_404(BenefitAttachment, pk=att_id, benefit=benefit, is_deleted=False)
        service.delete_attachment(att, user=request.user)
        return Response({"status": "success", "message": "Pièce jointe supprimée."})

    # ── Commentaires ──────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="comments")
    def add_comment(self, request, pk=None):
        benefit = self.get_object()
        ser = CommentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        comment = service.add_comment(
            benefit,
            ser.validated_data["content"],
            ser.validated_data.get("comment_type", "internal"),
            user=request.user,
        )
        from .serializers import BenefitCommentSerializer

        return Response(
            {"status": "success", "data": BenefitCommentSerializer(comment).data},
            status=status.HTTP_201_CREATED,
        )

    # ── Statistiques ──────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="statistics")
    def statistics(self, request):
        filters = {
            "department_id": request.query_params.get("department"),
            "benefit_type_id": request.query_params.get("benefit_type"),
            "year": request.query_params.get("year"),
        }
        stats = service.get_statistics({k: v for k, v in filters.items() if v})
        return Response({"status": "success", "data": stats})
