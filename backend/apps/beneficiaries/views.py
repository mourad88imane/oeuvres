"""Beneficiary views."""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.employees.models import Employee
from core.pagination import StandardResultsSetPagination
from core.permissions import HasModuleAccess
from django.db import models
from django.shortcuts import get_object_or_404

from .models import Beneficiary
from .serializers import (
    BeneficiaryCreateSerializer,
    BeneficiarySerializer,
    BeneficiaryUpdateSerializer,
)
from .services import BeneficiaryService

logger = logging.getLogger("apps.beneficiaries")
service = BeneficiaryService()


from shared.tenant.mixins import TenantViewSetMixin


class BeneficiaryViewSet(TenantViewSetMixin, ModelViewSet):
    def get_permissions(self):
        return [IsAuthenticated(), HasModuleAccess("dependent")()]

    def get_serializer_class(self):
        if self.action == "create":
            return BeneficiaryCreateSerializer
        if self.action in ("update", "partial_update"):
            return BeneficiaryUpdateSerializer
        return BeneficiarySerializer

    def _get_employee(self):
        return get_object_or_404(Employee, pk=self.kwargs["employee_pk"], is_deleted=False)

    def get_queryset(self):
        return Beneficiary.objects.filter(employee=self._get_employee(), is_deleted=False).order_by(
            "relationship", "last_name"
        )

    def list(self, request, *args, **kwargs):
        emp = self._get_employee()
        qs = self.get_queryset()
        return Response(
            {
                "status": "success",
                "employee": {
                    "id": str(emp.id),
                    "matricule": emp.matricule,
                    "name": emp.get_full_name(),
                },
                "count": qs.count(),
                "data": BeneficiarySerializer(qs, many=True, context={"request": request}).data,
            }
        )

    def create(self, request, *args, **kwargs):
        emp = self._get_employee()
        ser = BeneficiaryCreateSerializer(
            data=request.data, context={"request": request, "employee": emp}
        )
        ser.is_valid(raise_exception=True)
        bene = service.create(emp, ser.validated_data, user=request.user, request=request)
        return Response(
            {
                "status": "success",
                "data": BeneficiarySerializer(bene, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        bene = self.get_object()
        ser = BeneficiaryUpdateSerializer(
            bene,
            data=request.data,
            partial=partial,
            context={"request": request, "employee": bene.employee},
        )
        ser.is_valid(raise_exception=True)
        bene = service.update(bene, ser.validated_data, user=request.user, request=request)
        return Response(
            {
                "status": "success",
                "data": BeneficiarySerializer(bene, context={"request": request}).data,
            }
        )

    def destroy(self, request, *args, **kwargs):
        bene = self.get_object()
        service.delete(bene, user=request.user, request=request)
        return Response({"status": "success", "message": "Ayant droit supprimé."})


class BeneficiaryGlobalViewSet(ReadOnlyModelViewSet):
    queryset = (
        Beneficiary.objects.filter(is_deleted=False)
        .select_related("employee", "employee__department")
        .order_by("employee__matricule", "relationship")
    )
    serializer_class = BeneficiarySerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("dependent")]

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        relation = request.query_params.get("relationship", "")
        search = request.query_params.get("search", "")
        eligible = request.query_params.get("eligible", "")

        if relation:
            qs = qs.filter(relationship=relation)
        if eligible:
            qs = qs.filter(is_eligible=eligible == "true")
        if search:
            qs = qs.filter(
                models.Q(first_name__icontains=search)
                | models.Q(last_name__icontains=search)
                | models.Q(employee__matricule__icontains=search)
                | models.Q(employee__full_name__icontains=search)
                | models.Q(national_id__icontains=search)
            )

        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return Response(
                {
                    "status": "success",
                    "count": self.paginator.page.paginator.count,
                    "data": ser.data,
                }
            )
        ser = self.get_serializer(qs, many=True)
        return Response({"status": "success", "data": ser.data})
