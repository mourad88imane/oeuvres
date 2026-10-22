"""
============================================================
USERS VIEWS — Gestion des utilisateurs
============================================================
"""

import logging

from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.permissions import HasModuleAccess
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

from .serializers import (
    ChangePasswordSerializer,
    UserAdminUpdateSerializer,
    UserCreateSerializer,
    UserListSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()
logger = logging.getLogger("apps.users")


class UserViewSet(ModelViewSet):
    """
    ViewSet complet pour la gestion des utilisateurs.

    - list/retrieve : admin, gestionnaire
    - create/update/delete : admin uniquement
    - me : tout utilisateur authentifié (son propre profil)
    """

    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, HasModuleAccess("user")]

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserAdminUpdateSerializer
        if self.action == "me":
            return UserSerializer
        if self.action == "change_password":
            return ChangePasswordSerializer
        return UserSerializer

    def get_permissions(self):
        """Permissions différenciées par action."""
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasModuleAccess("user")()]
        if self.action == "me":
            return [IsAuthenticated()]
        if self.action == "change_password":
            return [IsAuthenticated()]
        return [IsAuthenticated(), HasModuleAccess("user")()]

    def get_queryset(self):
        queryset = User.objects.all()
        # Filtres via query params
        role = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")

        if role:
            queryset = queryset.filter(role=role)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search)
                | models.Q(last_name__icontains=search)
                | models.Q(email__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        logger.info(
            "User created", extra={"created_user": str(user.id), "by": str(self.request.user.id)}
        )

    def perform_destroy(self, instance):
        """Désactivation au lieu de suppression physique."""
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        logger.warning(
            "User deactivated", extra={"user_id": str(instance.id), "by": str(self.request.user.id)}
        )

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """Profil de l'utilisateur connecté."""
        if request.method == "GET":
            serializer = UserSerializer(request.user, context={"request": request})
            return Response({"status": "success", "data": serializer.data})

        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"status": "success", "data": serializer.data})

    @action(detail=False, methods=["post"], url_path="change-password")
    def change_password(self, request):
        """Changement de mot de passe."""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.must_change_password = False
        request.user.password_changed_at = timezone.now()
        request.user.save(
            update_fields=["password", "must_change_password", "password_changed_at", "updated_at"]
        )

        logger.info("Password changed", extra={"user_id": str(request.user.id)})
        return Response({"status": "success", "message": "Mot de passe modifié avec succès."})

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        """Activer / désactiver un utilisateur."""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active", "updated_at"])
        status_label = "activé" if user.is_active else "désactivé"
        logger.warning(
            f"User {status_label}", extra={"user_id": str(user.id), "by": str(request.user.id)}
        )
        return Response(
            {
                "status": "success",
                "message": f"Utilisateur {status_label}.",
                "data": {"is_active": user.is_active},
            }
        )
