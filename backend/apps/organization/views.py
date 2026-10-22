from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from core.pagination import StandardResultsSetPagination
from core.permissions import HasModuleAccess

from .models import Bureau, Direction, Function, Grade, Service, SubDirection
from .serializers import (
    BureauSerializer,
    DirectionSerializer,
    FunctionSerializer,
    GradeSerializer,
    ServiceSerializer,
    SubDirectionSerializer,
)


class DirectionViewSet(ModelViewSet):
    queryset = Direction.all_objects.select_related("tenant").all()
    serializer_class = DirectionSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("employees")]
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "code", "description"]
    ordering_fields = ["ordering", "name", "code"]

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=True).order_by("ordering", "name")
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class SubDirectionViewSet(ModelViewSet):
    queryset = SubDirection.all_objects.select_related("direction", "tenant").all()
    serializer_class = SubDirectionSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("employees")]
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "code", "description"]
    ordering_fields = ["ordering", "name", "code"]

    def get_queryset(self):
        qs = super().get_queryset()
        direction_id = self.request.query_params.get("direction")
        if direction_id:
            qs = qs.filter(direction_id=direction_id)
        return qs

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=True).order_by("ordering", "name")
        direction_id = request.query_params.get("direction")
        if direction_id:
            qs = qs.filter(direction_id=direction_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class ServiceViewSet(ModelViewSet):
    queryset = Service.all_objects.select_related("sub_direction", "tenant").all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("employees")]
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "code", "description"]
    ordering_fields = ["ordering", "name", "code"]

    def get_queryset(self):
        qs = super().get_queryset()
        sub_direction_id = self.request.query_params.get("sub_direction")
        if sub_direction_id:
            qs = qs.filter(sub_direction_id=sub_direction_id)
        return qs

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=True).order_by("ordering", "name")
        sub_direction_id = request.query_params.get("sub_direction")
        if sub_direction_id:
            qs = qs.filter(sub_direction_id=sub_direction_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class BureauViewSet(ModelViewSet):
    queryset = Bureau.all_objects.select_related("service", "service__sub_direction", "tenant").all()
    serializer_class = BureauSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("employees")]
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "code", "description"]
    ordering_fields = ["ordering", "name", "code"]

    def get_queryset(self):
        qs = super().get_queryset()
        service_id = self.request.query_params.get("service")
        if service_id:
            qs = qs.filter(service_id=service_id)
        return qs

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=True).order_by("ordering", "name")
        service_id = request.query_params.get("service")
        if service_id:
            qs = qs.filter(service_id=service_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class FunctionViewSet(ModelViewSet):
    queryset = Function.all_objects.select_related("tenant").all()
    serializer_class = FunctionSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("employees")]
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "description"]
    ordering_fields = ["ordering", "name"]

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=True).order_by("ordering", "name")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class GradeViewSet(ModelViewSet):
    queryset = Grade.all_objects.select_related("tenant").all()
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("employees")]
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "description"]
    ordering_fields = ["ordering", "level", "name"]

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=True).order_by("level", "name")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class OrganizationLookupViewSet(ReadOnlyModelViewSet):
    """Lightweight public endpoint for cascading dropdowns — returns all active org data."""

    queryset = Direction.all_objects.none()
    serializer_class = DirectionSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess("employees")]
    pagination_class = None

    def list(self, request):
        directions = Direction.objects.filter(is_active=True).order_by("ordering", "name")
        sub_directions = SubDirection.objects.filter(is_active=True).order_by("ordering", "name")
        services = Service.objects.filter(is_active=True).order_by("ordering", "name")
        bureaux = Bureau.objects.filter(is_active=True).order_by("ordering", "name")
        functions = Function.objects.filter(is_active=True).order_by("ordering", "name")
        grades = Grade.objects.filter(is_active=True).order_by("level", "name")

        return Response({
            "directions": DirectionSerializer(directions, many=True).data,
            "sub_directions": SubDirectionSerializer(sub_directions, many=True).data,
            "services": ServiceSerializer(services, many=True).data,
            "bureaux": BureauSerializer(bureaux, many=True).data,
            "functions": FunctionSerializer(functions, many=True).data,
            "grades": GradeSerializer(grades, many=True).data,
        })
