"""Tests — Phase 1 des corrections de l'audit « Prise en charge ».

C1. Les transitions de facture (validate / pay / cancel) sont réservées aux
    rôles autorisés (feuille de route : validation = Comptable/Validateur) :
      - validate / cancel  -> permission `invoice.validate`
      - pay                -> permission `finance.process_payment`
    Un Gestionnaire (sans ces permissions) reçoit 403.
C3. Un bon imprimé (workflow_state = printed) reste facturable : il apparaît
    dans l'endpoint available_vouchers (avant : seuls les bons `validated`).
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.employees.models import Employee
from apps.departments.models import Department
from apps.conventions.models import Partner
from apps.medical_coverage.models import (
    MedicalCoverageType, MedicalCoverageRequest,
)
from apps.medical_coverage.services import MedicalCoverageRequestService
from apps.invoicing.models import ProviderInvoice

User = get_user_model()


class InvoiceRbacTransitionTests(TestCase):
    """C1 — Gardes de rôle sur validate / pay / cancel."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.dz", password="test123",
            first_name="Ad", last_name="Min", role="admin",
        )
        self.manager = User.objects.create_user(
            email="gestionnaire@test.dz", password="test123",
            first_name="Gest", last_name="Test", role="gestionnaire",
        )
        self.comptable = User.objects.create_user(
            email="comptable@test.dz", password="test123",
            first_name="Comp", last_name="Table", role="comptable",
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
        self.analysis_type, _ = MedicalCoverageType.objects.get_or_create(
            code="analysis", defaults={
                "name": "Centre d'analyse",
                "waiting_period_months": 3, "max_per_year": 4,
            },
        )
        self.partner = Partner.objects.create(
            code="PRT-TEST", name="Lab Test", category="medical_analysis_lab",
        )

    def _client_for(self, user):
        client = APIClient()
        token = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        return client

    def _make_invoice(self, month=8, status="draft"):
        # Le middleware tenant résout le tenant par défaut ; les lignes de test
        # doivent lui être rattachées pour rester visibles des endpoints
        # (comportement attendu de l'architecture multi-tenant).
        from shared.tenant.models import Tenant
        tenant = Tenant.objects.filter(slug="default").first()
        return ProviderInvoice.objects.create(
            partner=self.partner,
            category="medical_analysis_lab",
            month=month,
            year=2026,
            status=status,
            tenant=tenant,
        )

    def _transition(self, user, invoice, action):
        return self._client_for(user).post(
            f"/api/v1/invoicing/invoices/{invoice.id}/transition/",
            {"action": action},
            format="json",
        )

    # ── validate ─────────────────────────────────────────────
    def test_gestionnaire_cannot_validate_invoice(self):
        invoice = self._make_invoice()
        resp = self._transition(self.manager, invoice, "validate")
        self.assertEqual(resp.status_code, 403)

    def test_comptable_can_validate_invoice(self):
        invoice = self._make_invoice()
        resp = self._transition(self.comptable, invoice, "validate")
        self.assertEqual(resp.status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "validated")

    def test_admin_can_validate_invoice(self):
        invoice = self._make_invoice()
        resp = self._transition(self.admin, invoice, "validate")
        self.assertEqual(resp.status_code, 200)

    # ── pay ──────────────────────────────────────────────────
    def test_gestionnaire_cannot_pay_invoice(self):
        invoice = self._make_invoice(status="validated")
        resp = self._transition(self.manager, invoice, "pay")
        self.assertEqual(resp.status_code, 403)

    def test_comptable_can_pay_invoice(self):
        invoice = self._make_invoice(status="validated")
        resp = self._transition(self.comptable, invoice, "pay")
        self.assertEqual(resp.status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "paid")

    # ── cancel ───────────────────────────────────────────────
    def test_gestionnaire_cannot_cancel_invoice(self):
        invoice = self._make_invoice()
        resp = self._transition(self.manager, invoice, "cancel")
        self.assertEqual(resp.status_code, 403)

    def test_comptable_can_cancel_invoice(self):
        invoice = self._make_invoice()
        resp = self._transition(self.comptable, invoice, "cancel")
        self.assertEqual(resp.status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "cancelled")


class PrintedVoucherAvailableForInvoicingTests(TestCase):
    """C3 — Un bon imprimé reste facturable (available_vouchers)."""

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

    def test_printed_request_is_available_for_invoicing(self):
        request_obj = self.service.create(
            {
                "category": "analysis",
                "partner": self.partner,
                "employee": self.employee,
                "coverage_date": date.today(),
                "observation": "Test C3",
            },
            self.manager,
        )
        from shared.tenant.models import Tenant
        tenant = Tenant.objects.filter(slug="default").first()
        MedicalCoverageRequest.objects.filter(id=request_obj.id).update(tenant=tenant)
        request_obj.refresh_from_db()
        self.assertEqual(request_obj.workflow_state, "validated")

        # L'imprimer (transition validated -> printed, autorisée gestionnaire)
        self.service.transition(request_obj.id, "printed", self.manager)
        request_obj.refresh_from_db()
        self.assertEqual(request_obj.workflow_state, "printed")

        resp = self._client_for(self.manager).get(
            "/api/v1/invoicing/invoices/available_vouchers/",
            {
                "partner_id": str(self.partner.id),
                "month": date.today().month,
                "year": date.today().year,
            },
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["data"]]
        self.assertIn(str(request_obj.id), ids)

    def test_validated_request_is_available_for_invoicing(self):
        request_obj = self.service.create(
            {
                "category": "analysis",
                "partner": self.partner,
                "employee": self.employee,
                "coverage_date": date.today(),
                "observation": "Test C3b",
            },
            self.manager,
        )
        from shared.tenant.models import Tenant
        tenant = Tenant.objects.filter(slug="default").first()
        MedicalCoverageRequest.objects.filter(id=request_obj.id).update(tenant=tenant)
        resp = self._client_for(self.manager).get(
            "/api/v1/invoicing/invoices/available_vouchers/",
            {
                "partner_id": str(self.partner.id),
                "month": date.today().month,
                "year": date.today().year,
            },
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["data"]]
        self.assertIn(str(request_obj.id), ids)
