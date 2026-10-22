from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import HasModuleAccess
from core.pagination import StandardResultsSetPagination

from shared.workflow.models import (
    WorkflowState, WorkflowTransition, WorkflowTransitionRole,
)

from .serializers import (
    WorkflowStateSerializer,
    WorkflowTransitionSerializer,
    WorkflowTransitionRoleWriteSerializer,
)


class WorkflowStateViewSet(viewsets.ModelViewSet):
    queryset = WorkflowState.objects.all()
    serializer_class = WorkflowStateSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    filterset_fields = ["app_label", "model_name", "is_active", "is_initial", "is_final"]
    search_fields = ["label_fr", "label_ar", "state_id"]
    ordering_fields = ["app_label", "model_name", "display_order"]
    ordering = ["app_label", "model_name", "display_order"]


class WorkflowTransitionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowTransition.objects.select_related(
        "from_state", "to_state"
    ).prefetch_related("allowed_roles__role").all()
    serializer_class = WorkflowTransitionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]
    filterset_fields = ["app_label", "model_name", "from_state", "to_state", "is_active"]
    search_fields = ["name", "label_fr", "label_ar"]
    ordering_fields = ["app_label", "model_name", "display_order"]
    ordering = ["app_label", "model_name", "display_order"]

    @action(detail=True, methods=["post"])
    def add_role(self, request, pk=None):
        transition = self.get_object()
        ser = WorkflowTransitionRoleWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        from apps.administration.models import Role
        role = Role.objects.get(pk=ser.validated_data["role"])
        obj, created = WorkflowTransitionRole.objects.get_or_create(
            transition=transition,
            role=role,
            defaults={"permission_id": ser.validated_data.get("permission")},
        )
        if not created:
            return Response({"status": "exists"}, status=status.HTTP_200_OK)
        return Response({"status": "created", "id": str(obj.pk)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def remove_role(self, request, pk=None):
        transition = self.get_object()
        role_id = request.data.get("role")
        if not role_id:
            return Response({"error": "role required"}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = WorkflowTransitionRole.objects.filter(
            transition=transition, role_id=role_id,
        ).delete()
        return Response({"status": "deleted" if deleted else "not_found"})


class WorkflowModelListView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, HasModuleAccess("admin")]

    def list(self, request):
        pairs = (
            WorkflowState.objects.values("app_label", "model_name")
            .distinct()
            .order_by("app_label", "model_name")
        )
        results = []
        for p in pairs:
            states = WorkflowState.objects.filter(
                app_label=p["app_label"], model_name=p["model_name"], is_active=True,
            ).order_by("display_order")
            results.append({
                "app_label": p["app_label"],
                "model_name": p["model_name"],
                "label": f"{p['app_label']}.{p['model_name']}",
                "state_count": states.count(),
            })
        return Response(results)
