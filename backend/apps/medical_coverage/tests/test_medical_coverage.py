from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.employees.models import Employee
from apps.departments.models import Department
from apps.medical_coverage.models import MedicalCoverageType, MedicalCoverageVoucher, MedicalProvider
from apps.medical_coverage.eligibility import EligibilityEngine

User = get_user_model()


class MedicalCoverageTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.dz", password="test123",
            first_name="Admin", last_name="Test", role="admin",
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
        # Les 3 types officiels sont seedés par la migration 0011.
        self.analysis_type, _ = MedicalCoverageType.objects.get_or_create(
            code="analysis", defaults={
                "name": "Centre d'analyse",
                "waiting_period_months": 3, "max_per_year": 4,
            },
        )
        self.imaging_type, _ = MedicalCoverageType.objects.get_or_create(
            code="imaging", defaults={
                "name": "Imagerie",
                "waiting_period_months": 3, "max_per_year": 4,
            },
        )
        self.provider = MedicalProvider.objects.create(
            name="Lab Test", type="lab", city="Alger",
        )

    def test_create_voucher(self):
        voucher = MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=self.employee,
            request_date=date(2026, 1, 15),
            workflow_state="draft",
            created_by=self.admin,
            updated_by=self.admin,
        )
        self.assertIsNotNone(voucher.reference)
        self.assertTrue(voucher.reference.startswith("ANA-2026-"))
        self.assertEqual(voucher.workflow_state, "draft")

    def test_employee_eligibility_first_time(self):
        engine = EligibilityEngine(MedicalCoverageVoucher)
        result = engine.check_employee_eligibility(
            self.employee, self.analysis_type, date(2026, 3, 1),
        )
        self.assertTrue(result.is_eligible)
        self.assertEqual(result.count_current_year, 0)
        self.assertEqual(result.remaining, 4)

    def test_employee_eligibility_blocked(self):
        MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=self.employee,
            request_date=date(2026, 1, 15),
            workflow_state="consumed",
            created_by=self.admin,
            updated_by=self.admin,
        )
        engine = EligibilityEngine(MedicalCoverageVoucher)
        result = engine.check_employee_eligibility(
            self.employee, self.analysis_type, date(2026, 3, 1),
        )
        self.assertFalse(result.is_eligible)
        self.assertGreater(len(result.messages), 0)

    def test_employee_eligibility_after_waiting(self):
        MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=self.employee,
            request_date=date(2025, 1, 1),
            workflow_state="consumed",
            created_by=self.admin,
            updated_by=self.admin,
        )
        engine = EligibilityEngine(MedicalCoverageVoucher)
        result = engine.check_employee_eligibility(
            self.employee, self.analysis_type, date(2026, 6, 1),
        )
        self.assertTrue(result.is_eligible)

    def test_max_per_year(self):
        for i in range(4):
            MedicalCoverageVoucher.objects.create(
                coverage_type=self.analysis_type,
                employee=self.employee,
                request_date=date(2026, 1, 1) + timedelta(days=i * 30),
                workflow_state="consumed",
                created_by=self.admin,
                updated_by=self.admin,
            )
        engine = EligibilityEngine(MedicalCoverageVoucher)
        result = engine.check_employee_eligibility(
            self.employee, self.analysis_type, date(2026, 12, 1),
        )
        self.assertFalse(result.is_eligible)
        self.assertEqual(result.count_current_year, 4)

    def test_different_types_independent(self):
        MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=self.employee,
            request_date=date(2026, 1, 15),
            workflow_state="consumed",
            created_by=self.admin,
            updated_by=self.admin,
        )
        engine = EligibilityEngine(MedicalCoverageVoucher)
        result = engine.check_employee_eligibility(
            self.employee, self.imaging_type, date(2026, 3, 1),
        )
        self.assertTrue(result.is_eligible)

    def test_create_voucher_with_service(self):
        from apps.medical_coverage.services import MedicalCoverageService
        svc = MedicalCoverageService()
        voucher = svc.create({
            "coverage_type": self.analysis_type,
            "employee": self.employee,
            "request_date": date(2026, 6, 1),
            "observations": "Test",
        }, self.admin)
        self.assertEqual(voucher.workflow_state, "draft")
        self.assertEqual(voucher.observations, "Test")

    def test_reference_generation(self):
        v1 = MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=self.employee,
            request_date=date(2026, 1, 1),
            created_by=self.admin,
            updated_by=self.admin,
        )
        v2 = MedicalCoverageVoucher.objects.create(
            coverage_type=self.analysis_type,
            employee=self.employee,
            request_date=date(2026, 2, 1),
            created_by=self.admin,
            updated_by=self.admin,
        )
        self.assertEqual(v1.reference, "ANA-2026-00001")
        self.assertEqual(v2.reference, "ANA-2026-00002")
