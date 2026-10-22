"""Tests ÉTAPE 1 — Workflow de création des demandes de prise en charge.

Scénarios couverts :
  A. Aucun bon dans les 3 derniers mois -> demande créée normalement.
  B. Bon trouvé dans les 3 derniers mois -> demande en attente de validation.
  C. Ayant droit sélectionné -> la vérification porte sur l'ayant droit.
  D. Demande en attente -> pas d'impression de bon définitif (403).
  E. Demande validée -> bon disponible pour impression (200).
"""

from datetime import date, timedelta

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model

from apps.employees.models import Employee
from apps.departments.models import Department
from apps.beneficiaries.models import Beneficiary
from apps.conventions.models import Partner, Convention
from apps.medical_coverage.models import (
    MedicalCoverageType, MedicalCoverageVoucher, MedicalCoverageRequest,
)
from apps.medical_coverage.services import MedicalCoverageRequestService

User = get_user_model()


class CoverageRequestWorkflowTests(TestCase):
    def setUp(self):
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
            nationality="Algérienne",
            job_title="Ingénieur", contract_type="cdi",
            status="active",
        )
        self.dependent = Beneficiary.objects.create(
            employee=self.employee,
            first_name="Jane", last_name="Doe",
            gender="F", date_of_birth=date(2015, 3, 10),
            relationship="child", is_eligible=True,
        )
        self.analysis_type, _ = MedicalCoverageType.objects.get_or_create(
            code="analysis", defaults={
                "name": "Centre d'analyse",
                "waiting_period_months": 3, "max_per_year": 4,
            },
        )
        self.partner = Partner.objects.create(
            code="PRT-TEST", name="Lab Test", category="medical_analysis_lab",
        )
        self.active_convention = Convention.objects.create(
            partner=self.partner,
            title="Convention test",
            start_date=date(2025, 1, 1),
            end_date=date(2028, 1, 1),
            status=Convention.Status.ACTIVE,
            reference="CONV-TEST-0001",
        )
        self.service = MedicalCoverageRequestService()

    # ── Aides ────────────────────────────────────────────────
    def _create_voucher(self, employee, request_date, beneficiary=None):
        return MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=employee,
            beneficiary=beneficiary,
            beneficiary_type="dependent" if beneficiary else "employee",
            request_date=request_date,
            workflow_state="consumed",
            created_by=self.manager,
            updated_by=self.manager,
        )

    def _create_request(self, employee, beneficiary=None, coverage_date=None):
        return self.service.create(
            {
                "category": "analysis",
                "partner": self.partner,
                "employee": employee,
                "beneficiary": beneficiary,
                "coverage_date": coverage_date or date.today(),
                "observation": "Test",
            },
            self.manager,
        )

    # ── SCÉNARIO A ───────────────────────────────────────────
    def test_scenario_a_no_bon_in_3_months_created_normally(self):
        request_obj = self._create_request(self.employee)
        self.assertEqual(request_obj.workflow_state, "validated")
        self.assertEqual(request_obj.employee, self.employee)
        self.assertIsNone(request_obj.beneficiary)

    # ── SCÉNARIO B ───────────────────────────────────────────
    def test_scenario_b_bon_found_in_3_months_pending_validation(self):
        recent = date.today() - timedelta(days=10)
        self._create_voucher(self.employee, recent)
        request_obj = self._create_request(self.employee)
        self.assertEqual(
            request_obj.workflow_state, "pending_manager_approval"
        )

    # ── SCÉNARIO C ───────────────────────────────────────────
    def test_scenario_c_check_scoped_to_dependent(self):
        # L'ayant droit a un bon récent, l'employé n'en a pas.
        recent = date.today() - timedelta(days=5)
        self._create_voucher(self.employee, recent, beneficiary=self.dependent)

        request_dep = self._create_request(
            self.employee, beneficiary=self.dependent
        )
        self.assertEqual(
            request_dep.workflow_state, "pending_manager_approval"
        )
        self.assertEqual(request_dep.beneficiary, self.dependent)

        # L'employé lui-même n'a pas de bon -> création normale.
        request_emp = self._create_request(self.employee)
        self.assertEqual(request_emp.workflow_state, "validated")
        self.assertIsNone(request_emp.beneficiary)

    def test_scenario_c_old_dependent_bon_does_not_block(self):
        old = date.today() - timedelta(days=200)
        self._create_voucher(self.employee, old, beneficiary=self.dependent)
        request_dep = self._create_request(
            self.employee, beneficiary=self.dependent
        )
        self.assertEqual(request_dep.workflow_state, "validated")

    # ── SCÉNARIO D / E (impression) ──────────────────────────
    def _auth_client(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        client = APIClient()
        token = RefreshToken.for_user(self.manager)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        return client

    @override_settings(
        DEBUG_TOOLBAR_CONFIG={"SHOW_TOOLBAR_CALLBACK": lambda request: False}
    )
    def test_scenario_d_pending_request_cannot_print(self):
        recent = date.today() - timedelta(days=10)
        self._create_voucher(self.employee, recent)
        request_obj = self._create_request(self.employee)
        self.assertEqual(request_obj.workflow_state, "pending_manager_approval")
        resp = self._auth_client().get(
            f"/api/v1/medical-coverage/requests/{request_obj.id}/pdf/"
        )
        self.assertEqual(resp.status_code, 403)

    @override_settings(
        DEBUG_TOOLBAR_CONFIG={"SHOW_TOOLBAR_CALLBACK": lambda request: False}
    )
    def test_scenario_e_validated_request_can_print(self):
        request_obj = self._create_request(self.employee)
        self.assertEqual(request_obj.workflow_state, "validated")
        resp = self._auth_client().get(
            f"/api/v1/medical-coverage/requests/{request_obj.id}/pdf/"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "application/pdf")
