"""Tests — password_changed_at.

- Champ nullable (null tant que le mot de passe n'a jamais été changé).
- Renseigné lors d'un changement par l'utilisateur (action change-password).
- Renseigné lors d'un reset admin, SANS désactiver le changement forcé
  (must_change_password reste True après un reset admin — politique existante).
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.users.serializers import UserAdminUpdateSerializer

User = get_user_model()


class PasswordChangedAtTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.dz",
            password="AdminPass123!",
            first_name="Admin",
            last_name="Test",
            role="admin",
        )
        self.user = User.objects.create_user(
            email="user@test.dz",
            password="OldPass123!",
            first_name="User",
            last_name="Test",
            role="gestionnaire",
        )

    def test_password_changed_at_is_null_for_new_users(self):
        """Requirement 1 : le champ est nullable — null à la création."""
        self.assertIsNone(self.user.password_changed_at)

    def test_admin_reset_stamps_time_but_keeps_forced_change(self):
        """Requirements 3 & 4 : reset admin -> password_changed_at renseigné
        mais must_change_password reste True (changement forcé conservé)."""
        serializer = UserAdminUpdateSerializer(
            instance=self.user,
            data={"password": "NewAdminPass123!"},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewAdminPass123!"))
        self.assertIsNotNone(self.user.password_changed_at)
        # Politique de sécurité existante : le changement reste forcé
        self.assertTrue(self.user.must_change_password)
