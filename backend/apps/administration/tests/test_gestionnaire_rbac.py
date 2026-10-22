"""
Tests RBAC — Vérifie que les permissions par rôle sont correctement
appliquées via le système DB-backed (HasModuleAccess / _get_user_permissions).

Aligné sur la feuille de route « Application des œuvres sociales » :
  - Gestionnaire : prestations, employés, ayants droit, prise en charge,
    conventions, finance (lecture), rapports, ET statistiques/analytiques,
    ayants droit (dependent.*), factures (invoice.*) — grants 0010.
  - Comptable : finance, paiements, budgets, factures (validation), rapports.
  - Consultation/Direction : lecture seule + statistiques.
  - Admin : bypass complet.

NB : les migrations de seed (0004/0008/0009/0010) s'exécutent dans la base
de test — les assertions reposent donc sur l'état seedé ET sur les grants
ajoutés par la migration 0010.
"""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

pytestmark = [pytest.mark.django_db]


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@t.dz", password="P@ss123!",
        first_name="Admin", last_name="Test", role="admin",
    )


@pytest.fixture
def gestionnaire_user(db):
    return User.objects.create_user(
        email="gestionnaire@t.dz", password="P@ss123!",
        first_name="Gest", last_name="Test", role="gestionnaire",
    )


@pytest.fixture
def comptable_user(db):
    return User.objects.create_user(
        email="comptable@t.dz", password="P@ss123!",
        first_name="Comp", last_name="Test", role="comptable",
    )


def make_request(user, method="GET"):
    return type("req", (), {"user": user, "method": method})()


def has_module_access(user, module):
    """HasModuleAccess est une factory retournant une CLASSE de permission :
    il faut l'instancier avant de l'appeler."""
    from core.permissions import HasModuleAccess
    return HasModuleAccess(module)().has_permission(make_request(user), None)


def seed_role_permission(role_slug, permission_codename, permission_module):
    """Crée une entrée RolePermission dans la DB pour les tests."""
    from django.apps import apps
    Role = apps.get_model("administration", "Role")
    Permission = apps.get_model("administration", "Permission")
    RolePermission = apps.get_model("administration", "RolePermission")

    role, _ = Role.objects.get_or_create(
        slug=role_slug,
        defaults={"name": role_slug, "is_system": False},
    )
    perm, _ = Permission.objects.get_or_create(
        codename=permission_codename,
        defaults={"name": permission_codename, "module": permission_module},
    )
    RolePermission.objects.get_or_create(role=role, permission=perm)


# ═══════════════════════════════════════════════════════════
# HasModuleAccess — comportement de base
# ═══════════════════════════════════════════════════════════

class TestHasModuleAccess:

    def test_deny_when_no_permission(self, gestionnaire_user):
        """Module sans permission assignée au rôle → refusé."""
        assert has_module_access(gestionnaire_user, "assistance") is False

    def test_allow_when_permission_granted(self, gestionnaire_user):
        """Permission ajoutée (assistance.view) → accès autorisé."""
        seed_role_permission("gestionnaire", "assistance.view", "assistance")
        assert has_module_access(gestionnaire_user, "assistance") is True

    def test_admin_always_passes(self, admin_user):
        """Admin passe toujours, même sans RolePermission explicite."""
        assert has_module_access(admin_user, "assistance") is True


# ═══════════════════════════════════════════════════════════
# Modules autorisés pour le Gestionnaire (feuille de route)
# ═══════════════════════════════════════════════════════════

class TestGestionnaireAllowedModules:

    @pytest.mark.parametrize("module", [
        "employees", "beneficiaries", "benefits", "loans",
        "medical_coverage", "conventions", "finance", "reports",
        # Grants 0010 — feuille de route
        "analytics", "dependent", "invoice", "dashboard",
    ])
    def test_can_access_module(self, gestionnaire_user, module):
        assert has_module_access(gestionnaire_user, module) is True, (
            f"Le Gestionnaire doit accéder au module {module}"
        )

    def test_provider_invoices_staff(self, gestionnaire_user):
        """Les factures prestataires restent couvertes par IsStaff."""
        from core.permissions import IsStaff
        perm = IsStaff()
        assert perm.has_permission(make_request(gestionnaire_user), None) is True


# ═══════════════════════════════════════════════════════════
# Modules restreints pour le Gestionnaire
# ═══════════════════════════════════════════════════════════

class TestGestionnaireRestrictedModules:

    def test_cannot_access_admin(self, gestionnaire_user):
        """L'administration reste réservée aux admins."""
        assert has_module_access(gestionnaire_user, "admin") is False

    def test_cannot_access_assistance(self, gestionnaire_user):
        """assistance.* (orpheline) n'est pas accordée au gestionnaire."""
        assert has_module_access(gestionnaire_user, "assistance") is False


# ═══════════════════════════════════════════════════════════
# Comptable — périmètre feuille de route
# ═══════════════════════════════════════════════════════════

class TestComptableModules:

    def test_can_access_finance(self, comptable_user):
        assert has_module_access(comptable_user, "finance") is True

    def test_can_access_invoices(self, comptable_user):
        """Factures : accès module + permission de validation."""
        assert has_module_access(comptable_user, "invoice") is True
        from apps.authentication.serializers import _get_user_permissions
        perms = _get_user_permissions(comptable_user)
        assert "invoice.validate" in perms
        assert "finance.process_payment" in perms

    def test_cannot_access_admin(self, comptable_user):
        assert has_module_access(comptable_user, "admin") is False


# ═══════════════════════════════════════════════════════════
# Mutation des permissions → effet immédiat
# ═══════════════════════════════════════════════════════════

class TestPermissionMutation:
    """Vérifie que l'ajout/retrait de permissions modifie l'accès."""

    def test_add_permission_grants_access(self, gestionnaire_user):
        """Ajout d'une permission assistance.view → autorise l'accès."""
        assert has_module_access(gestionnaire_user, "assistance") is False
        seed_role_permission("gestionnaire", "assistance.view", "assistance")
        assert has_module_access(gestionnaire_user, "assistance") is True

    def test_grant_and_revoke(self, gestionnaire_user):
        """Ajout puis retrait d'une permission → refusé."""
        from django.apps import apps
        RolePermission = apps.get_model("administration", "RolePermission")
        Permission = apps.get_model("administration", "Permission")
        Role = apps.get_model("administration", "Role")

        seed_role_permission("gestionnaire", "assistance.view", "assistance")
        assert has_module_access(gestionnaire_user, "assistance") is True

        # Retirer la permission
        r = Role.objects.get(slug="gestionnaire")
        p = Permission.objects.get(codename="assistance.view")
        RolePermission.objects.filter(role=r, permission=p).delete()

        # Plus aucune permission assistance → accès refusé
        assert has_module_access(gestionnaire_user, "assistance") is False


# ═══════════════════════════════════════════════════════════
# Admin bypass — admin a toujours accès
# ═══════════════════════════════════════════════════════════

class TestAdminAccess:

    def test_admin_can_access_all_modules(self, admin_user):
        for module in ["employees", "beneficiaries", "benefits", "loans",
                       "finance", "conventions", "medical_coverage", "reports",
                       "analytics", "statistics", "dependent", "invoice",
                       "assistance", "admin"]:
            assert has_module_access(admin_user, module) is True, (
                f"Admin should access {module}"
            )


# ═══════════════════════════════════════════════════════════
# _get_user_permissions — permissions dans login/JWT
# ═══════════════════════════════════════════════════════════

class TestUserPermissions:

    def test_gestionnaire_has_roadmap_permissions(self, gestionnaire_user):
        """Le Gestionnaire reçoit les grants 0010 dans son payload."""
        from apps.authentication.serializers import _get_user_permissions
        perms = _get_user_permissions(gestionnaire_user)
        for codename in ["analytics.view", "analytics.decisions",
                         "dependent.view", "invoice.view", "invoice.create",
                         "dashboard.view", "coverage.create",
                         "benefit.create", "loan.create"]:
            assert codename in perms, f"{codename} doit être présent pour le gestionnaire"

    def test_returns_assigned_permissions(self, gestionnaire_user):
        """RolePermission assignée → codename présent."""
        seed_role_permission("gestionnaire", "assistance.view", "assistance")
        from apps.authentication.serializers import _get_user_permissions
        perms = _get_user_permissions(gestionnaire_user)
        assert "assistance.view" in perms

    def test_admin_has_all_permissions(self, admin_user):
        """Admin bypass retourne la liste des codenames existants."""
        from apps.authentication.serializers import _get_user_permissions
        perms = _get_user_permissions(admin_user)
        assert isinstance(perms, list)
        assert len(perms) > 0

    def test_permissions_change_after_mutation(self, gestionnaire_user):
        """Ajout de permission → mise à jour de la liste."""
        from apps.authentication.serializers import _get_user_permissions
        assert "assistance.view" not in _get_user_permissions(gestionnaire_user)
        seed_role_permission("gestionnaire", "assistance.view", "assistance")
        assert "assistance.view" in _get_user_permissions(gestionnaire_user)
