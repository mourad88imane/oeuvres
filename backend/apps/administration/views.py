from django.db.models import Count, Q

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from core.pagination import StandardResultsSetPagination
from core.permissions import HasModuleAccess

from .models import (
    ApprovalHistory,
    ApprovalMatrix,
    Permission,
    Role,
    RolePermission,
    SystemParameter,
    UserRoleAssignment,
    WorkflowPermission,
)
from .serializers import (
    ApprovalHistorySerializer,
    ApprovalMatrixSerializer,
    PermissionSerializer,
    RolePermissionSerializer,
    RoleSerializer,
    SystemParameterSerializer,
    UserRoleAssignmentSerializer,
    WorkflowPermissionSerializer,
)

# =========================================================================
# SYSTEM PARAMETERS
# =========================================================================


class SystemParameterViewSet(ModelViewSet):
    queryset = SystemParameter.objects.select_related("updated_by").all()
    serializer_class = SystemParameterSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="by-key/(?P<key>[^/.]+)")
    def by_key(self, request, key=None):
        try:
            param = self.get_queryset().get(key=key)
            return Response({"status": "success", "data": self.get_serializer(param).data})
        except SystemParameter.DoesNotExist:
            return Response(
                {"status": "error", "message": "Paramètre non trouvé"},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["patch"], url_path="by-key/(?P<key>[^/.]+)")
    def update_by_key(self, request, key=None):
        try:
            param = self.get_queryset().get(key=key)
            ser = self.get_serializer(param, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save(updated_by=request.user)
            return Response({"status": "success", "data": ser.data})
        except SystemParameter.DoesNotExist:
            return Response(
                {"status": "error", "message": "Paramètre non trouvé"},
                status=status.HTTP_404_NOT_FOUND,
            )


# =========================================================================
# ROLES
# =========================================================================


class RoleViewSet(ModelViewSet):
    queryset = Role.objects.annotate(
        permission_count=Count("role_permissions", distinct=True),
        user_count=Count("user_assignments", filter=Q(user_assignments__is_active=True), distinct=True),
    ).all()
    serializer_class = RoleSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["rank", "name", "created_at"]
    ordering = ["rank", "name"]

    def perform_destroy(self, instance):
        if instance.is_system:
            return Response(
                {"status": "error", "message": "Les rôles système ne peuvent pas être supprimés."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


# =========================================================================
# PERMISSIONS
# =========================================================================


class PermissionViewSet(ModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    search_fields = ["codename", "name", "description"]
    filterset_fields = ["module"]
    ordering_fields = ["module", "codename", "created_at"]
    ordering = ["module", "codename"]


# =========================================================================
# ROLE PERMISSIONS
# =========================================================================


class RolePermissionViewSet(ModelViewSet):
    queryset = RolePermission.objects.select_related("role", "permission").all()
    serializer_class = RolePermissionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    filterset_fields = ["role", "permission"]
    search_fields = ["role__name", "role__slug", "permission__codename"]


# =========================================================================
# USER ROLE ASSIGNMENTS
# =========================================================================


class UserRoleAssignmentViewSet(ModelViewSet):
    queryset = UserRoleAssignment.objects.select_related(
        "user", "role", "assigned_by"
    ).all()
    serializer_class = UserRoleAssignmentSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    filterset_fields = ["role", "is_active", "user"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "role__name"]

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


# =========================================================================
# WORKFLOW PERMISSIONS
# =========================================================================


class WorkflowPermissionViewSet(ModelViewSet):
    queryset = WorkflowPermission.objects.select_related("role", "permission").all()
    serializer_class = WorkflowPermissionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    filterset_fields = ["app_label", "model_name", "role"]
    search_fields = ["app_label", "model_name"]


# =========================================================================
# APPROVAL MATRIX
# =========================================================================


class ApprovalMatrixViewSet(ModelViewSet):
    queryset = ApprovalMatrix.objects.prefetch_related("required_roles").all()
    serializer_class = ApprovalMatrixSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    filterset_fields = ["module", "is_active", "approval_level"]
    search_fields = ["module", "description"]
    ordering_fields = ["module", "approval_level", "min_amount"]
    ordering = ["module", "approval_level", "min_amount"]


# =========================================================================
# APPROVAL HISTORY
# =========================================================================


class ApprovalHistoryViewSet(ReadOnlyModelViewSet):
    queryset = ApprovalHistory.objects.select_related("user", "content_type").all()
    serializer_class = ApprovalHistorySerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    filterset_fields = ["action", "content_type"]
    search_fields = ["comment", "user__email"]
    ordering_fields = ["date"]
    ordering = ["-date"]
