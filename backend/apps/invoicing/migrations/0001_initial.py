# Generated manually — initial invoicing tables

import uuid
from decimal import Decimal
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("conventions", "0006_alter_historicalpartner_type_alter_partner_type"),
        ("medical_coverage", "0007_alter_historicalmedicalcoveragevoucher_workflow_state_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProviderInvoice",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "is_deleted",
                    models.BooleanField(default=False, help_text="Soft delete"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "reference",
                    models.CharField(max_length=50, unique=True, verbose_name="Référence"),
                ),
                (
                    "invoice_number",
                    models.CharField(
                        blank=True, default="", max_length=100, verbose_name="N° facture fournisseur"
                    ),
                ),
                (
                    "invoice_date",
                    models.DateField(blank=True, null=True, verbose_name="Date facture"),
                ),
                (
                    "period_start",
                    models.DateField(blank=True, null=True, verbose_name="Période du"),
                ),
                (
                    "period_end",
                    models.DateField(blank=True, null=True, verbose_name="Période au"),
                ),
                (
                    "partner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoices",
                        to="conventions.partner",
                        verbose_name="Prestataire",
                    ),
                ),
                (
                    "convention",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invoices",
                        to="conventions.convention",
                        verbose_name="Convention",
                    ),
                ),
                (
                    "category",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("medical_analysis_lab", "Analyse Médicale"),
                            ("medical_imaging_center", "Imagerie Médicale"),
                            ("medical_center", "Centre Médical"),
                        ],
                        max_length=30,
                        verbose_name="Catégorie de couverture",
                    ),
                ),
                (
                    "month",
                    models.PositiveSmallIntegerField(verbose_name="Mois"),
                ),
                (
                    "year",
                    models.PositiveSmallIntegerField(verbose_name="Année"),
                ),
                (
                    "due_date",
                    models.DateField(blank=True, null=True, verbose_name="Date d'échéance"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Brouillon"),
                            ("validated", "Validée"),
                            ("paid", "Payée"),
                            ("cancelled", "Annulée"),
                        ],
                        default="draft",
                        max_length=20,
                        verbose_name="Statut",
                    ),
                ),
                (
                    "total_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=14, verbose_name="Montant TTC"),
                ),
                (
                    "total_covered_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=14, verbose_name="Montant pris en charge"),
                ),
                (
                    "total_beneficiary_payment",
                    models.DecimalField(decimal_places=2, default=0, max_digits=14, verbose_name="Montant payé par le bénéficiaire"),
                ),
                (
                    "notes",
                    models.TextField(blank=True, verbose_name="Notes"),
                ),
                (
                    "validated_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Validée le"),
                ),
                (
                    "validated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invoices_validated",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Validée par",
                    ),
                ),
                (
                    "paid_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Payée le"),
                ),
                (
                    "paid_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invoices_paid",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Payée par",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "deleted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_deleted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="administration.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Facture prestataire",
                "verbose_name_plural": "Factures prestataires",
                "ordering": ["-year", "-month", "-created_at"],
                "unique_together": {("partner", "month", "year")},
            },
        ),
        migrations.CreateModel(
            name="InvoiceLine",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "is_deleted",
                    models.BooleanField(default=False, help_text="Soft delete"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "invoice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="invoicing.providerinvoice",
                        verbose_name="Facture",
                    ),
                ),
                (
                    "voucher",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoice_lines",
                        to="medical_coverage.medicalcoveragevoucher",
                        verbose_name="Bon de prise en charge",
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(decimal_places=2, max_digits=12, verbose_name="Montant"),
                ),
                (
                    "notes",
                    models.TextField(blank=True, verbose_name="Notes"),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "deleted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_deleted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="administration.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Ligne de facture",
                "verbose_name_plural": "Lignes de facture",
                "unique_together": {("invoice", "voucher")},
            },
        ),
        migrations.CreateModel(
            name="VoucherConsumption",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "is_deleted",
                    models.BooleanField(default=False, help_text="Soft delete"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "amount",
                    models.DecimalField(decimal_places=2, max_digits=12, verbose_name="Montant consommé"),
                ),
                (
                    "consumed_at",
                    models.DateTimeField(default=django.utils.timezone.now, verbose_name="Date de consommation"),
                ),
                (
                    "notes",
                    models.TextField(blank=True, verbose_name="Notes"),
                ),
                (
                    "consumed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="voucher_consumptions",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Consommé par",
                    ),
                ),
                (
                    "invoice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="consumptions",
                        to="invoicing.providerinvoice",
                        verbose_name="Facture",
                    ),
                ),
                (
                    "voucher",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="consumption",
                        to="medical_coverage.medicalcoveragevoucher",
                        verbose_name="Bon de prise en charge",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "deleted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_deleted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="administration.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Consommation de bon",
                "verbose_name_plural": "Consommations de bons",
                "ordering": ["-consumed_at"],
            },
        ),
        migrations.CreateModel(
            name="InvoiceStatusHistory",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "is_deleted",
                    models.BooleanField(default=False, help_text="Soft delete"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "status_from",
                    models.CharField(max_length=20, verbose_name="Statut précédent"),
                ),
                (
                    "status_to",
                    models.CharField(max_length=20, verbose_name="Nouveau statut"),
                ),
                (
                    "changed_at",
                    models.DateTimeField(default=django.utils.timezone.now, verbose_name="Date de modification"),
                ),
                (
                    "notes",
                    models.TextField(blank=True, verbose_name="Notes"),
                ),
                (
                    "changed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invoice_status_changes",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Modifié par",
                    ),
                ),
                (
                    "invoice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="status_history",
                        to="invoicing.providerinvoice",
                        verbose_name="Facture",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "deleted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_deleted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="administration.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Historique de statut",
                "verbose_name_plural": "Historiques de statuts",
                "ordering": ["-changed_at"],
            },
        ),
        migrations.CreateModel(
            name="ProviderInvoiceAttachment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "is_deleted",
                    models.BooleanField(default=False, help_text="Soft delete"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "file",
                    models.FileField(
                        max_length=500,
                        upload_to="invoices/attachments/",
                        verbose_name="Fichier",
                    ),
                ),
                (
                    "original_name",
                    models.CharField(blank=True, max_length=255, verbose_name="Nom d'origine"),
                ),
                (
                    "file_size",
                    models.PositiveIntegerField(default=0, verbose_name="Taille (octets)"),
                ),
                (
                    "mime_type",
                    models.CharField(blank=True, max_length=100, verbose_name="Type MIME"),
                ),
                (
                    "description",
                    models.TextField(blank=True, verbose_name="Description"),
                ),
                (
                    "uploaded_at",
                    models.DateTimeField(default=django.utils.timezone.now, verbose_name="Importé le"),
                ),
                (
                    "invoice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attachments",
                        to="invoicing.providerinvoice",
                        verbose_name="Facture",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invoice_attachments",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Importé par",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "deleted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(app_label)s_%(class)s_deleted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="administration.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Pièce jointe",
                "verbose_name_plural": "Pièces jointes",
                "ordering": ["-uploaded_at"],
            },
        ),
        migrations.AddIndex(
            model_name="providerinvoice",
            index=models.Index(fields=["partner", "status"], name="partner_status_idx"),
        ),
        migrations.AddIndex(
            model_name="providerinvoice",
            index=models.Index(fields=["status"], name="status_idx"),
        ),
        migrations.AddIndex(
            model_name="providerinvoice",
            index=models.Index(fields=["reference"], name="reference_idx"),
        ),
        migrations.AddIndex(
            model_name="providerinvoice",
            index=models.Index(fields=["category"], name="category_idx"),
        ),
        migrations.AddConstraint(
            model_name="invoiceline",
            constraint=models.UniqueConstraint(
                fields=["voucher"],
                name="unique_voucher_per_invoice",
            ),
        ),
    ]
