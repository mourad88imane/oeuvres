import uuid

from core.models import BaseModel
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def document_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"conventions/{instance.convention.id}/{uuid.uuid4().hex}.{ext}"


class Partner(BaseModel):
    class Type(models.TextChoices):
        HOSPITAL = "hospital", "Établissement hospitalier"
        CLINIC = "clinic", "Clinique"
        IMAGING_CENTER = "imaging_center", "Centre d'imagerie médicale"
        PHARMACY = "pharmacy", "Pharmacie"
        LAB = "lab", "Laboratoire d'analyses"
        SCHOOL = "school", "Établissement scolaire"
        UNIVERSITY = "university", "Université"
        TRAINING = "training", "Centre de formation"
        TRANSPORT = "transport", "Transport"
        INSURANCE = "insurance", "Assureur"
        BANK = "bank", "Banque"
        SUPPLIER = "supplier", "Fournisseur"
        OTHER = "other", "Autre"

    code = models.CharField(max_length=30, unique=True, verbose_name="Code partenaire")
    name = models.CharField(max_length=200, verbose_name="Raison sociale")
    type = models.CharField(max_length=20, choices=Type.choices, verbose_name="Type")
    is_active = models.BooleanField(default=True, verbose_name="Actif")

    legal_form = models.CharField(max_length=100, blank=True, verbose_name="Forme juridique")
    registration_number = models.CharField(
        max_length=50, blank=True, verbose_name="N° d'enregistrement"
    )
    tax_id = models.CharField(max_length=50, blank=True, verbose_name="N° fiscal")
    rc_number = models.CharField(max_length=50, blank=True, verbose_name="N° registre de commerce")

    email = models.EmailField(blank=True, verbose_name="Email principal")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    website = models.URLField(blank=True, verbose_name="Site web")

    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    wilaya = models.CharField(max_length=100, blank=True, verbose_name="Wilaya")
    postal_code = models.CharField(max_length=10, blank=True, verbose_name="Code postal")

    contact_name = models.CharField(max_length=200, blank=True, verbose_name="Personne de contact")
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone du contact")
    contact_email = models.EmailField(blank=True, verbose_name="Email du contact")

    category = models.CharField(
        max_length=30, blank=True,
        choices=[
            ("medical_analysis_lab", "Medical Analysis Laboratory"),
            ("medical_center", "Medical Center"),
            ("medical_imaging_center", "Medical Imaging Center"),
        ],
        verbose_name="Catégorie partenaire",
    )
    gps_coordinates = models.CharField(max_length=100, blank=True, verbose_name="Coordonnées GPS")
    description = models.TextField(blank=True, verbose_name="Description")
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    pdf_template = models.CharField(
        max_length=50, blank=True, default="default",
        choices=[
            ("default", _("Template par défaut")),
            ("imaging_center", _("Centre d'imagerie médicale")),
            ("analysis_lab", _("Laboratoire d'analyses médicales")),
            ("medical_center", _("Centre médical")),
        ],
        verbose_name="Template PDF",
        help_text="Template de prise en charge PDF spécifique au partenaire",
    )
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Métadonnées")

    class Meta:
        verbose_name = "Partenaire"
        verbose_name_plural = "Partenaires"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["type", "is_active"]),
            models.Index(fields=["wilaya"]),
        ]

    def __str__(self):
        return f"[{self.code}] {self.name}"


class Convention(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        ACTIVE = "active", "Active"
        EXPIRING_SOON = "expiring_soon", "Expiration prochaine"
        EXPIRED = "expired", "Expirée"
        TERMINATED = "terminated", "Résiliée"
        RENEWED = "renewed", "Renouvelée"

    class Renewal(models.TextChoices):
        AUTO = "auto", "Reconduction tacite"
        MANUAL = "manual", "Reconduction expresse"
        NONE = "none", "Non reconductible"

    COVERED_SERVICE_CHOICES = [
        ("consultation", "Consultation médicale"),
        ("specialized_consultation", "Consultation spécialisée"),
        ("analysis", "Analyses médicales"),
        ("imaging", "Imagerie médicale"),
        ("radiology", "Radiologie"),
        ("ultrasound", "Échographie"),
        ("mri", "IRM"),
        ("scanner", "Scanner"),
        ("hospitalization", "Hospitalisation"),
        ("surgery", "Chirurgie"),
        ("dental", "Soins dentaires"),
        ("ophthalmology", "Ophtalmologie"),
        ("physiotherapy", "Kinésithérapie"),
        ("pharmacy", "Pharmacie"),
        ("prosthesis", "Prothèses et appareillage"),
        ("other", "Autres prestations"),
    ]

    reference = models.CharField(
        max_length=30, unique=True, editable=False, verbose_name="Référence"
    )
    partner = models.ForeignKey(
        Partner, on_delete=models.PROTECT, related_name="conventions", verbose_name="Partenaire"
    )
    title = models.CharField(max_length=300, verbose_name="Objet de la convention")
    description = models.TextField(blank=True, verbose_name="Description")

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name="Statut"
    )
    renewal_mode = models.CharField(
        max_length=10,
        choices=Renewal.choices,
        default=Renewal.MANUAL,
        verbose_name="Mode de reconduction",
    )
    renewal_notice_days = models.PositiveSmallIntegerField(
        default=30, verbose_name="Préavis reconduction (jours)"
    )

    start_date = models.DateField(verbose_name="Date d'effet")
    end_date = models.DateField(verbose_name="Date d'échéance")
    signed_date = models.DateField(null=True, blank=True, verbose_name="Date de signature")
    terminated_date = models.DateField(null=True, blank=True, verbose_name="Date de résiliation")
    renewed_at = models.DateField(null=True, blank=True, verbose_name="Dernier renouvellement le")

    amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, verbose_name="Montant (DZD)"
    )
    auto_renewal_days = models.PositiveSmallIntegerField(
        default=0,
        help_text="Si > 0, reconduction automatique J jours avant échéance",
        verbose_name="Reconduction auto (jours)",
    )

    requires_attachments = models.BooleanField(
        default=False, verbose_name="Pièces jointes obligatoires"
    )

    ai_metadata = models.JSONField(default=dict, blank=True, verbose_name="Données AI")
    covered_services = models.JSONField(
        default=list, blank=True, verbose_name="Prestations couvertes"
    )
    analytics_data = models.JSONField(default=dict, blank=True, verbose_name="Données analytiques")

    class Meta:
        verbose_name = "Convention"
        verbose_name_plural = "Conventions"
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["reference"]),
            models.Index(fields=["status"]),
            models.Index(fields=["end_date"]),
            models.Index(fields=["partner", "status"]),
        ]

    def __str__(self):
        return f"{self.reference} — {self.title[:60]}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._gen_ref()
        self._update_status()
        super().save(*args, **kwargs)

    def _update_status(self):
        if self.status in (self.Status.TERMINATED, self.Status.RENEWED):
            return
        now = timezone.localdate()
        if not self.start_date or not self.end_date:
            return
        if self.end_date < now:
            self.status = self.Status.EXPIRED
        elif self.end_date <= now + timezone.timedelta(days=30):
            self.status = self.Status.EXPIRING_SOON
        elif self.start_date <= now:
            self.status = self.Status.ACTIVE

    @classmethod
    def _gen_ref(cls) -> str:
        year = timezone.now().year
        last = (
            cls.objects.filter(reference__startswith=f"CONV-{year}-").order_by("reference").last()
        )
        if last:
            num = int(last.reference.split("-")[-1]) + 1
        else:
            num = 1
        return f"CONV-{year}-{num:04d}"

    @property
    def days_until_expiry(self) -> int:
        if not self.end_date:
            return 0
        delta = self.end_date - timezone.localdate()
        return max(delta.days, 0)

    @property
    def is_expired(self) -> bool:
        return self.status == self.Status.EXPIRED

    @property
    def is_expiring_soon(self) -> bool:
        return self.status == self.Status.EXPIRING_SOON

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE

    @property
    def duration_display(self) -> str:
        if not self.start_date or not self.end_date:
            return ""
        delta = self.end_date - self.start_date
        days = delta.days
        if days >= 365:
            years = days // 365
            return f"{years} an(s)" if years > 1 else "1 an"
        elif days >= 30:
            months = days // 30
            return f"{months} mois"
        return f"{days} jours"


class ConventionDocument(BaseModel):
    class DocType(models.TextChoices):
        CONTRACT = "contract", "Contrat signé"
        ADDENDUM = "addendum", "Avenant"
        ANNEX = "annex", "Annexe"
        PROOF = "proof", "Justificatif"
        REPORT = "report", "Rapport"
        OTHER = "other", "Autre"

    convention = models.ForeignKey(
        Convention, on_delete=models.CASCADE, related_name="documents", verbose_name="Convention"
    )
    doc_type = models.CharField(
        max_length=20,
        choices=DocType.choices,
        default=DocType.CONTRACT,
        verbose_name="Type de document",
    )
    file = models.FileField(upload_to=document_upload_path, verbose_name="Fichier")
    original_name = models.CharField(max_length=255, verbose_name="Nom original")
    description = models.CharField(max_length=300, blank=True, verbose_name="Description")
    file_size = models.PositiveIntegerField(default=0, verbose_name="Taille (octets)")
    mime_type = models.CharField(max_length=100, blank=True, verbose_name="Type MIME")

    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_doc_type_display()} — {self.original_name}"


class ConventionAlert(BaseModel):
    class AlertType(models.TextChoices):
        EXPIRY_WARNING = "expiry_warning", "Alerte expiration"
        EXPIRY_CRITICAL = "expiry_critical", "Expiration imminente"
        RENEWAL_REMINDER = "renewal_reminder", "Rappel reconduction"
        DOCUMENT_MISSING = "document_missing", "Document manquant"
        STATUS_CHANGE = "status_change", "Changement de statut"
        AUTO_RENEWED = "auto_renewed", "Reconduction automatique"
        AI_INSIGHT = "ai_insight", "Recommandation IA"

    class Severity(models.TextChoices):
        LOW = "low", "Faible"
        MEDIUM = "medium", "Moyenne"
        HIGH = "high", "Haute"
        CRITICAL = "critical", "Critique"

    convention = models.ForeignKey(
        Convention, on_delete=models.CASCADE, related_name="alerts", verbose_name="Convention"
    )
    alert_type = models.CharField(
        max_length=30, choices=AlertType.choices, verbose_name="Type d'alerte"
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM, verbose_name="Sévérité"
    )
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    is_read = models.BooleanField(default=False, verbose_name="Lue")
    is_resolved = models.BooleanField(default=False, verbose_name="Résolue")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Résolue le")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="convention_alerts_resolved",
        verbose_name="Résolue par",
    )
    ai_generated = models.BooleanField(default=False, verbose_name="Générée par IA")
    ai_confidence = models.FloatField(null=True, blank=True, verbose_name="Confiance IA")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Métadonnées")

    class Meta:
        verbose_name = "Alerte convention"
        verbose_name_plural = "Alertes conventions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["convention", "is_resolved"]),
            models.Index(fields=["alert_type", "severity"]),
        ]

    def __str__(self):
        return f"[{self.get_severity_display()}] {self.title}"
