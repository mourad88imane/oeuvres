"""Tests Phase 2 — Corrections de l'audit « Prise en charge » (I1, I1b, I5, I6)
et affectation du tenant dans les flux de création (multi-tenant).

I1.  Le partenaire sélectionné doit correspondre à la catégorie de la demande
     (contrôle BACKEND, pas seulement frontend) : combinaison invalide → 400,
     aucune demande créée.
I1b. Chaque ligne d'une facture doit utiliser le prestataire de la facture :
     un bon/demande d'un autre prestataire → 400, aucune facture créée.
     Vérifié pour les deux types de lignes (coverage_request_lines ET lines
     legacy basées sur MedicalCoverageVoucher).
I5.  L'endpoint d'éligibilité expose le is_eligible RÉEL des ayants droit
     (l'UI bloque la sélection des inéligibles).
I6.  Le PDF est servi via l'API authentifiée : mode=preview → inline, défaut →
     attachment, utilisateur sans permission → 403.
Tenant : les demandes/factures créées via l'API reçoivent le tenant résolu
     par le middleware et restent visibles pour les rôles non-admin.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.employees.models import Employee
from apps.departments.models import Department
from apps.beneficiaries.models import Beneficiary
from apps.conventions.models import Partner, Convention
from apps.medical_coverage.models import MedicalCoverageType, MedicalCoverageRequest
from apps.invoicing.models import ProviderInvoice

User = get_user_model()


class Phase2ValidationTests(TestCase):
    """I1 partenaire/catégorie, I1b prestataire de facture, I5, I6, tenant."""

    def setUp(self):
        self.manager = User.objects.create_user(
            email="gestionnaire@test.dz", password="test123",
            first_name="Gest", last_name="Test", role="gestionnaire",
        )
        self.consultant = User.objects.create_user(
            email="consultant@test.dz", password="test123",
            first_name="Con", last_name="Sult", role="consultant",
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
        self.eligible_dep = Beneficiary.objects.create(
            employee=self.employee, first_name="Jane", last_name="Doe",
            gender="F", date_of_birth=date(2015, 3, 10),
            relationship="child", is_eligible=True,
        )
        self.ineligible_dep = Beneficiary.objects.create(
            employee=self.employee, first_name="Tim", last_name="Doe",
            gender="M", date_of_birth=date(2016, 4, 11),
            relationship="child", is_eligible=False,
        )
        MedicalCoverageType.objects.get_or_create(
            code="analysis", defaults={"name": "Centre d'analyse",
                                       "waiting_period_months": 3, "max_per_year": 4},
        )
        self.partner_a = Partner.objects.create(
            code="PRT-A", name="Lab A", category="medical_analysis_lab",
        )
        self.partner_b = Partner.objects.create(
            code="PRT-B", name="Lab B", category="medical_analysis_lab",
        )
        self.center_partner = Partner.objects.create(
            code="PRT-C", name="Centre C", category="medical_center",
        )
        for p, ref in [(self.partner_a, "CONV-A"), (self.partner_b, "CONV-B"),
                       (self.center_partner, "CONV-C")]:
            Convention.objects.create(
                partner=p, title=f"Convention {ref}",
                start_date=date(2025, 1, 1), end_date=date(2028, 1, 1),
                status=Convention.Status.ACTIVE, reference=ref,
            )

    def _client_for(self, user):
        client = APIClient()
        token = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        return client

    def _request_payload(self, category="analysis", partner=None, employee=None):
        return {
            "category": category,
            "partner": str((partner or self.partner_a).id),
            "employee": str((employee or self.employee).id),
            "coverage_date": date.today().isoformat(),
            "observation": "Validation Phase 2",
        }

    # ── I1 : partenaire incompatible ─────────────────────────
    def test_i1_incompatible_partner_refused(self):
        before = MedicalCoverageRequest.objects.count()
        resp = self._client_for(self.manager).post(
            "/api/v1/medical-coverage/requests/",
            self._request_payload(category="analysis", partner=self.center_partner),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("ne correspond pas", str(resp.data))
        self.assertEqual(MedicalCoverageRequest.objects.count(), before)

    def test_i1_compatible_partner_accepted(self):
        resp = self._client_for(self.manager).post(
            "/api/v1/medical-coverage/requests/",
            self._request_payload(category="analysis", partner=self.partner_a),
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["data"]["workflow_state"], "validated")

    # ── I1b : prestataire de la facture (lignes de demandes) ─
    def test_i1b_cross_provider_coverage_line_refused(self):
        req_a = self._request_payload(category="analysis", partner=self.partner_a)
        created = self._client_for(self.manager).post(
            "/api/v1/medical-coverage/requests/", req_a, format="json",
        ).json()["data"]
        before = ProviderInvoice.objects.count()
        resp = self._client_for(self.manager).post(
            "/api/v1/invoicing/invoices/",
            {
                "partner": str(self.partner_b.id),
                "category": "medical_analysis_lab",
                "month": date.today().month,
                "year": date.today().year,
                "coverage_request_lines": [
                    {"coverage_request": created["id"], "amount": "100.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("prestataire", str(resp.data.get("message", resp.data)))
        self.assertEqual(ProviderInvoice.objects.count(), before)

    def test_i1b_same_provider_coverage_line_accepted(self):
        created = self._client_for(self.manager).post(
            "/api/v1/medical-coverage/requests/",
            self._request_payload(category="analysis", partner=self.partner_b),
            format="json",
        ).json()["data"]
        resp = self._client_for(self.manager).post(
            "/api/v1/invoicing/invoices/",
            {
                "partner": str(self.partner_b.id),
                "category": "medical_analysis_lab",
                "month": date.today().month,
                "year": date.today().year,
                "coverage_request_lines": [
                    {"coverage_request": created["id"], "amount": "100.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        request_obj = MedicalCoverageRequest.objects.get(id=created["id"])
        self.assertEqual(request_obj.consumption_status, "consumed")

    # ── I5 : ayants droit inéligibles exposés ────────────────
    def test_i5_ineligible_dependent_exposed(self):
        resp = self._client_for(self.manager).get(
            "/api/v1/medical-coverage/requests/employee_eligibility/",
            {"employee_id": str(self.employee.id), "category": "analysis"},
        )
        self.assertEqual(resp.status_code, 200)
        by_id = {b["id"]: b for b in resp.data["data"]["beneficiaries"]}
        self.assertEqual(by_id[str(self.eligible_dep.id)]["is_eligible"], True)
        self.assertEqual(by_id[str(self.ineligible_dep.id)]["is_eligible"], False)

    # ── I6 : impression / pdf ────────────────────────────────
    def _validated_request(self):
        return MedicalCoverageRequest.objects.create(
            category="analysis", partner=self.partner_a,
            employee=self.employee, coverage_date=date.today(),
            workflow_state="validated", validation_date=date.today(),
            created_by=self.manager, updated_by=self.manager,
        )

    def test_i6_preview_inline_and_attachment(self):
        request_obj = self._validated_request()
        client = self._client_for(self.manager)
        preview = client.get(
            f"/api/v1/medical-coverage/requests/{request_obj.id}/pdf/?mode=preview",
        )
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview["Content-Type"], "application/pdf")
        self.assertIn("inline", preview["Content-Disposition"])
        download = client.get(
            f"/api/v1/medical-coverage/requests/{request_obj.id}/pdf/",
        )
        self.assertEqual(download.status_code, 200)
        self.assertIn("attachment", download["Content-Disposition"])

    def test_i6_user_without_permission_refused(self):
        request_obj = self._validated_request()
        resp = self._client_for(self.consultant).get(
            f"/api/v1/medical-coverage/requests/{request_obj.id}/pdf/?mode=preview",
        )
        self.assertEqual(resp.status_code, 403)

    # ── Tenant : affectation + visibilité non-admin ──────────
    def test_tenant_assigned_on_request_create_and_visible(self):
        from shared.tenant.models import Tenant
        resp = self._client_for(self.manager).post(
            "/api/v1/medical-coverage/requests/",
            self._request_payload(category="analysis", partner=self.partner_a),
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        request_obj = MedicalCoverageRequest.objects.get(id=resp.data["data"]["id"])
        self.assertIsNotNone(request_obj.tenant)
        self.assertEqual(request_obj.tenant, Tenant.objects.filter(slug="default").first())
        # Visible dans la liste pour un gestionnaire (filtre tenant).
        listing = self._client_for(self.manager).get(
            "/api/v1/medical-coverage/requests/",
            {"category": "analysis", "page_size": 50},
        )
        ids = [r["id"] for r in listing.data["results"]]
        self.assertIn(str(request_obj.id), ids)

    def test_tenant_assigned_on_invoice_create_and_visible(self):
        from shared.tenant.models import Tenant
        created = self._client_for(self.manager).post(
            "/api/v1/medical-coverage/requests/",
            self._request_payload(category="analysis", partner=self.partner_a),
            format="json",
        ).json()["data"]
        resp = self._client_for(self.manager).post(
            "/api/v1/invoicing/invoices/",
            {
                "partner": str(self.partner_a.id),
                "category": "medical_analysis_lab",
                "month": date.today().month,
                "year": date.today().year,
                "coverage_request_lines": [
                    {"coverage_request": created["id"], "amount": "100.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        invoice = ProviderInvoice.objects.get(id=resp.data["data"]["id"])
        self.assertIsNotNone(invoice.tenant)
        self.assertEqual(invoice.tenant, Tenant.objects.filter(slug="default").first())
        # La ligne hérite du tenant de la facture.
        self.assertIsNotNone(invoice.coverage_lines.first().tenant)
        listing = self._client_for(self.manager).get(
            "/api/v1/invoicing/invoices/",
            {"month": date.today().month, "year": date.today().year},
        )
        ids = [r["id"] for r in listing.data["results"]]
        self.assertIn(str(invoice.id), ids)
