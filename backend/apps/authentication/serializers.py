"""
============================================================
AUTHENTICATION SERIALIZERS
============================================================
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


def _get_user_permissions(user):
    """Retourne la liste des codenames de permissions pour un utilisateur."""
    try:
        from django.apps import apps
        Permission = apps.get_model("administration", "Permission")
        RolePermission = apps.get_model("administration", "RolePermission")
        from core.permissions import _get_user_role_slugs
        slugs = _get_user_role_slugs(user)
        return list(
            Permission.objects.filter(
                role_permissions__role__slug__in=slugs,
                role_permissions__role__is_active=True,
            ).values_list("codename", flat=True).distinct()
        )
    except Exception:
        return []


def _password_expires_in_days(user):
    """Jours restants avant expiration du mot de passe, ou None si la
    politique est désactivée (PASSWORD_EXPIRATION_DAYS <= 0) ou si le compte
    est hérité (password_changed_at NULL — jamais suivi)."""
    days = settings.PASSWORD_EXPIRATION_DAYS or 0
    if days <= 0 or user.password_changed_at is None:
        return None
    elapsed_days = (timezone.now() - user.password_changed_at).total_seconds() / 86400
    return max(0, int(days - elapsed_days))


def build_user_payload(user, permissions=None):
    """
    Construit le dictionnaire « user » renvoyé au frontend, TOUJOURS à partir
    de l'état FRAIS en base (must_change_password, rôle, permissions...).

    Utilisé par le login ET par le token refresh — ne jamais reconstruire
    l'utilisateur depuis les claims JWT, qui sont périmés une fois le mot de
    passe changé (le token est émis avant le changement).
    """
    preferences = user.preferences or {}
    if permissions is None:
        permissions = _get_user_permissions(user)
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.get_full_name(),
        "role": user.role,
        "role_display": user.get_role_display(),
        "must_change_password": user.must_change_password,
        "password_changed_at": (
            user.password_changed_at.isoformat() if user.password_changed_at else None
        ),
        "password_expires_in_days": _password_expires_in_days(user),
        # Fenêtre d'avertissement, bornée par la durée d'expiration elle-même
        # (évite un bandeau permanent si warning > expiration par erreur).
        "password_expiration_warning_days": min(
            settings.PASSWORD_EXPIRATION_WARNING_DAYS or 0,
            settings.PASSWORD_EXPIRATION_DAYS or 0,
        )
        or 0,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "avatar": user.avatar.url if user.avatar else None,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "tenant_name": user.tenant.name if user.tenant else None,
        "preferences": {
            "language": preferences.get("language", "fr"),
            "theme": preferences.get("theme", "light"),
            "layout_direction": preferences.get("layout_direction", "ltr"),
        },
        "permissions": permissions,
    }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer JWT personnalisé.
    Ajoute des claims supplémentaires dans le token :
    role, full_name, email, permissions — disponibles côté frontend.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Claims personnalisés dans le payload JWT
        token["email"] = user.email
        token["full_name"] = user.get_full_name()
        token["role"] = user.role
        token["must_change_password"] = user.must_change_password
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        token["permissions"] = _get_user_permissions(user)

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Vérifier que le compte est actif
        if not self.user.is_active:
            raise serializers.ValidationError(
                {"detail": "Ce compte est désactivé. Contactez l'administrateur."}
            )

        # Politique d'expiration : mot de passe plus vieux que
        # PASSWORD_EXPIRATION_DAYS jours -> le changement est re-forcé au login.
        # La modification est PERSISTÉE (must_change_password=True) afin d'être
        # cohérente sur /auth/me/, le refresh et toutes les sessions.
        # save(update_fields=...) (et non QuerySet.update) : simple-history
        # enregistre la ligne d'audit, comme l'action change-password.
        # NB : le claim JWT a déjà été frappé par super().validate() avec
        # l'ancienne valeur — sans impact : le frontend utilise le payload
        # frais de la réponse et du refresh, jamais les claims.
        if self.user.is_password_expired():
            self.user.must_change_password = True
            self.user.save(update_fields=["must_change_password", "updated_at"])

        # Enrichir la réponse avec les infos utilisateur et permissions (fraîches)
        permissions = _get_user_permissions(self.user)
        data["user"] = build_user_payload(self.user, permissions=permissions)
        data["permissions"] = permissions

        return data


class TokenRefreshResponseSerializer(serializers.Serializer):
    """Format de réponse du refresh token."""

    access = serializers.CharField()
    user = serializers.DictField()


class LoginResponseSerializer(serializers.Serializer):
    """Format de réponse du login."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = serializers.DictField()


class LogoutSerializer(serializers.Serializer):
    """Blacklist du refresh token à la déconnexion."""

    refresh = serializers.CharField(required=True)

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except Exception:
            raise serializers.ValidationError("Token de rafraîchissement invalide ou expiré.")
        return value

    def save(self):
        self.token.blacklist()


class PasswordResetRequestSerializer(serializers.Serializer):
    """Demande de reset de mot de passe."""

    email = serializers.EmailField()

    def validate_email(self, value):
        # Ne pas révéler si l'email existe ou non (sécurité)
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirmation du reset avec token."""

    token = serializers.CharField()
    uid = serializers.CharField()
    new_password = serializers.CharField(min_length=10)
    confirm_password = serializers.CharField()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Les mots de passe ne correspondent pas."}
            )
        return attrs
