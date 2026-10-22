"""
============================================================
USERS SERIALIZERS
============================================================
"""

from rest_framework import serializers

from core.serializers import BaseModelSerializer
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone

from .models import User


class UserSerializer(BaseModelSerializer):
    """Serializer complet — lecture (admin, profil)."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "avatar",
            "role",
            "role_display",
            "is_active",
            "must_change_password",
            "password_changed_at",
            "last_login",
            "last_login_ip",
            "date_joined",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "last_login",
            "last_login_ip",
            "password_changed_at",
            "date_joined",
            "created_at",
            "updated_at",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "last_login", "date_joined"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    """Création d'un utilisateur (admin uniquement)."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "password",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.must_change_password = True  # Force le changement à la 1ère connexion
        # password_changed_at volontairement laissé à None : la création n'est
        # pas un « changement » de mot de passe (voir change-password / reset admin).
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Mise à jour du profil (soi-même ou admin)."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "avatar", "preferences"]


class UserAdminUpdateSerializer(serializers.ModelSerializer):
    """Mise à jour complète par un admin.
    Le mot de passe est optionnel — s'il est vide, il n'est pas modifié.
    """

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_active",
            "must_change_password",
            "password",
        ]

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
            # Reset admin : le changement forcé (1ère connexion) est CONSERVÉ,
            # seul l'horodatage du dernier changement est renseigné.
            instance.must_change_password = True
            instance.password_changed_at = timezone.now()
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Changement de mot de passe."""

    old_password = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Les mots de passe ne correspondent pas."}
            )
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value
