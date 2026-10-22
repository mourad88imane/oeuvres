import uuid
from decimal import Decimal
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from core.models import BaseModel


class ProviderInvoice(BaseModel):
    INVOICE_STATUS = [
        ("draft", _("Brouillon")),
        ("validated", _("Validée")),
        ("paid", _("Payée")),
        ("cancelled", _("Annulée")),
    ]

    CATEGORY_CHOICES = [
        ("medical_analysis_lab", _("Analyse Médicale")),
        ("medical_imaging_center", _("Imagerie Médicale")),
        ("medical_center", _("Centre Médical")),
    ]

    reference = models.CharField(max_length=50, unique=True, verbose_name=_("Référence"))
    invoice_number = models.CharField(max_length=100, blank=True, default="", verbose_name=_("N° facture fournisseur"))
    invoice_date = models.DateField(null=True, blank=True, verbose_name=_("Date facture"))
    period_start = models.DateField(null=True, blank=True, verbose_name=_("Période du"))
    period_end = models.DateField(null=True, blank=True, verbose_name=_("Période au"))
    partner = models.ForeignKey(
        "conventions.Partner", on_delete=models.PROTECT,
        related_name="invoices", verbose_name=_("Prestataire"),
    )
    convention = models.ForeignKey(
        "conventions.Convention", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="invoices",
        verbose_name=_("Convention"),
    )
    category = models.CharField(
        max_length=30, choices=CATEGORY_CHOICES,
        blank=True, verbose_name=_("Catégorie de couverture"),
    )
    month = models.PositiveSmallIntegerField(verbose_name=_("Mois"))
    year = models.PositiveSmallIntegerField(verbose_name=_("Année"))
    due_date = models.DateField(null=True, blank=True, verbose_name=_("Date d'échéance"))
    status = models.CharField(max_length=20, choices=INVOICE_STATUS, default="draft", verbose_name=_("Statut"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Montant TTC"))
    total_covered_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Montant pris en charge"))
    total_beneficiary_payment = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Montant payé par le bénéficiaire"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    validated_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Validée le"))
    validated_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="invoices_validated", verbose_name=_("Validée par"),
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Payée le"))
    paid_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="invoices_paid", verbose_name=_("Payée par"),
    )

    class Meta:
        verbose_name = _("Facture prestataire")
        verbose_name_plural = _("Factures prestataires")
        ordering = ["-year", "-month", "-created_at"]
        unique_together = [["partner", "month", "year"]]
        indexes = [
            models.Index(fields=["partner", "status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["reference"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        return self.reference

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._generate_reference()
        if not self.category and self.partner_id:
            self.category = self.partner.category
        super().save(*args, **kwargs)

    def _generate_reference(self):
        prefix = f"FACT-{self.year}-{self.month:02d}-"
        last = ProviderInvoice.objects.filter(
            reference__startswith=prefix
        ).order_by("-reference").first()
        if last:
            num = int(last.reference.rsplit("-", 1)[-1]) + 1
        else:
            num = 1
        return f"{prefix}{num:04d}"

    @transaction.atomic
    def update_total(self):
        total_voucher = self.lines.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")
        total_coverage = self.coverage_lines.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")
        total = total_voucher + total_coverage
        self.total_amount = total
        self.total_beneficiary_payment = self.total_amount - self.total_covered_amount
        if self.total_beneficiary_payment < 0:
            self.total_beneficiary_payment = Decimal("0.00")
        self.save(update_fields=["total_amount", "total_beneficiary_payment", "updated_at"])

    # ── Consommation des bons (statut contrôlé par le backend) ────
    # Un bon de prise en charge devient « Consommé » UNIQUEMENT lorsqu'il est
    # réellement ajouté à une facture prestataire (ligne sauvée avec succès).
    # La création de la facture, la sélection du prestataire ou l'affichage
    # d'un bon ne changent PAS son statut.

    @transaction.atomic
    def consume_voucher_line(self, line, user):
        """Marque le bon d'une ligne comme consommé (idempotent)."""
        from apps.medical_coverage.models import MedicalCoverageVoucher

        voucher = line.voucher
        # États terminaux : ne pas écraser une consommation/facturation/annulation
        if voucher.workflow_state in ("consumed", "invoiced", "cancelled"):
            return
        VoucherConsumption.objects.get_or_create(
            voucher=voucher,
            defaults={"invoice": self, "amount": line.amount, "consumed_by": user, "notes": "", "tenant": self.tenant},
        )
        voucher.workflow_state = "consumed"
        voucher.consumed_at = timezone.now()
        voucher.save(update_fields=["workflow_state", "consumed_at", "updated_at"])

    @transaction.atomic
    def release_voucher_line(self, line):
        """Restaure un bon retiré d'une facture éditable à « Non consommé »."""
        from apps.medical_coverage.models import MedicalCoverageVoucher

        voucher = line.voucher
        VoucherConsumption.objects.filter(invoice=self, voucher=voucher).delete()
        voucher.workflow_state = "approved"
        voucher.consumed_at = None
        voucher.save(update_fields=["workflow_state", "consumed_at", "updated_at"])

    @transaction.atomic
    def consume_coverage_line(self, line, user):
        """Marque la demande d'une ligne comme consommée/facturée (idempotent)."""
        from apps.medical_coverage.models import MedicalCoverageRequest

        cr = line.coverage_request
        if cr.consumption_status == "consumed" and cr.invoice_status == "invoiced":
            return
        cr.consumption_status = "consumed"
        cr.consumed_at = timezone.now()
        cr.invoice_status = "invoiced"
        cr.save(update_fields=["consumption_status", "consumed_at", "invoice_status", "updated_at"])

    @transaction.atomic
    def release_coverage_line(self, line):
        """Restaure une demande retirée d'une facture éditable à « Non consommé »."""
        from apps.medical_coverage.models import MedicalCoverageRequest

        cr = line.coverage_request
        cr.consumption_status = "not_consumed"
        cr.consumed_at = None
        cr.invoice_status = "not_invoiced"
        cr.save(update_fields=["consumption_status", "consumed_at", "invoice_status", "updated_at"])

    def is_voucher_consumed_elsewhere(self, voucher_id):
        """Vérifie qu'un bon n'est pas déjà lié à une autre facture active."""
        return InvoiceLine.objects.filter(
            voucher_id=voucher_id,
            invoice__status__in=["draft", "validated", "paid"],
        ).exclude(invoice=self).exists()

    def is_request_consumed_elsewhere(self, request_id):
        """Vérifie qu'une demande n'est pas déjà liée à une autre facture active."""
        return InvoiceCoverageRequestLine.objects.filter(
            coverage_request_id=request_id,
            invoice__status__in=["draft", "validated", "paid"],
        ).exclude(invoice=self).exists()

    @transaction.atomic
    def validate_invoice(self, user):
        status_before = self.status
        self.status = "validated"
        self.validated_at = timezone.now()
        self.validated_by = user
        self.save(update_fields=["status", "validated_at", "validated_by", "updated_at"])
        # Les bons sont déjà consommés à l'ajout de la ligne ; la validation
        # reste idempotente (get_or_create) pour la traçabilité et l'audit.
        for line in self.lines.select_related("voucher").all():
            self.consume_voucher_line(line, user)
        for line in self.coverage_lines.select_related("coverage_request").all():
            self.consume_coverage_line(line, user)
        InvoiceStatusHistory.objects.create(
            invoice=self,
            status_from=status_before,
            status_to="validated",
            changed_by=user,
            tenant=self.tenant,
        )

    @transaction.atomic
    def mark_paid(self, user):
        from apps.medical_coverage.models import MedicalCoverageRequest
        status_before = self.status
        self.status = "paid"
        self.paid_at = timezone.now()
        self.paid_by = user
        self.save(update_fields=["status", "paid_at", "paid_by", "updated_at"])
        MedicalCoverageRequest.objects.filter(
            invoice_lines__invoice=self
        ).update(invoice_status="paid", updated_at=timezone.now())
        InvoiceStatusHistory.objects.create(
            invoice=self,
            status_from=status_before,
            status_to="paid",
            changed_by=user,
            tenant=self.tenant,
        )

    @transaction.atomic
    def cancel_invoice(self, user):
        status_before = self.status
        self.status = "cancelled"
        self.save(update_fields=["status", "updated_at"])
        VoucherConsumption.objects.filter(invoice=self).delete()
        for line in self.lines.select_related("voucher").all():
            self.release_voucher_line(line)
        for line in self.coverage_lines.select_related("coverage_request").all():
            self.release_coverage_line(line)
        InvoiceStatusHistory.objects.create(
            invoice=self,
            status_from=status_before,
            status_to="cancelled",
            changed_by=user,
            tenant=self.tenant,
        )


class InvoiceLine(BaseModel):
    invoice = models.ForeignKey(
        ProviderInvoice, on_delete=models.CASCADE,
        related_name="lines", verbose_name=_("Facture"),
    )
    voucher = models.ForeignKey(
        "medical_coverage.MedicalCoverageVoucher", on_delete=models.PROTECT,
        related_name="invoice_lines", verbose_name=_("Bon de prise en charge"),
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name=_("Montant"))
    quantity = models.PositiveIntegerField(default=1, verbose_name=_("Quantité"))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name=_("Prix unitaire"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        verbose_name = _("Ligne de facture")
        verbose_name_plural = _("Lignes de facture")
        unique_together = [["invoice", "voucher"]]
        constraints = [
            models.UniqueConstraint(
                fields=["voucher"],
                name="unique_voucher_per_invoice",
            )
        ]

    def __str__(self):
        return f"{self.invoice.reference} - {self.voucher.reference}"


class InvoiceCoverageRequestLine(BaseModel):
    invoice = models.ForeignKey(
        ProviderInvoice, on_delete=models.CASCADE,
        related_name="coverage_lines", verbose_name=_("Facture"),
    )
    coverage_request = models.ForeignKey(
        "medical_coverage.MedicalCoverageRequest", on_delete=models.PROTECT,
        related_name="invoice_lines", verbose_name=_("Demande de prise en charge"),
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name=_("Montant"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        verbose_name = _("Ligne de facture (demande)")
        verbose_name_plural = _("Lignes de facture (demandes)")
        unique_together = [["invoice", "coverage_request"]]

    def __str__(self):
        return f"{self.invoice.reference} - {self.coverage_request.request_number}"


class VoucherConsumption(BaseModel):
    invoice = models.ForeignKey(
        ProviderInvoice, on_delete=models.CASCADE,
        related_name="consumptions", verbose_name=_("Facture"),
    )
    voucher = models.OneToOneField(
        "medical_coverage.MedicalCoverageVoucher", on_delete=models.PROTECT,
        related_name="consumption", verbose_name=_("Bon de prise en charge"),
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name=_("Montant consommé"))
    consumed_at = models.DateTimeField(default=timezone.now, verbose_name=_("Date de consommation"))
    consumed_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="voucher_consumptions",
        verbose_name=_("Consommé par"),
    )
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        verbose_name = _("Consommation de bon")
        verbose_name_plural = _("Consommations de bons")
        ordering = ["-consumed_at"]

    def __str__(self):
        return f"{self.voucher.reference} → {self.invoice.reference}"


class InvoiceStatusHistory(BaseModel):
    invoice = models.ForeignKey(
        ProviderInvoice, on_delete=models.CASCADE,
        related_name="status_history", verbose_name=_("Facture"),
    )
    status_from = models.CharField(max_length=20, verbose_name=_("Statut précédent"))
    status_to = models.CharField(max_length=20, verbose_name=_("Nouveau statut"))
    changed_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="invoice_status_changes",
        verbose_name=_("Modifié par"),
    )
    changed_at = models.DateTimeField(default=timezone.now, verbose_name=_("Date de modification"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        verbose_name = _("Historique de statut")
        verbose_name_plural = _("Historiques de statuts")
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.invoice.reference}: {self.status_from} → {self.status_to}"


class ProviderInvoiceAttachment(BaseModel):
    invoice = models.ForeignKey(
        ProviderInvoice, on_delete=models.CASCADE,
        related_name="attachments", verbose_name=_("Facture"),
    )
    file = models.FileField(upload_to="invoices/attachments/", max_length=500, verbose_name=_("Fichier"))
    original_name = models.CharField(max_length=255, blank=True, verbose_name=_("Nom d'origine"))
    file_size = models.PositiveIntegerField(default=0, verbose_name=_("Taille (octets)"))
    mime_type = models.CharField(max_length=100, blank=True, verbose_name=_("Type MIME"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    uploaded_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="invoice_attachments",
        verbose_name=_("Importé par"),
    )
    uploaded_at = models.DateTimeField(default=timezone.now, verbose_name=_("Importé le"))

    class Meta:
        verbose_name = _("Pièce jointe")
        verbose_name_plural = _("Pièces jointes")
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.original_name or self.file.name
