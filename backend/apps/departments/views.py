"""Department views."""

import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.permissions import HasModuleAccess

from .models import Department
from .serializers import DepartmentCreateSerializer, DepartmentListSerializer, DepartmentSerializer
from .services import DepartmentService

logger = logging.getLogger("apps.departments")
service = DepartmentService()


class DepartmentViewSet(ModelViewSet):
    """
    CRUD départements.
    list/retrieve : admin, gestionnaire, comptable
    create/update/delete : admin uniquement
    """

    queryset = Department.objects.filter(is_deleted=False).select_related("parent", "manager")

    def get_serializer_class(self):
        if self.action == "list":
            return DepartmentListSerializer
        if self.action == "create":
            return DepartmentCreateSerializer
        return DepartmentSerializer

    def get_permissions(self):
        return [IsAuthenticated(), HasModuleAccess("employees")()]

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        if search:
            from django.db.models import Q

            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        return qs.order_by("code")

    def create(self, request, *args, **kwargs):
        serializer = DepartmentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        dept = service.create(serializer.validated_data, user=request.user, request=request)
        return Response(
            {
                "status": "success",
                "data": DepartmentSerializer(dept, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        dept = self.get_object()
        serializer = DepartmentSerializer(
            dept, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        dept = service.update(dept, serializer.validated_data, user=request.user, request=request)
        return Response(
            {
                "status": "success",
                "data": DepartmentSerializer(dept, context={"request": request}).data,
            }
        )

    def destroy(self, request, *args, **kwargs):
        dept = self.get_object()
        service.delete(dept, user=request.user, request=request)
        return Response(
            {"status": "success", "message": "Département supprimé."}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        """Arborescence hiérarchique des départements."""
        roots = Department.objects.filter(parent=None, is_deleted=False, is_active=True)

        def build_node(dept):
            return {
                "id": str(dept.id),
                "code": dept.code,
                "name": dept.name,
                "employee_count": dept.employee_count,
                "children": [
                    build_node(c) for c in dept.children.filter(is_deleted=False, is_active=True)
                ],
            }

        return Response({"status": "success", "data": [build_node(r) for r in roots]})
