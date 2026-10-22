"""Employee views."""

import csv
import io
import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.pagination import StandardResultsSetPagination
from core.permissions import HasModuleAccess
from django.http import HttpResponse

from .models import Employee
from .serializers import (
    EmployeeCreateSerializer,
    EmployeeDetailSerializer,
    EmployeeHistorySerializer,
    EmployeeListSerializer,
    EmployeePhotoSerializer,
    EmployeeUpdateSerializer,
)
from .services import EmployeeService

logger = logging.getLogger("apps.employees")
service = EmployeeService()


from shared.tenant.mixins import TenantViewSetMixin


class EmployeeViewSet(TenantViewSetMixin, ModelViewSet):
    pagination_class = StandardResultsSetPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        if self.action == "create":
            return EmployeeCreateSerializer
        if self.action in ("update", "partial_update"):
            return EmployeeUpdateSerializer
        if self.action == "upload_photo":
            return EmployeePhotoSerializer
        if self.action == "history":
            return EmployeeHistorySerializer
        return EmployeeDetailSerializer

    def get_permissions(self):
        return [IsAuthenticated(), HasModuleAccess("employees")()]

    def get_queryset(self):
        params = self.request.query_params
        return service.search(
            queryset=service.get_queryset(),
            search_term=params.get("search", ""),
            status=params.get("status", ""),
            department_id=params.get("department", ""),
            contract_type=params.get("contract_type", ""),
            gender=params.get("gender", ""),
            min_age=int(params["min_age"]) if params.get("min_age") else None,
            max_age=int(params["max_age"]) if params.get("max_age") else None,
            min_seniority=float(params["min_seniority"]) if params.get("min_seniority") else None,
            grade_level=int(params["grade_level"]) if params.get("grade_level") else None,
            ordering=params.get("ordering", "-created_at"),
        )

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        ser = EmployeeListSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(ser.data)

    def retrieve(self, request, *args, **kwargs):
        emp = self.get_object()
        return Response(
            {
                "status": "success",
                "data": EmployeeDetailSerializer(emp, context={"request": request}).data,
            }
        )

    def create(self, request, *args, **kwargs):
        ser = EmployeeCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        emp = service.create(ser.validated_data, user=request.user, request=request)
        return Response(
            {
                "status": "success",
                "data": EmployeeDetailSerializer(emp, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        emp = self.get_object()
        ser = EmployeeUpdateSerializer(
            emp, data=request.data, partial=partial, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        emp = service.update(
            emp, ser.validated_data, user=request.user, request=request, partial=partial
        )
        return Response(
            {
                "status": "success",
                "data": EmployeeDetailSerializer(emp, context={"request": request}).data,
            }
        )

    def destroy(self, request, *args, **kwargs):
        emp = self.get_object()
        service.delete(emp, user=request.user, request=request)
        return Response({"status": "success", "message": f"Employé {emp.matricule} supprimé."})

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path="photo",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_photo(self, request, pk=None):
        emp = self.get_object()
        if request.method == "DELETE":
            service.delete_photo(emp, user=request.user, request=request)
            return Response({"status": "success", "message": "Photo supprimée."})
        ser = EmployeePhotoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        emp = service.upload_photo(
            emp, ser.validated_data["photo"], user=request.user, request=request
        )
        return Response({"status": "success", "data": {"photo_url": emp.photo_url}})

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        emp = self.get_object()
        records = emp.history.all().order_by("-history_date")[:50]
        return Response(
            {
                "status": "success",
                "count": len(records),
                "data": EmployeeHistorySerializer(records, many=True).data,
            }
        )

    @action(detail=True, methods=["get"], url_path="business-history")
    def business_history(self, request, pk=None):
        emp = self.get_object()
        results = []

        # Benefits
        from apps.benefits.models import Benefit
        for b in Benefit.objects.filter(employee=emp, is_deleted=False).values(
            "id", "reference", "workflow_state", "created_at", "updated_at",
            "created_by__first_name", "created_by__last_name",
        ):
            results.append({
                "id": str(b["id"]),
                "date": b["created_at"].isoformat() if b["created_at"] else "",
                "type": "benefit",
                "type_label": "Prestation",
                "reference": b["reference"],
                "beneficiary": emp.get_full_name(),
                "status": b["workflow_state"],
                "requested_by": f"{b['created_by__first_name'] or ''} {b['created_by__last_name'] or ''}".strip(),
                "updated_at": b["updated_at"].isoformat() if b["updated_at"] else "",
            })

        # Loans
        from apps.loans.models import Loan
        for l in Loan.objects.filter(employee=emp, is_deleted=False).values(
            "id", "reference", "workflow_state", "created_at", "updated_at",
            "created_by__first_name", "created_by__last_name",
        ):
            results.append({
                "id": str(l["id"]),
                "date": l["created_at"].isoformat() if l["created_at"] else "",
                "type": "loan",
                "type_label": "Prêt",
                "reference": l["reference"],
                "beneficiary": emp.get_full_name(),
                "status": l["workflow_state"],
                "requested_by": f"{l['created_by__first_name'] or ''} {l['created_by__last_name'] or ''}".strip(),
                "updated_at": l["updated_at"].isoformat() if l["updated_at"] else "",
            })

        # Medical Coverage Vouchers
        from apps.medical_coverage.models import MedicalCoverageVoucher
        for v in MedicalCoverageVoucher.objects.filter(employee=emp, is_deleted=False).select_related(
            "coverage_type", "beneficiary"
        ):
            results.append({
                "id": str(v.id),
                "date": v.created_at.isoformat() if v.created_at else "",
                "type": "medical_voucher",
                "type_label": f"Couverture médicale - {v.coverage_type.name if v.coverage_type else ''}",
                "reference": v.reference,
                "beneficiary": v.beneficiary.get_full_name() if v.beneficiary else emp.get_full_name(),
                "status": v.workflow_state,
                "requested_by": v.created_by.get_full_name() if v.created_by else "",
                "updated_at": v.updated_at.isoformat() if v.updated_at else "",
            })

        # Medical Coverage Requests
        from apps.medical_coverage.models import MedicalCoverageRequest
        for r in MedicalCoverageRequest.objects.filter(employee=emp, is_deleted=False).select_related(
            "beneficiary"
        ):
            results.append({
                "id": str(r.id),
                "date": r.created_at.isoformat() if r.created_at else "",
                "type": "medical_request",
                "type_label": "Demande de couverture médicale",
                "reference": r.request_number,
                "beneficiary": r.beneficiary.get_full_name() if r.beneficiary else emp.get_full_name(),
                "status": r.workflow_state,
                "requested_by": r.created_by.get_full_name() if r.created_by else "",
                "updated_at": r.updated_at.isoformat() if r.updated_at else "",
            })

        results.sort(key=lambda x: x.get("date", ""), reverse=True)
        return Response({"status": "success", "count": len(results), "data": results})

    @action(detail=False, methods=["get"], url_path="statistics")
    def statistics(self, request):
        return Response({"status": "success", "data": service.get_statistics()})

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        from shared.audit.services import AuditService

        qs = self.filter_queryset(self.get_queryset())
        AuditService().log_export(
            user=request.user,
            content_type="employees",
            filters=dict(request.query_params),
            request=request,
        )
        output = io.StringIO()
        w = csv.writer(output)
        w.writerow(
            [
                "Matricule",
                "Nom",
                "Prénom",
                "Genre",
                "Date naissance",
                "Département",
                "Poste",
                "Grade",
                "Contrat",
                "Date embauche",
                "Ancienneté",
                "Statut",
                "Téléphone",
                "Email",
                "Wilaya",
            ]
        )
        for e in qs.iterator(chunk_size=2000):
            w.writerow(
                [
                    e.matricule,
                    e.last_name,
                    e.first_name,
                    e.get_gender_display(),
                    e.date_of_birth.strftime("%d/%m/%Y") if e.date_of_birth else "",
                    e.department.name if e.department else "",
                    e.job_title,
                    e.grade,
                    e.get_contract_type_display(),
                    e.date_hired.strftime("%d/%m/%Y") if e.date_hired else "",
                    e.seniority_years or "",
                    e.get_status_display(),
                    e.phone,
                    e.email_professional,
                    e.wilaya,
                ]
            )
        resp = HttpResponse(output.getvalue(), content_type="text/csv; charset=utf-8-sig")
        resp["Content-Disposition"] = 'attachment; filename="employes.csv"'
        return resp

    @action(detail=True, methods=["post"], url_path="change-status")
    def change_status(self, request, pk=None):
        from shared.audit.services import AuditService

        emp = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Employee.Status.choices):
            return Response(
                {"status": "error", "message": "Statut invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old = emp.status
        emp.status = new_status
        emp.updated_by = request.user
        emp.save(update_fields=["status", "updated_at", "updated_by"])
        AuditService().log_action(
            action="UPDATE",
            user=request.user,
            obj=emp,
            request=request,
            before_data={"status": old},
            after_data={"status": new_status},
            extra_data={"reason": request.data.get("reason", "")},
            severity="MEDIUM",
        )
        return Response(
            {
                "status": "success",
                "data": {"status": new_status, "status_display": emp.get_status_display()},
            }
        )
