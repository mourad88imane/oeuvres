"""Tests — Politique d'expiration de mot de passe.

Règle : au login, si password_changed_at est renseigné et plus vieux que
PASSWORD_EXPIRATION_DAYS jours (défaut 90), must_change_password est forcé à
True (persisté). Cas particuliers :
- password_changed_at NULL (compte hérité) -> jamais forcé ;
- PASSWORD_EXPIRATION_DAYS = 0 ou négatif -> politique désactivée ;
- mot de passe récent -> non forcé.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


class PasswordExpirationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="expire@test.dz",
            password="TempPass123!",
            first_name="Exp",
            last_name="Test",
            role="gestionnaire",
            must_change_password=False,
        )

    def _login(self):
        return self.client.post(
            reverse("auth:login"),
            {"email": "expire@test.dz", "password": "TempPass123!"},
            format="json",
        )

    def _set_changed_at(self, days_ago):
        self.user.password_changed_at = timezone.now() - timedelta(days=days_ago)
        self.user.save(update_fields=["password_changed_at"])

    def test_old_password_is_forced_at_login(self):
        """Mot de passe de 120 jours -> changement forcé et PERSISTÉ."""
        self._set_changed_at(120)
        resp = self._login()
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(resp.data["user"]["must_change_password"])
        self.assertEqual(resp.data["user"]["password_expires_in_days"], 0)
        self.assertEqual(resp.data["user"]["password_expiration_warning_days"], 15)
        self.user.refresh_from_db()
        self.assertTrue(self.user.must_change_password)

    def test_recent_password_not_forced(self):
        """LOIN de l'expiration : mot de passe de 10 jours -> non forcé,
        expire dans ~80 jours (> fenêtre d'avertissement de 15 jours)."""
        self._set_changed_at(10)
        resp = self._login()
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertFalse(resp.data["user"]["must_change_password"])
        self.assertGreaterEqual(resp.data["user"]["password_expires_in_days"], 79)
        self.assertGreater(
            resp.data["user"]["password_expires_in_days"],
            resp.data["user"]["password_expiration_warning_days"],
        )
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)

    def test_within_warning_period_not_forced(self):
        """DANS la fenêtre d'avertissement : mot de passe de 80 jours -> non
        forcé, mais expire dans ~10 jours (<= 15) : le payload le signale."""
        self._set_changed_at(80)
        resp = self._login()
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertFalse(resp.data["user"]["must_change_password"])
        self.assertLessEqual(resp.data["user"]["password_expires_in_days"], 10)
        self.assertGreater(resp.data["user"]["password_expires_in_days"], 0)
        self.assertEqual(resp.data["user"]["password_expiration_warning_days"], 15)
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)

    def test_legacy_null_password_changed_at_not_forced(self):
        """Compte hérité (NULL) -> jamais forcé, et password_expires_in_days=None."""
        self.assertIsNone(self.user.password_changed_at)
        resp = self._login()
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertFalse(resp.data["user"]["must_change_password"])
        self.assertIsNone(resp.data["user"]["password_expires_in_days"])
        self.assertEqual(resp.data["user"]["password_expiration_warning_days"], 15)

    @override_settings(PASSWORD_EXPIRATION_DAYS=0)
    def test_policy_disabled_does_not_force(self):
        """Politique désactivée (0) -> même un très vieux mot de passe n'est pas forcé,
        et password_expires_in_days=None."""
        self._set_changed_at(500)
        resp = self._login()
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertFalse(resp.data["user"]["must_change_password"])
        self.assertIsNone(resp.data["user"]["password_expires_in_days"])

    def test_is_password_expired_helper(self):
        """Helper du modèle : seuil exact + surcharge manuelle."""
        self._set_changed_at(95)
        self.assertTrue(self.user.is_password_expired())
        self.assertFalse(self.user.is_password_expired(max_age_days=100))
        self.assertFalse(self.user.is_password_expired(max_age_days=0))
