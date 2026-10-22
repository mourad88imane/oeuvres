from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import models
from django.shortcuts import get_object_or_404

from core.permissions import HasModuleAccess, user_has_permission
from core.pagination import StandardResultsSetPagination
from shared.tenant.mixins import TenantViewSetMixin
from apps.medical_coverage.models import (
    MedicalCoverageVoucher, MedicalCoverageType, MedicalProvider,
    MedicalCoverageRequest,
)
from apps.medical_coverage.serializers import (
    MedicalCoverageVoucherListSerializer,
    MedicalCoverageVoucherDetailSerializer,
    MedicalCoverageVoucherCreateSerializer,
    MedicalCoverageVoucherUpdateSerializer,
    MedicalCoverageVoucherTransitionSerializer,
    MedicalCoverageTypeSerializer,
    MedicalProviderSerializer,
    EmployeeEligibilitySerializer,
    MedicalCoverageRequestListSerializer,
    MedicalCoverageRequestDetailSerializer,
    MedicalCoverageRequestCreateSerializer,
    MedicalCoverageRequestUpdateSerializer,
    MedicalCoverageRequestTransitionSerializer,
)
from apps.medical_coverage.services import MedicalCoverageService, MedicalCoverageRequestService
from apps.medical_coverage.eligibility import EligibilityEngine


class MedicalCoverageTypeViewSet(viewsets.ModelViewSet):
    queryset = MedicalCoverageType.objects.filter(is_active=True)
    serializer_class = MedicalCoverageTypeSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("medical_coverage")]
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasModuleAccess("medical_coverage")()]
        return [IsAuthenticated(), HasModuleAccess("medical_coverage")()]


class MedicalProviderViewSet(viewsets.ModelViewSet):
    queryset = MedicalProvider.objects.filter(is_active=True)
    serializer_class = MedicalProviderSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("medical_coverage")]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        coverage_type = self.request.query_params.get("coverage_type")
        if coverage_type:
            qs = qs.filter(coverage_types__contains=coverage_type)
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=search) | Q(city__icontains=search)
            )
        return qs


class MedicalCoverageVoucherViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    service = MedicalCoverageService()
    permission_classes = [IsAuthenticated, HasModuleAccess("medical_coverage")]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == "create":
            return MedicalCoverageVoucherCreateSerializer
        elif self.action in ("update", "partial_update"):
            return MedicalCoverageVoucherUpdateSerializer
        elif self.action == "retrieve":
            return MedicalCoverageVoucherDetailSerializer
        return MedicalCoverageVoucherListSerializer

    def get_queryset(self):
        return self.service.search(self.request.query_params)

    def perform_create(self, serializer):
        voucher = self.service.create(
            serializer.validated_data, self.request.user,
            tenant=getattr(self.request, "tenant", None),
        )
        serializer.instance = voucher

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = MedicalCoverageVoucherDetailSerializer(
            serializer.instance, context={"request": request},
        )
        return Response(
            {"status": "success", "data": detail.data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = MedicalCoverageVoucherDetailSerializer(
            instance, context={"request": request},
        )
        return Response({"status": "success", "data": serializer.data})

    def perform_update(self, serializer):
        voucher = self.service.update(
            serializer.instance.id, serializer.validated_data, self.request.user,
        )
        serializer.instance = voucher

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        voucher = get_object_or_404(MedicalCoverageVoucher, id=pk)
        ser = MedicalCoverageVoucherTransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            voucher = self.service.transition(
                pk, ser.validated_data["to_state"],
                request.user, ser.validated_data.get("reason"),
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        out = MedicalCoverageVoucherDetailSerializer(
            voucher, context={"request": request},
        )
        return Response({"status": "success", "data": out.data})

    @action(detail=True, methods=["get"])
    def available_transitions(self, request, pk=None):
        voucher = get_object_or_404(MedicalCoverageVoucher, id=pk)
        data = self.service.get_available_transitions(pk, request.user)
        return Response({"status": "success", "data": data})

    @action(detail=True, methods=["get"])
    def workflow_log(self, request, pk=None):
        logs = self.service.get_workflow_log(pk)
        data = [
            {
                "id": str(log.id),
                "from_state": log.from_state,
                "to_state": log.to_state,
                "transition_name": log.transition_name,
                "actor_email": log.actor_email,
                "reason": log.reason,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in logs
        ]
        return Response({"status": "success", "count": len(data), "data": data})

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        coverage_type = request.query_params.get("coverage_type")
        stats = self.service.get_statistics(coverage_type)
        return Response({"status": "success", "data": stats})

    @action(detail=False, methods=["get"])
    def employee_info(self, request):
        employee_id = request.query_params.get("employee_id")
        coverage_type = request.query_params.get("coverage_type")
        if not employee_id:
            return Response(
                {"status": "error", "message": "employee_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        info = self.service.get_employee_info(employee_id)
        if not info:
            return Response(
                {"status": "error", "message": "Employee not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        summary = self.service.get_employee_coverage_summary(employee_id, coverage_type)
        dependents = self.service.get_dependents_summary(employee_id, coverage_type)

        # Also include beneficiaries without prior vouchers
        from apps.beneficiaries.models import Beneficiary
        voucher_dep_ids = {d["id"] for d in dependents}
        for b in Beneficiary.objects.filter(employee_id=employee_id, is_deleted=False):
            b_id = str(b.id)
            if b_id not in voucher_dep_ids:
                dependents.append({
                    "id": b_id,
                    "full_name": f"{b.first_name} {b.last_name}",
                    "relationship": b.relationship,
                    "relationship_display": b.get_relationship_display(),
                    "last_voucher_date": None,
                    "last_voucher_reference": None,
                    "count_last_3_months": 0,
                })

        engine = EligibilityEngine(MedicalCoverageVoucher)
        if coverage_type:
            ct = get_object_or_404(MedicalCoverageType, code=coverage_type)
            eligibility = engine.check_employee_eligibility(
                employee_id, ct, timezone.now().date(),
            )
            dep_eligibility = []
            for dep in MedicalCoverageVoucher.objects.filter(
                employee_id=employee_id,
            ).values_list("beneficiary_id", flat=True).distinct():
                if dep:
                    dep_eligibility.append({
                        "beneficiary_id": str(dep),
                        "result": engine.check_dependent_eligibility(
                            employee_id, dep, ct, timezone.now().date(),
                        ).__dict__,
                    })
        else:
            eligibility = None
            dep_eligibility = []

        return Response({
            "status": "success",
            "data": {
                "employee": info,
                "summary": summary,
                "dependents": dependents,
                "eligibility": {
                    "is_eligible": eligibility.is_eligible if eligibility else None,
                    "messages": eligibility.messages if eligibility else [],
                    "next_eligible_date": str(eligibility.next_eligible_date) if eligibility and eligibility.next_eligible_date else None,
                    "last_voucher_date": str(eligibility.last_voucher_date) if eligibility and eligibility.last_voucher_date else None,
                    "last_voucher_reference": eligibility.last_voucher_reference if eligibility else None,
                    "count_last_3_months": eligibility.count_last_3_months if eligibility else 0,
                    "count_current_year": eligibility.count_current_year if eligibility else 0,
                    "remaining": eligibility.remaining if eligibility else 0,
                } if eligibility else None,
                "dependent_eligibility": dep_eligibility,
            },
        })


class MedicalCoverageRequestViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    service = MedicalCoverageRequestService()
    permission_classes = [IsAuthenticated, HasModuleAccess("medical_coverage")]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == "create":
            return MedicalCoverageRequestCreateSerializer
        elif self.action in ("update", "partial_update"):
            return MedicalCoverageRequestUpdateSerializer
        elif self.action == "retrieve":
            return MedicalCoverageRequestDetailSerializer
        return MedicalCoverageRequestListSerializer

    def get_queryset(self):
        return self.service.search(self.request.query_params)

    def perform_create(self, serializer):
        request_obj = self.service.create(
            serializer.validated_data, self.request.user,
            tenant=getattr(self.request, "tenant", None),
        )
        serializer.instance = request_obj

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = MedicalCoverageRequestDetailSerializer(
            serializer.instance, context={"request": request},
        )
        return Response(
            {"status": "success", "data": detail.data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = MedicalCoverageRequestDetailSerializer(
            instance, context={"request": request},
        )
        return Response({"status": "success", "data": serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.workflow_state != MedicalCoverageRequest.Status.DRAFT:
            return Response(
                {"status": "error", "message": "Seules les demandes en brouillon peuvent être modifiées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(instance, data=request.data, partial=self.action == "partial_update")
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        detail = MedicalCoverageRequestDetailSerializer(
            serializer.instance, context={"request": request},
        )
        return Response({"status": "success", "data": detail.data})

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.workflow_state != MedicalCoverageRequest.Status.DRAFT:
            return Response(
                {"status": "error", "message": "Seules les demandes en brouillon peuvent être supprimées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        request_obj = get_object_or_404(MedicalCoverageRequest, id=pk)
        ser = MedicalCoverageRequestTransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            request_obj = self.service.transition(
                pk, ser.validated_data["to_state"],
                request.user, ser.validated_data.get("reason"),
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        out = MedicalCoverageRequestDetailSerializer(
            request_obj, context={"request": request},
        )
        return Response({"status": "success", "data": out.data})

    @action(detail=True, methods=["get"])
    def available_transitions(self, request, pk=None):
        request_obj = get_object_or_404(MedicalCoverageRequest, id=pk)
        data = self.service.get_available_transitions(pk, request.user)
        return Response({"status": "success", "data": data})

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        category = request.query_params.get("category")
        stats = self.service.get_statistics(category)
        return Response({"status": "success", "data": stats})

    @action(detail=False, methods=["get"])
    def employee_eligibility(self, request):
        employee_id = request.query_params.get("employee_id")
        category = request.query_params.get("category")
        beneficiary_id = request.query_params.get("beneficiary_id")
        if not employee_id or not category:
            return Response(
                {"status": "error", "message": "employee_id and category are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = self.service.check_employee_eligibility(employee_id, category, beneficiary_id=beneficiary_id)
        if result is None:
            return Response(
                {"status": "error", "message": "Employee not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"status": "success", "data": result})

    @action(detail=True, methods=["post"])
    def mark_consumed(self, request, pk=None):
        # Règle métier : un bon devient « Consommé » UNIQUEMENT lorsqu'il est
        # réellement ajouté à une facture prestataire. La consommation manuelle
        # est réservée à l'administration (correctif de données uniquement).
        if not (getattr(request.user, "is_admin", False) or request.user.is_superuser):
            return Response(
                {
                    "status": "error",
                    "message": (
                        "Action réservée à l'administrateur : la consommation "
                        "s'effectue via l'ajout du bon à une facture prestataire."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        request_obj = get_object_or_404(MedicalCoverageRequest, id=pk)
        if request_obj.workflow_state not in ("validated", "printed"):
            return Response(
                {"status": "error", "message": "Seules les demandes validées ou imprimées peuvent être marquées comme consommées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request_obj.consumption_status == "consumed":
            return Response(
                {"status": "error", "message": "Cette demande est déjà marquée comme consommée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request_obj.consumption_status = "consumed"
        request_obj.consumed_at = timezone.now()
        request_obj.save(update_fields=["consumption_status", "consumed_at", "updated_at"])
        return Response({"status": "success", "message": "Demande marquée comme consommée."})

    @action(detail=True, methods=["get"])
    def workflow_log(self, request, pk=None):
        from shared.workflow.models import WorkflowLog
        logs = WorkflowLog.objects.filter(
            object_id=pk,
            content_type_name="medical_coverage.medicalcoveragerequest",
        ).order_by("-timestamp")
        data = [
            {
                "id": str(log.id),
                "from_state": log.from_state,
                "to_state": log.to_state,
                "transition_name": log.transition_name,
                "actor_email": log.actor_email,
                "reason": log.reason,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in logs
        ]
        return Response({"status": "success", "count": len(data), "data": data})

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        import logging
        from django.http import HttpResponse
        from django.template.loader import render_to_string
        from django.template.exceptions import TemplateDoesNotExist
        from weasyprint import HTML
        import tempfile, os

        logger = logging.getLogger(__name__)

        request_obj = get_object_or_404(
            MedicalCoverageRequest.objects.select_related(
                "employee", "beneficiary", "partner", "created_by",
            ),
            id=pk,
        )

        APPROVED_STATES = ("validated", "printed")
        if request_obj.workflow_state not in APPROVED_STATES:
            return Response(
                {
                    "status": "error",
                    "message": "Le bon de prise en charge ne peut être imprimé qu'après approbation.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # L'impression d'un bon définitif est réservée aux rôles disposant de
        # la permission coverage.print_voucher (admin bypass).
        if not user_has_permission(request.user, "coverage.print_voucher"):
            return Response(
                {
                    "status": "error",
                    "message": "Vous n'avez pas la permission d'imprimer les bons de prise en charge.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        ctx = {
            "request_obj": request_obj,
            "employee": request_obj.employee,
            "beneficiary": request_obj.beneficiary,
            "partner": request_obj.partner,
            "coverage_date": request_obj.coverage_date,
            "validation_date": request_obj.validation_date,
            "request_number": request_obj.request_number,
        }

        template_name = "medical_coverage/voucher_pdf.html"

        try:
            html = render_to_string(template_name, ctx)
        except TemplateDoesNotExist:
            logger.error("PDF template '%s' not found", template_name)
            return Response(
                {"error": "Template PDF introuvable"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                HTML(string=html).write_pdf(f.name)
                f.seek(0)
                pdf_content = f.read()
                os.unlink(f.name)
        except Exception as e:
            logger.error("PDF generation failed for request %s: %s", pk, e)
            return Response(
                {"error": "Erreur lors de la génération du PDF"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Track this as a print event
        try:
            from apps.medical_coverage.models import MedicalCoverageRequest as MCR
            MCR.objects.filter(id=pk).update(
                printed_at=timezone.now(),
                print_count=models.F("print_count") + 1,
            )
        except Exception:
            pass

        mode = request.query_params.get("mode", "download")
        filename = f"{request_obj.request_number}.pdf"
        disposition = "inline" if mode == "preview" else f'attachment; filename="{filename}"'

        resp = HttpResponse(pdf_content, content_type="application/pdf")
        resp["Content-Disposition"] = disposition
        return resp
