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

from .serializers import (
    AttachmentUploadSerializer,
    CommentCreateSerializer,
    LoanAttachmentSerializer,
    LoanCommentSerializer,
    LoanCreateSerializer,
    LoanDetailSerializer,
    LoanListSerializer,
    LoanUpdateSerializer,
    TransitionSerializer,
    WorkflowLogSerializer,
)
from .services import LoanService

logger = logging.getLogger("apps.loans")
service = LoanService()


from shared.tenant.mixins import TenantViewSetMixin


class LoanViewSet(TenantViewSetMixin, ModelViewSet):
    pagination_class = StandardResultsSetPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == "list":
            return LoanListSerializer
        if self.action == "create":
            return LoanCreateSerializer
        if self.action in ("update", "partial_update"):
            return LoanUpdateSerializer
        if self.action == "transition":
            return TransitionSerializer
        if self.action == "add_attachment":
            return AttachmentUploadSerializer
        if self.action == "add_comment":
            return CommentCreateSerializer
        return LoanDetailSerializer

    def get_permissions(self):
        return [IsAuthenticated(), HasModuleAccess("loans")()]

    def get_queryset(self):
        p = self.request.query_params
        return service.search(
            queryset=service.get_queryset(),
            search_term=p.get("search", ""),
            workflow_state=p.get("state", ""),
            employee_id=p.get("employee", ""),
            department_id=p.get("department", ""),
            date_from=p.get("date_from", ""),
            date_to=p.get("date_to", ""),
            ordering=p.get("ordering", "-created_at"),
        )

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        ser = LoanListSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(ser.data)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response({
            "status": "success",
            "data": LoanDetailSerializer(obj, context={"request": request}).data,
        })

    def create(self, request, *args, **kwargs):
        ser = LoanCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        loan = service.create(ser.validated_data, user=request.user, request=request)
        return Response({
            "status": "success",
            "data": LoanDetailSerializer(loan, context={"request": request}).data,
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        loan = self.get_object()
        try:
            ser = LoanUpdateSerializer(loan, data=request.data, partial=partial, context={"request": request})
            ser.is_valid(raise_exception=True)
            loan = service.update(loan, ser.validated_data, user=request.user, request=request)
        except WorkflowError as e:
            return Response({"status": "error", "code": e.code, "message": e.message},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "status": "success",
            "data": LoanDetailSerializer(loan, context={"request": request}).data,
        })

    def destroy(self, request, *args, **kwargs):
        loan = self.get_object()
        try:
            service.delete(loan, user=request.user, request=request)
        except WorkflowError as e:
            return Response({"status": "error", "code": e.code, "message": e.message},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": "success", "message": "Demande supprimée."})

    @action(detail=True, methods=["post"], url_path="transition")
    def transition(self, request, pk=None):
        loan = self.get_object()
        ser = TransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        metadata = {}
        if "approved_amount" in data:
            metadata["approved_amount"] = float(data["approved_amount"])
        if "monthly_instalment" in data:
            metadata["monthly_instalment"] = float(data["monthly_instalment"])
        if "instalment_count" in data:
            metadata["instalment_count"] = data["instalment_count"]
        if "payment_reference" in data:
            metadata["payment_reference"] = data["payment_reference"]
        if "paid_amount" in data:
            metadata["paid_amount"] = float(data["paid_amount"])

        try:
            result = service.transition(
                loan=loan, to_state=data["to_state"], user=request.user,
                reason=data.get("reason", ""), metadata=metadata, request=request,
            )
        except WorkflowError as e:
            return Response({"status": "error", "code": e.code, "message": e.message},
                            status=status.HTTP_400_BAD_REQUEST)

        if comment_text := data.get("comment"):
            service.add_comment(loan, comment_text, "internal", request.user)

        loan.refresh_from_db()
        return Response({
            "status": "success",
            "message": f"Transition {result.from_state} → {result.to_state} effectuée.",
            "from_state": result.from_state,
            "to_state": result.to_state,
            "data": LoanDetailSerializer(loan, context={"request": request}).data,
        })

    @action(detail=True, methods=["get"], url_path="available-transitions")
    def available_transitions(self, request, pk=None):
        loan = self.get_object()
        transitions = service.get_available_transitions(loan, request.user)
        return Response({"status": "success", "data": transitions})

    @action(detail=True, methods=["get"], url_path="workflow-log")
    def workflow_log(self, request, pk=None):
        loan = self.get_object()
        logs = loan.get_workflow_logs()
        ser = WorkflowLogSerializer(logs, many=True)
        return Response({"status": "success", "count": logs.count(), "data": ser.data})

    @action(detail=True, methods=["post"], url_path="attachments",
            parser_classes=[MultiPartParser, FormParser])
    def add_attachment(self, request, pk=None):
        loan = self.get_object()
        ser = AttachmentUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        att = service.add_attachment(
            loan, ser.validated_data["file"],
            ser.validated_data.get("doc_type", "other"),
            ser.validated_data.get("description", ""),
            user=request.user,
        )
        return Response({
            "status": "success",
            "data": LoanAttachmentSerializer(att, context={"request": request}).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="attachments/(?P<att_id>[^/.]+)")
    def delete_attachment(self, request, pk=None, att_id=None):
        from django.shortcuts import get_object_or_404
        from .models import LoanAttachment
        loan = self.get_object()
        att = get_object_or_404(LoanAttachment, pk=att_id, loan=loan, is_deleted=False)
        service.delete_attachment(att, user=request.user)
        return Response({"status": "success", "message": "Pièce jointe supprimée."})

    @action(detail=True, methods=["post"], url_path="comments")
    def add_comment(self, request, pk=None):
        loan = self.get_object()
        ser = CommentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        comment = service.add_comment(
            loan, ser.validated_data["content"],
            ser.validated_data.get("comment_type", "internal"),
            user=request.user,
        )
        return Response({
            "status": "success",
            "data": LoanCommentSerializer(comment).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="statistics")
    def statistics(self, request):
        filters = {
            "department_id": request.query_params.get("department"),
            "year": request.query_params.get("year"),
        }
        stats = service.get_statistics({k: v for k, v in filters.items() if v})
        return Response({"status": "success", "data": stats})
