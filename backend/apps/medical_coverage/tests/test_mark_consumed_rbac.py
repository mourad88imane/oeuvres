"""Tests — C2 : la consommation manuelle (mark_consumed) est réservée à l'admin.

Règle métier : un bon devient « Consommé » UNIQUEMENT lorsqu'il est réellement
ajouté à une facture prestataire. Le endpoint mark_consumed est un correctif
de données réservé à l'administration — un Gestionnaire reçoit 403.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.employees.models import Employee
from apps.departments.models import Department
from apps.conventions.models import Partner
from apps.medical_coverage.services import MedicalCoverageRequestService

User = get_user_model()


class MarkConsumedRbacTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.dz", password="test123",
            first_name="Ad", last_name="Min", role="admin",
        )
        self.manager = User.objects.create_user(
            email="gestionnaire@test.dz", password="test123",
            first_name="Gest", last_name="Test", role="gestionnaire",
        )
        self.dept = Department.objects.create(name="IT", code="IT")
        self.employee = Employee.objects.create(
            matricule="EMP001", first_name="John", last_name="Doe",
            department=self.dept, email_professional="john@test.dz",
            date_of_birth=date(1990, 5, 15),
            date_hired=date(2020, 1, 1),
            gender="M", marital_status="single",
            nationality="Algérienne", job_title="Ingénieur",
            contract_type="cdi", status="active",
        )
        self.partner = Partner.objects.create(
            code="PRT-TEST", name="Lab Test", category="medical_analysis_lab",
        )
        self.service = MedicalCoverageRequestService()

    def _client_for(self, user):
        client = APIClient()
        token = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        return client

    def _make_validated_request(self):
        return self.service.create(
            {
                "category": "analysis",
                "partner": self.partner,
                "employee": self.employee,
                "coverage_date": date.today(),
                "observation": "Test C2",
            },
            self.manager,
        )

    def test_gestionnaire_cannot_mark_consumed(self):
        request_obj = self._make_validated_request()
        resp = self._client_for(self.manager).post(
            f"/api/v1/medical-coverage/requests/{request_obj.id}/mark_consumed/",
        )
        self.assertEqual(resp.status_code, 403)
        request_obj.refresh_from_db()
        self.assertEqual(request_obj.consumption_status, "not_consumed")

    def test_admin_can_mark_consumed(self):
        request_obj = self._make_validated_request()
        resp = self._client_for(self.admin).post(
            f"/api/v1/medical-coverage/requests/{request_obj.id}/mark_consumed/",
        )
        self.assertEqual(resp.status_code, 200)
        request_obj.refresh_from_db()
        self.assertEqual(request_obj.consumption_status, "consumed")
        self.assertIsNotNone(request_obj.consumed_at)
