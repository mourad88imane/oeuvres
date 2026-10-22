"""Tests d'authentification — le token refresh doit renvoyer l'état FRAIS.

Bug corrigé : après un changement de mot de passe réussi (must_change_password
passé à False en base), le frontend pouvait être redirigé à nouveau vers
/change-password car il reconstruisait l'utilisateur depuis les claims JWT
émis au login (périmés, must_change_password=True figé pendant toute la durée
de vie du refresh token : 7-30 jours).

Règle : le endpoint /auth/token/refresh/ renvoie désormais le profil
utilisateur relu en base, afin que le frontend ne dépende jamais des claims.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


class RefreshUserPayloadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="utilisateur@test.dz",
            password="TempPass123!",
            first_name="Test",
            last_name="User",
            role="gestionnaire",
        )

    def _login(self):
        resp = self.client.post(
            reverse("auth:login"),
            {"email": "utilisateur@test.dz", "password": "TempPass123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        return resp.data["access"], resp.data["refresh"], resp.data["user"]

    def test_login_response_reflects_db_flag(self):
        """Au login, must_change_password reflète l'état frais en base (True ici),
        et password_changed_at est exposé (None tant que jamais changé)."""
        _, _, user_payload = self._login()
        self.assertTrue(user_payload["must_change_password"])
        self.assertIsNone(user_payload["password_changed_at"])
        self.assertIsNotNone(user_payload["date_joined"])

    def test_refresh_returns_fresh_flag_after_password_change(self):
        """
        Scénario réel du bug :
        1. Login avec mot de passe temporaire (token émis, claim True)
        2. Changement de mot de passe réussi (base : False)
        3. Refresh du token -> le user renvoyé doit dire False, pas True.
        """
        access, refresh, _ = self._login()

        # 2. Changer le mot de passe (flag -> False en base)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = self.client.post(
            reverse("users:user-change-password"),
            {
                "old_password": "TempPass123!",
                "new_password": "NouveauMdp2026!",
                "confirm_password": "NouveauMdp2026!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)
        self.assertIsNotNone(self.user.password_changed_at)

        # 3. Refresh -> le payload user doit être frais (False), pas le claim True
        self.client.credentials()
        resp = self.client.post(
            reverse("auth:token_refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("user", resp.data)
        self.assertFalse(resp.data["user"]["must_change_password"])
        self.assertIsNotNone(resp.data["user"]["password_changed_at"])
        self.assertEqual(resp.data["user"]["email"], "utilisateur@test.dz")

    def test_refresh_user_deleted_returns_tokens_without_crashing(self):
        """Si l'utilisateur a été supprimé entre le login et le refresh, la
        réponse reste 200 (tokens) SANS payload user — pas de 500."""
        access, refresh, _ = self._login()
        self.user.delete()

        self.client.credentials()
        resp = self.client.post(
            reverse("auth:token_refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertNotIn("user", resp.data)
        self.assertIn("access", resp.data)
