"""Tests — Règle métier : statut « Consommé » des bons ajoutés à une facture prestataire.

Un bon de prise en charge (ou une demande validée utilisée comme bon) devient
« Consommé » UNIQUEMENT lorsqu'il est réellement ajouté à une facture
prestataire (ligne sauvée). Le backend contrôle la transition et refuse
l'ajout d'un bon déjà consommé.

Scénarios :
  T1. Bon approuvé / non consommé + ajouté à une facture -> Consommé.
  T2. Facture créée sans le bon -> le bon reste Non consommé.
  T3. Seul le bon A est ajouté -> A Consommé, B Non consommé.
  T4. Bon déjà consommé -> tentative d'ajout à une autre facture -> rejet (message clair).
  T5. Bon retiré d'une facture brouillon éditable -> restauré à Non consommé.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.employees.models import Employee
from apps.departments.models import Department
from apps.conventions.models import Partner
from apps.medical_coverage.models import (
    MedicalCoverageType, MedicalCoverageRequest,
)
from apps.invoicing.models import (
    ProviderInvoice, InvoiceLine, InvoiceCoverageRequestLine, VoucherConsumption,
)

User = get_user_model()

CONSUMED_MSG = (
    "Ce bon de prise en charge a déjà été consommé et ne peut pas être "
    "ajouté à une autre facture."
)


class VoucherConsumptionRuleTests(TestCase):
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
        self.analysis_type, _ = MedicalCoverageType.objects.get_or_create(
            code="analysis", defaults={
                "name": "Centre d'analyse",
                "waiting_period_months": 3, "max_per_year": 4,
            },
        )
        self.partner = Partner.objects.create(
            code="PRT-TEST", name="Lab Test", category="medical_analysis_lab",
        )
        self.employee2 = Employee.objects.create(
            matricule="EMP002", first_name="Jane", last_name="Doe",
            department=self.dept, email_professional="jane@test.dz",
            date_of_birth=date(1992, 7, 20),
            date_hired=date(2021, 3, 1),
            gender="F", marital_status="single",
            nationality="Algérienne", job_title="Analyste",
            contract_type="cdi", status="active",
        )

    def _make_request(self, employee, number):
        return MedicalCoverageRequest.objects.create(
            request_number=number,
            category="analysis",
            partner=self.partner,
            employee=employee,
            coverage_date=date(2026, 8, 1),
            workflow_state="validated",
        )

    def _make_invoice(self, month=8):
        return ProviderInvoice.objects.create(
            partner=self.partner,
            category="medical_analysis_lab",
            month=month,
            year=2026,
        )

    # ── T1 : ajout du bon -> Consommé ─────────────────────────
    def test_t1_voucher_added_to_invoice_becomes_consumed(self):
        cr = self._make_request(self.employee, "PEC-2026-000100")
        invoice = self._make_invoice()

        line = InvoiceCoverageRequestLine.objects.create(
            invoice=invoice, coverage_request=cr, amount="5000.00",
        )
        invoice.consume_coverage_line(line, self.manager)

        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "consumed")
        self.assertEqual(cr.invoice_status, "invoiced")
        self.assertIsNotNone(cr.consumed_at)

    # ── T2 : facture sans le bon -> reste Non consommé ─────────
    def test_t2_invoice_without_voucher_leaves_it_not_consumed(self):
        cr = self._make_request(self.employee, "PEC-2026-000200")
        invoice = self._make_invoice()
        # Facture créée sans ligne pour ce bon
        invoice.update_total()

        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "not_consumed")
        self.assertEqual(cr.invoice_status, "not_invoiced")

    # ── T3 : seul le bon A est consommé ────────────────────────
    def test_t3_only_added_voucher_is_consumed(self):
        cr_a = self._make_request(self.employee, "PEC-2026-000300")
        cr_b = self._make_request(self.employee2, "PEC-2026-000301")
        invoice = self._make_invoice()

        line_a = InvoiceCoverageRequestLine.objects.create(
            invoice=invoice, coverage_request=cr_a, amount="3000.00",
        )
        invoice.consume_coverage_line(line_a, self.manager)

        cr_a.refresh_from_db()
        cr_b.refresh_from_db()
        self.assertEqual(cr_a.consumption_status, "consumed")
        self.assertEqual(cr_b.consumption_status, "not_consumed")
        self.assertEqual(cr_b.invoice_status, "not_invoiced")

    # ── T4 : ajout d'un bon déjà consommé -> rejet ─────────────
    def test_t4_consumed_voucher_cannot_be_added_to_another_invoice(self):
        cr = self._make_request(self.employee, "PEC-2026-000400")
        invoice1 = self._make_invoice(month=8)
        line1 = InvoiceCoverageRequestLine.objects.create(
            invoice=invoice1, coverage_request=cr, amount="4000.00",
        )
        invoice1.consume_coverage_line(line1, self.manager)
        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "consumed")

        # Tentative d'ajout à une autre facture -> doit être refusée
        invoice2 = self._make_invoice(month=9)
        self.assertTrue(invoice2.is_request_consumed_elsewhere(cr.id))

        from apps.invoicing.serializers import ProviderInvoiceCreateSerializer

        payload = {
            "partner": str(self.partner.id),
            "month": 10,
            "year": 2026,
            "coverage_request_lines": [
                {"coverage_request": str(cr.id), "amount": "4000.00"},
            ],
        }
        ser = ProviderInvoiceCreateSerializer(data=payload)
        self.assertFalse(ser.is_valid())
        self.assertIn("coverage_request_lines", ser.errors)
        self.assertIn(CONSUMED_MSG, str(ser.errors["coverage_request_lines"]))

    # ── T5 : retrait d'une facture brouillon -> Non consommé ───
    def test_t5_removing_voucher_from_editable_invoice_restores_status(self):
        cr = self._make_request(self.employee, "PEC-2026-000500")
        invoice = self._make_invoice()
        line = InvoiceCoverageRequestLine.objects.create(
            invoice=invoice, coverage_request=cr, amount="5000.00",
        )
        invoice.consume_coverage_line(line, self.manager)
        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "consumed")

        # Retrait de la ligne d'une facture brouillon
        invoice.release_coverage_line(line)
        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "not_consumed")
        self.assertEqual(cr.invoice_status, "not_invoiced")
        self.assertIsNone(cr.consumed_at)

    # ── T5b : retirer PUIS ré-ajouter la même demande (soft-delete) ──
    def test_t5b_remove_then_readd_same_request_to_same_invoice(self):
        """Le retrait doit supprimer physiquement la ligne, sinon la contrainte
        unique_together [invoice, coverage_request] fait échouer le ré-ajout."""
        cr = self._make_request(self.employee, "PEC-2026-000510")
        invoice = self._make_invoice()
        line = InvoiceCoverageRequestLine.objects.create(
            invoice=invoice, coverage_request=cr, amount="1000.00",
        )
        invoice.consume_coverage_line(line, self.manager)

        # Retrait (via la logique du serializer update)
        from apps.invoicing.serializers import ProviderInvoiceUpdateSerializer
        from apps.invoicing.models import InvoiceCoverageRequestLine as LineModel

        ser = ProviderInvoiceUpdateSerializer(
            instance=invoice,
            data={"coverage_request_lines": []},
            partial=True,
            context={"request": type("R", (), {"user": self.manager})()},
        )
        self.assertTrue(ser.is_valid(), ser.errors)
        ser.save()
        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "not_consumed")
        self.assertEqual(LineModel.all_objects.filter(invoice=invoice).count(), 0)

        # Ré-ajout de la même demande à la même facture brouillon
        ser2 = ProviderInvoiceUpdateSerializer(
            instance=invoice,
            data={"coverage_request_lines": [
                {"coverage_request": str(cr.id), "amount": "1500.00"},
            ]},
            partial=True,
            context={"request": type("R", (), {"user": self.manager})()},
        )
        self.assertTrue(ser2.is_valid(), ser2.errors)
        ser2.save()
        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "consumed")
        self.assertEqual(invoice.coverage_lines.count(), 1)

    # ── T6 : PATCH d'une facture avec ligne déjà présente -> rattrapage ──
    def test_t6_patch_existing_line_triggers_consumption(self):
        """Une ligne déjà liée à une facture brouillon (créée avant la règle)
        doit être consommée dès la prochaine édition de la facture — la
        consommation est idempotente et rattrape les lignes historiques."""
        cr = self._make_request(self.employee, "PEC-2026-000600")
        invoice = self._make_invoice()
        # Ligne créée directement (simule l'état hérité d'avant la règle)
        InvoiceCoverageRequestLine.objects.create(
            invoice=invoice, coverage_request=cr, amount="6000.00",
        )
        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "not_consumed")

        from apps.invoicing.serializers import ProviderInvoiceUpdateSerializer

        ser = ProviderInvoiceUpdateSerializer(
            instance=invoice,
            data={"coverage_request_lines": [
                {"coverage_request": str(cr.id), "amount": "6000.00"},
            ]},
            partial=True,
            context={"request": type("R", (), {"user": self.manager})()},
        )
        self.assertTrue(ser.is_valid(), ser.errors)
        ser.save()

        cr.refresh_from_db()
        self.assertEqual(cr.consumption_status, "consumed")
        self.assertEqual(cr.invoice_status, "invoiced")
        self.assertIsNotNone(cr.consumed_at)
        # Toujours une seule ligne, pas de doublon
        self.assertEqual(invoice.coverage_lines.count(), 1)


class VoucherModelConsumptionTests(TestCase):
    """Tests sur le chemin voucher (MedicalCoverageVoucher + InvoiceLine)."""

    def setUp(self):
        self.manager = User.objects.create_user(
            email="gestionnaire@test.dz", password="test123",
            first_name="Gest", last_name="Test", role="gestionnaire",
        )
        self.dept = Department.objects.create(name="IT", code="IT")
        self.employee = Employee.objects.create(
            matricule="EMP003", first_name="Sam", last_name="Lee",
            department=self.dept, email_professional="sam@test.dz",
            date_of_birth=date(1988, 2, 10),
            date_hired=date(2019, 6, 1),
            gender="M", marital_status="single",
            nationality="Algérienne", job_title="Technicien",
            contract_type="cdi", status="active",
        )
        self.analysis_type, _ = MedicalCoverageType.objects.get_or_create(
            code="analysis", defaults={
                "name": "Centre d'analyse",
                "waiting_period_months": 3, "max_per_year": 4,
            },
        )
        self.partner = Partner.objects.create(
            code="PRT-TEST2", name="Lab Test 2", category="medical_analysis_lab",
        )

    def _make_voucher(self):
        from apps.medical_coverage.models import MedicalCoverageVoucher
        return MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=self.employee,
            request_date=date(2026, 8, 1),
            workflow_state="approved",
            approved_amount="2500.00",
        )

    def _make_invoice(self, month=8):
        return ProviderInvoice.objects.create(
            partner=self.partner,
            category="medical_analysis_lab",
            month=month,
            year=2026,
        )

    def test_voucher_consumed_on_invoice_line_and_released_on_removal(self):
        voucher = self._make_voucher()
        invoice = self._make_invoice()

        line = InvoiceLine.objects.create(
            invoice=invoice, voucher=voucher, amount="2500.00",
        )
        invoice.consume_voucher_line(line, self.manager)

        voucher.refresh_from_db()
        self.assertEqual(voucher.workflow_state, "consumed")
        self.assertIsNotNone(voucher.consumed_at)
        self.assertTrue(VoucherConsumption.objects.filter(
            invoice=invoice, voucher=voucher,
        ).exists())

        # Anti-doublon : un voucher consommé ne peut pas être ailleurs
        invoice2 = self._make_invoice(month=9)
        self.assertTrue(invoice2.is_voucher_consumed_elsewhere(voucher.id))

        # Retrait -> restauration
        invoice.release_voucher_line(line)
        voucher.refresh_from_db()
        self.assertEqual(voucher.workflow_state, "approved")
        self.assertIsNone(voucher.consumed_at)
        self.assertFalse(VoucherConsumption.objects.filter(
            invoice=invoice, voucher=voucher,
        ).exists())
