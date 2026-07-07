"""
============================================================
PERMISSIONS RBAC — Système de permissions par rôle
============================================================
- Supporte les rôles legacy (User.role char field) + nouveaux rôles DB
- Validation uniquement backend (jamais frontend)
- Utilise django.apps pour éviter les imports circulaires
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

# ── Constantes des rôles (legacy string) ──────────────────


class RoleSlug:
    ADMIN = "admin"
    GESTIONNAIRE = "gestionnaire"
    COMPTABLE = "comptable"
    CONSULTANT = "consultant"
    SOCIAL_AGENT = "social_agent"
    DEPARTMENT_MANAGER = "department_manager"
    COMMITTEE_MEMBER = "committee_member"
    DIRECTOR = "director"

    ALL = [
        ADMIN, GESTIONNAIRE, COMPTABLE, CONSULTANT,
        SOCIAL_AGENT, DEPARTMENT_MANAGER, COMMITTEE_MEMBER, DIRECTOR,
    ]
    STAFF = [
        ADMIN, GESTIONNAIRE, COMPTABLE,
        SOCIAL_AGENT, DEPARTMENT_MANAGER, DIRECTOR,
    ]


# ── Helpers RBAC ──────────────────────────────────────────


def _get_user_role_slugs(user):
    """Retourne l'ensemble des slugs de rôles pour un utilisateur."""
    if hasattr(user, "_role_slugs_cache"):
        return user._role_slugs_cache
    slugs = {user.role}
    try:
        from django.apps import apps
        UserRoleAssignment = apps.get_model("administration", "UserRoleAssignment")
        extra = UserRoleAssignment.objects.filter(
            user=user, is_active=True, role__is_active=True,
        ).values_list("role__slug", flat=True)
        slugs.update(extra)
    except Exception:
        pass
    user._role_slugs_cache = slugs
    return slugs


def _has_permission_db(user, codename: str) -> bool:
    """Vérifie une permission via les modèles RBAC en DB."""
    try:
        from django.apps import apps
        RolePermission = apps.get_model("administration", "RolePermission")
        slugs = _get_user_role_slugs(user)
        return RolePermission.objects.filter(
            role__slug__in=slugs,
            permission__codename=codename,
            role__is_active=True,
        ).exists()
    except Exception:
        return False


def user_has_permission(user, codename: str) -> bool:
    """
    Vérifie si un utilisateur possède une permission spécifique.
    - Admin/superuser → True
    - Sinon consulte RolePermission en DB

    Fonction publique utilisée par les services métier.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_admin", False) or getattr(user, "is_superuser", False):
        return True
    return _has_permission_db(user, codename)


def user_has_roles(user, *role_slugs: str) -> bool:
    """
    Vérifie si l'utilisateur a au moins un des rôles donnés.
    Vérifie User.role (legacy) ET UserRoleAssignment (DB).
    """
    if not user or not user.is_authenticated:
        return False
    if user.role in role_slugs:
        return True
    try:
        from django.apps import apps
        UserRoleAssignment = apps.get_model("administration", "UserRoleAssignment")
        return UserRoleAssignment.objects.filter(
            user=user, role__slug__in=role_slugs,
            is_active=True, role__is_active=True,
        ).exists()
    except Exception:
        return False


def user_can_transition(user, app_label: str, model_name: str,
                        from_state: str, to_state: str) -> bool:
    """
    Vérifie si un utilisateur peut effectuer une transition workflow.
    Consulte WorkflowPermission en DB.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_admin", False):
        return True
    try:
        from django.apps import apps
        WorkflowPermission = apps.get_model("administration", "WorkflowPermission")
        slugs = _get_user_role_slugs(user)
        return WorkflowPermission.objects.filter(
            app_label=app_label, model_name=model_name,
            from_state=from_state, to_state=to_state,
            role__slug__in=slugs, role__is_active=True,
        ).exists()
    except Exception:
        return False


# ── Permissions de base par rôle (legacy string) ─────────


class IsAdmin(BasePermission):
    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.ADMIN


class IsGestionnaire(BasePermission):
    message = "Accès réservé aux gestionnaires."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.GESTIONNAIRE


class IsComptable(BasePermission):
    message = "Accès réservé aux comptables."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.COMPTABLE


class IsConsultant(BasePermission):
    message = "Accès réservé aux consultants."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.CONSULTANT


class IsSocialAgent(BasePermission):
    message = "Accès réservé aux agents sociaux."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.SOCIAL_AGENT


class IsDepartmentManager(BasePermission):
    message = "Accès réservé aux chefs de service."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.DEPARTMENT_MANAGER


class IsCommitteeMember(BasePermission):
    message = "Accès réservé aux membres de commission."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.COMMITTEE_MEMBER


class IsDirector(BasePermission):
    message = "Accès réservé au directeur."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleSlug.DIRECTOR


# ── Permissions combinées (legacy) ───────────────────────


class IsAdminOrGestionnaire(BasePermission):
    message = "Accès réservé aux administrateurs, gestionnaires, chefs de service et directeurs."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            RoleSlug.ADMIN, RoleSlug.GESTIONNAIRE,
            RoleSlug.DEPARTMENT_MANAGER, RoleSlug.DIRECTOR,
        ]


class IsAdminOrComptable(BasePermission):
    message = "Accès réservé aux administrateurs et comptables."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            RoleSlug.ADMIN, RoleSlug.COMPTABLE,
        ]


class IsStaff(BasePermission):
    message = "Accès réservé au personnel."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in RoleSlug.STAFF


# ── Permissions RBAC basées sur la DB ────────────────────


class HasPermission(BasePermission):
    """
    Vérifie que l'utilisateur a une permission spécifique via la DB.
    Usage: permission_classes = [HasPermission('benefit.approve')]

    Les admins/superusers passent toujours.
    """

    def __init__(self, codename: str = None):
        self.codename = codename
        super().__init__()

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if not self.codename:
            return True
        return user_has_permission(request.user, self.codename)


class HasRoles(BasePermission):
    """
    Vérifie que l'utilisateur a au moins un des rôles donnés (DB-backed).
    Usage: permission_classes = [HasRoles('admin', 'director')]
    """

    def __init__(self, *roles: str):
        self.roles = roles
        super().__init__()

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return user_has_roles(request.user, *self.roles)


# ── Permission mixte ─────────────────────────────────────


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == RoleSlug.ADMIN


# ── Permission sur l'objet ───────────────────────────────


class IsOwnerOrAdmin(BasePermission):
    message = "Vous ne pouvez accéder qu'à vos propres données."

    def has_object_permission(self, request, view, obj):
        if request.user.role == RoleSlug.ADMIN:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "created_by", None)
        return owner == request.user
