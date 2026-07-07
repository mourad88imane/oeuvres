import uuid
from datetime import date

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel
from shared.workflow.models import WorkflowMixin


class MedicalProvider(BaseModel):
    COVERAGE_TYPES = [
        ("analysis", _("Analyse Médicale")),
        ("imaging", _("Imagerie Médicale")),
        ("center", _("Centre Médical / Consultation Spécialisée")),
    ]

    name = models.CharField(max_length=255, verbose_name=_("Nom"))
    type = models.CharField(max_length=50, choices=[
        ("hospital", _("Hôpital")),
        ("clinic", _("Clinique")),
        ("lab", _("Laboratoire d'analyses")),
        ("imaging_center", _("Centre d'imagerie")),
        ("specialist", _("Spécialiste")),
        ("medical_center", _("Centre médical")),
    ], verbose_name=_("Type"))
    coverage_types = models.JSONField(
        default=list, blank=True,
        verbose_name=_("Types de couverture"),
        help_text=_("Types de couverture médicale associés"),
    )
    address = models.TextField(blank=True, verbose_name=_("Adresse"))
    phone = models.CharField(max_length=50, blank=True, verbose_name=_("Téléphone"))
    email = models.EmailField(blank=True, verbose_name=_("Email"))
    city = models.CharField(max_length=100, blank=True, verbose_name=_("Ville"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    partner = models.OneToOneField(
        "conventions.Partner", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="medical_provider",
        verbose_name=_("Prestataire conventionné"),
        help_text=_("Lien vers la fiche partenaire dans le module conventions"),
    )

    class Meta:
        verbose_name = _("Prestataire médical")
        verbose_name_plural = _("Prestataires médicaux")
        ordering = ["name"]

    def __str__(self):
        return self.name


class MedicalCoverageType(BaseModel):
    code = models.CharField(max_length=50, unique=True, verbose_name=_("Code"))
    name = models.CharField(max_length=255, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    waiting_period_months = models.PositiveIntegerField(
        default=3, verbose_name=_("Période d'attente (mois)"),
    )
    max_per_year = models.PositiveIntegerField(
        default=4, verbose_name=_("Maximum par an"),
    )
    requires_provider = models.BooleanField(default=True, verbose_name=_("Nécessite un prestataire"))
    specific_fields = models.JSONField(default=dict, blank=True, verbose_name=_("Champs spécifiques"))
    color = models.CharField(max_length=7, default="#3b82f6", verbose_name=_("Couleur"))
    icon = models.CharField(max_length=50, blank=True, verbose_name=_("Icône"))

    class Meta:
        verbose_name = _("Type de couverture médicale")
        verbose_name_plural = _("Types de couverture médicale")
        ordering = ["code"]

    def __str__(self):
        return self.name


class MedicalCoverageVoucher(WorkflowMixin, BaseModel):
    VOUCHER_STATUS = [
        ("draft", _("Brouillon")),
        ("submitted", _("Soumise")),
        ("approved", _("Approuvée")),
        ("rejected", _("Rejetée")),
        ("cancelled", _("Annulée")),
        ("consumed", _("Consommée")),
        ("invoiced", _("Facturée")),
    ]
    BENEFICIARY_TYPES = [
        ("employee", _("Employé")),
        ("dependent", _("Ayant droit")),
    ]

    reference = models.CharField(
        max_length=50, unique=True, blank=True,
        verbose_name=_("Référence"),
    )
    coverage_type = models.ForeignKey(
        MedicalCoverageType, on_delete=models.PROTECT,
        related_name="vouchers", verbose_name=_("Type de couverture"),
    )
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.PROTECT,
        related_name="medical_vouchers", verbose_name=_("Employé"),
    )
    beneficiary_type = models.CharField(
        max_length=20, choices=BENEFICIARY_TYPES,
        default="employee", verbose_name=_("Type de bénéficiaire"),
    )
    beneficiary = models.ForeignKey(
        "beneficiaries.Beneficiary", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="medical_vouchers",
        verbose_name=_("Ayant droit"),
    )
    provider = models.ForeignKey(
        MedicalProvider, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="vouchers",
        verbose_name=_("Prestataire médical"),
    )
    request_date = models.DateField(verbose_name=_("Date de demande"))
    expected_date = models.DateField(
        null=True, blank=True, verbose_name=_("Date prévue"),
    )
    workflow_state = models.CharField(
        max_length=30, choices=VOUCHER_STATUS,
        default="draft", verbose_name=_("Statut"),
    )
    rejection_reason = models.TextField(blank=True, verbose_name=_("Motif du rejet"))
    observations = models.TextField(blank=True, verbose_name=_("Observations"))

    next_eligible_date = models.DateField(
        null=True, blank=True, verbose_name=_("Prochaine date éligible"),
    )
    voucher_number = models.CharField(
        max_length=50, unique=True, blank=True, null=True,
        verbose_name=_("Numéro du bon"),
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name=_("Montant"),
        help_text=_("Montant estimé de la prise en charge"),
    )
    approved_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name=_("Montant approuvé"),
    )
    consumed_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Date de consommation"),
    )

    class Meta:
        verbose_name = _("Bon de prise en charge")
        verbose_name_plural = _("Bons de prise en charge")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["employee", "coverage_type", "request_date"],
                         name="idx_medcov_emp_ct_date"),
            models.Index(fields=["workflow_state"],
                         name="idx_medcov_state"),
            models.Index(fields=["reference"],
                         name="idx_medcov_ref"),
        ]

    def __str__(self):
        return self.reference or str(self.id)

    def save(self, *args, **kwargs):
        if not self.reference:
            year = self.request_date.year if self.request_date else date.today().year
            prefix = self.coverage_type.code[:3].upper() if self.coverage_type else "BPC"
            last = MedicalCoverageVoucher.objects.filter(
                reference__startswith=f"{prefix}-{year}-"
            ).count() + 1
            self.reference = f"{prefix}-{year}-{last:05d}"
        super().save(*args, **kwargs)


class MedicalCoverageRequest(WorkflowMixin, BaseModel):
    class Category(models.TextChoices):
        ANALYSIS = "analysis", _("Medical Analysis")
        IMAGING = "imaging", _("Medical Imaging")
        CENTER = "center", _("Medical Center")

    class Status(models.TextChoices):
        DRAFT = "draft", _("Brouillon")
        SUBMITTED = "submitted", _("Soumise")
        PENDING_APPROVAL = "pending_approval", _("En attente d'approbation")
        PENDING_MANAGER_APPROVAL = "pending_manager_approval", _("En attente du chef de service")
        PENDING_DIRECTOR_APPROVAL = "pending_director_approval", _("En attente du directeur")
        VALIDATED = "validated", _("Validée")
        REJECTED = "rejected", _("Rejetée")
        PRINTED = "printed", _("Imprimée")
        CLOSED = "closed", _("Clôturée")

    request_number = models.CharField(
        max_length=50, unique=True, editable=False,
        verbose_name=_("Numéro de demande"),
    )
    category = models.CharField(
        max_length=20, choices=Category.choices,
        verbose_name=_("Catégorie"),
    )
    partner = models.ForeignKey(
        "conventions.Partner", on_delete=models.PROTECT,
        related_name="coverage_requests",
        verbose_name=_("Partenaire"),
    )
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.PROTECT,
        related_name="coverage_requests",
        verbose_name=_("Employé"),
    )
    beneficiary = models.ForeignKey(
        "beneficiaries.Beneficiary", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="coverage_requests",
        verbose_name=_("Ayant droit"),
    )
    coverage_date = models.DateField(verbose_name=_("Date de couverture"))
    validation_date = models.DateField(
        null=True, blank=True, verbose_name=_("Date de validation"),
    )
    observation = models.TextField(blank=True, verbose_name=_("Observation"))
    printed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Date d'impression"))
    print_count = models.PositiveIntegerField(default=0, verbose_name=_("Nombre d'impressions"))
    workflow_state = models.CharField(
        max_length=30, choices=Status.choices,
        default=Status.DRAFT, verbose_name=_("Statut"),
    )

    class Meta:
        verbose_name = _("Demande de couverture médicale")
        verbose_name_plural = _("Demandes de couverture médicale")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["request_number"]),
            models.Index(fields=["category", "workflow_state"]),
            models.Index(fields=["employee", "coverage_date"]),
        ]

    def __str__(self):
        return self.request_number

    def save(self, *args, **kwargs):
        if not self.request_number:
            self.request_number = self._generate_request_number()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_request_number(cls):
        from django.utils import timezone
        year = timezone.now().year
        prefix = f"PEC-{year}-"
        last = cls.objects.filter(
            request_number__startswith=prefix
        ).order_by("-request_number").first()
        if last:
            num = int(last.request_number.rsplit("-", 1)[-1]) + 1
        else:
            num = 1
        return f"{prefix}{num:06d}"
