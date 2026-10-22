from decimal import Decimal
from django.db.models import Count, Sum, Q, Avg
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import viewsets, status, parsers, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from weasyprint import HTML
import tempfile, os, logging


def _extract_business_message(detail):
    """Extrait un message métier lisible depuis une ValidationError DRF."""
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list) and detail:
        first = detail[0]
        if isinstance(first, str):
            return first
        return _extract_business_message(first)
    if isinstance(detail, dict):
        for value in detail.values():
            msg = _extract_business_message(value)
            if msg:
                return msg
    return None

from core.permissions import HasAnyModuleAccess, user_has_permission
from core.pagination import StandardResultsSetPagination
from shared.tenant.mixins import TenantViewSetMixin
from apps.invoicing.models import (
    ProviderInvoice, InvoiceLine, InvoiceCoverageRequestLine,
    VoucherConsumption, InvoiceStatusHistory, ProviderInvoiceAttachment,
)
from apps.invoicing.serializers import (
    ProviderInvoiceListSerializer,
    ProviderInvoiceDetailSerializer,
    ProviderInvoiceCreateSerializer,
    ProviderInvoiceUpdateSerializer,
    ProviderInvoiceTransitionSerializer,
    AvailableVoucherSerializer,
    ProviderInvoiceStatisticsSerializer,
    ProviderInvoiceAttachmentSerializer,
    ProviderInvoiceAttachmentUploadSerializer,
)


class ProviderInvoiceViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [HasAnyModuleAccess("medical_coverage", "invoice")]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == "create":
            return ProviderInvoiceCreateSerializer
        elif self.action in ("update", "partial_update"):
            return ProviderInvoiceUpdateSerializer
        elif self.action == "retrieve":
            return ProviderInvoiceDetailSerializer
        return ProviderInvoiceListSerializer

    def get_queryset(self):
        qs = ProviderInvoice.objects.select_related(
            "partner", "convention", "created_by", "validated_by", "paid_by",
        ).prefetch_related(
            "lines", "lines__voucher", "lines__voucher__employee",
            "lines__voucher__beneficiary", "lines__voucher__coverage_type",
            "coverage_lines", "coverage_lines__coverage_request",
            "coverage_lines__coverage_request__employee",
            "coverage_lines__coverage_request__beneficiary",
            "consumptions", "consumptions__consumed_by",
            "status_history", "status_history__changed_by",
            "attachments", "attachments__uploaded_by",
        )
        params = self.request.query_params

        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("partner"):
            qs = qs.filter(partner_id=params["partner"])
        if params.get("category"):
            qs = qs.filter(category=params["category"])
        if params.get("year"):
            qs = qs.filter(year=params["year"])
        if params.get("month"):
            qs = qs.filter(month=params["month"])
        if params.get("period_start"):
            try:
                qs = qs.filter(period_start__gte=params["period_start"])
            except Exception:
                pass
        if params.get("period_end"):
            try:
                qs = qs.filter(period_end__lte=params["period_end"])
            except Exception:
                pass
        if params.get("date_from"):
            try:
                qs = qs.filter(created_at__gte=params["date_from"])
            except Exception:
                pass
        if params.get("date_to"):
            try:
                qs = qs.filter(created_at__lte=params["date_to"])
            except Exception:
                pass
        if params.get("amount_min"):
            try:
                qs = qs.filter(total_amount__gte=Decimal(params["amount_min"]))
            except Exception:
                pass
        if params.get("amount_max"):
            try:
                qs = qs.filter(total_amount__lte=Decimal(params["amount_max"]))
            except Exception:
                pass
        if params.get("search"):
            s = params["search"]
            qs = qs.filter(
                Q(reference__icontains=s) |
                Q(invoice_number__icontains=s) |
                Q(partner__name__icontains=s) |
                Q(partner__code__icontains=s)
            )
        if params.get("employee"):
            qs = qs.filter(lines__voucher__employee_id=params["employee"]).distinct()
        if params.get("beneficiary"):
            qs = qs.filter(lines__voucher__beneficiary_id=params["beneficiary"]).distinct()
        ordering = params.get("ordering", "-created_at")
        return qs.order_by(ordering)

    def create(self, request, *args, **kwargs):
        logger = logging.getLogger(__name__)
        partner_id = request.data.get("partner")
        month = request.data.get("month")
        year = request.data.get("year")
        if partner_id and month and year:
            existing = ProviderInvoice.objects.filter(
                partner_id=partner_id,
                month=int(month),
                year=int(year),
            ).exclude(status="cancelled").first()
            if existing:
                return Response(
                    {
                        "status": "error",
                        "code": "DUPLICATE_INVOICE",
                        "message": (
                            f"Une facture brouillon/validée existe déjà pour ce prestataire "
                            f"sur la période {month}/{year} (réf: {existing.reference})."
                        ),
                        "errors": {"existing_invoice_id": str(existing.id)},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as exc:
            logger.error("Create invoice validation failed. data=%s errors=%s", request.data, serializer.errors)
            # Exposer le message métier (ex: bon déjà consommé) en premier plan
            business_msg = _extract_business_message(exc.detail)
            payload = {
                "status": "error",
                "code": "VOUCHER_ALREADY_CONSUMED" if business_msg and "déjà été consommé" in business_msg else "VALIDATION_ERROR",
                "message": business_msg or "Les données soumises sont invalides.",
                "errors": serializer.errors,
            }
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.error("Create invoice validation failed. data=%s errors=%s", request.data, serializer.errors)
            raise
        invoice = serializer.save(created_by=request.user, updated_by=request.user)
        detail = ProviderInvoiceDetailSerializer(invoice, context={"request": request})
        return Response(
            {"status": "success", "data": detail.data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ProviderInvoiceDetailSerializer(instance, context={"request": request})
        return Response({"status": "success", "data": serializer.data})

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.status != "draft":
            return Response(
                {"status": "error", "message": "Seules les factures en brouillon peuvent être supprimées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Restaurer les statuts des bons/demandes avant suppression
        for line in invoice.lines.select_related("voucher").all():
            invoice.release_voucher_line(line)
        for line in invoice.coverage_lines.select_related("coverage_request").all():
            invoice.release_coverage_line(line)
        invoice.lines.all().delete()
        invoice.coverage_lines.all().delete()
        invoice.delete()
        return Response({"status": "success", "message": "Facture supprimée."}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        invoice = self.get_object()
        ser = ProviderInvoiceTransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action_val = ser.validated_data["action"]

        # ── Gardes de rôle (feuille de route : validation = Comptable/Validateur) ──
        # La validation/paiement/annulation d'une facture est une action financière :
        # réservée aux rôles disposant des permissions adéquates (admin bypass).
        required_permission = {
            "validate": "invoice.validate",
            "pay": "finance.process_payment",
            "cancel": "invoice.validate",
        }[action_val]
        if not user_has_permission(request.user, required_permission):
            return Response(
                {
                    "status": "error",
                    "message": (
                        "Vous n'avez pas la permission d'effectuer cette action "
                        "sur la facture."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            if action_val == "validate":
                if invoice.status != "draft":
                    return Response(
                        {"status": "error", "message": "Seules les factures en brouillon peuvent être validées."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                invoice.validate_invoice(request.user)
            elif action_val == "pay":
                if invoice.status != "validated":
                    return Response(
                        {"status": "error", "message": "Seules les factures validées peuvent être marquées comme payées."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                invoice.mark_paid(request.user)
            elif action_val == "cancel":
                if invoice.status not in ("draft", "validated", "paid"):
                    return Response(
                        {"status": "error", "message": "Cette facture ne peut pas être annulée."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                invoice.cancel_invoice(request.user)
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail = ProviderInvoiceDetailSerializer(invoice, context={"request": request})
        return Response({"status": "success", "data": detail.data})

    @action(detail=False, methods=["get"])
    def available_vouchers(self, request):
        partner_id = request.query_params.get("partner_id")
        month = request.query_params.get("month")
        year = request.query_params.get("year")
        category = request.query_params.get("category")

        if not all([partner_id, month, year]):
            return Response(
                {"status": "error", "message": "partner_id, month, and year are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            month = int(month)
            year = int(year)
        except (ValueError, TypeError):
            return Response(
                {"status": "error", "message": "month and year must be valid integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.medical_coverage.models import MedicalCoverageRequest

        CATEGORY_MAP = {
            "medical_analysis_lab": "analysis",
            "medical_imaging_center": "imaging",
            "medical_center": "center",
        }

        filters = {
            "partner_id": partner_id,
            # validated ET printed : un bon imprimé reste facturable
            "workflow_state__in": ["validated", "printed"],
            "consumption_status": "not_consumed",
        }
        if category:
            filters["category"] = CATEGORY_MAP.get(category, category)

        qs = MedicalCoverageRequest.objects.filter(
            **filters
        ).select_related("employee", "beneficiary", "partner")

        period_start = request.query_params.get("period_start")
        period_end = request.query_params.get("period_end")
        if period_start and period_end:
            qs = qs.filter(coverage_date__gte=period_start, coverage_date__lte=period_end)

        already_invoiced = InvoiceCoverageRequestLine.objects.filter(
            coverage_request__in=qs,
            invoice__status__in=("draft", "validated", "paid"),
        ).values_list("coverage_request_id", flat=True)
        qs = qs.exclude(id__in=already_invoiced)

        data = []
        for r in qs:
            data.append({
                "id": str(r.id),
                "request_number": r.request_number,
                "employee_name": f"{r.employee.first_name} {r.employee.last_name}",
                "employee_matricule": r.employee.matricule,
                "beneficiary_name": f"{r.beneficiary.first_name} {r.beneficiary.last_name}" if r.beneficiary else None,
                "category": r.category,
                "category_label": dict(MedicalCoverageRequest.Category.choices).get(r.category, r.category),
                "partner_name": r.partner.name if r.partner else None,
                "partner_code": r.partner.code if r.partner else None,
                "coverage_date": r.coverage_date.isoformat() if r.coverage_date else None,
                "validation_date": r.validation_date.isoformat() if r.validation_date else None,
                "workflow_state": r.workflow_state,
            })

        return Response({"status": "success", "count": len(data), "data": data})

    @action(detail=False, methods=["get"])
    def search_vouchers(self, request):
        query = request.query_params.get("q", "").strip()
        partner_id = request.query_params.get("partner_id", "").strip()

        from apps.medical_coverage.models import MedicalCoverageRequest

        CATEGORY_MAP = {
            "medical_analysis_lab": "analysis",
            "medical_imaging_center": "imaging",
            "medical_center": "center",
        }

        # validated ET printed : un bon imprimé reste facturable
        filters = {"workflow_state__in": ["validated", "printed"], "consumption_status": "not_consumed"}
        if partner_id:
            filters["partner_id"] = partner_id

        qs = MedicalCoverageRequest.objects.filter(
            **filters
        ).select_related("employee", "beneficiary", "partner")

        if query:
            qs = qs.filter(
                Q(request_number__icontains=query) |
                Q(employee__first_name__icontains=query) |
                Q(employee__last_name__icontains=query) |
                Q(employee__matricule__icontains=query) |
                Q(beneficiary__first_name__icontains=query) |
                Q(beneficiary__last_name__icontains=query)
            )

        already_invoiced = InvoiceCoverageRequestLine.objects.filter(
            coverage_request__in=qs,
            invoice__status__in=("draft", "validated", "paid"),
        ).values_list("coverage_request_id", flat=True)
        qs = qs.exclude(id__in=already_invoiced)

        data = []
        for r in qs[:50]:
            data.append({
                "id": str(r.id),
                "request_number": r.request_number,
                "employee_name": f"{r.employee.first_name} {r.employee.last_name}",
                "employee_matricule": r.employee.matricule,
                "beneficiary_name": f"{r.beneficiary.first_name} {r.beneficiary.last_name}" if r.beneficiary else None,
                "category": r.category,
                "category_label": dict(MedicalCoverageRequest.Category.choices).get(r.category, r.category),
                "partner_name": r.partner.name if r.partner else None,
                "partner_code": r.partner.code if r.partner else None,
                "coverage_date": r.coverage_date.isoformat() if r.coverage_date else None,
                "validation_date": r.validation_date.isoformat() if r.validation_date else None,
                "workflow_state": r.workflow_state,
            })

        return Response({"status": "success", "count": len(data), "data": data})

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        from apps.medical_coverage.models import MedicalCoverageVoucher
        from apps.medical_coverage.models import MedicalCoverageVoucher as MCV
        qs = ProviderInvoice.objects.all()

        total = qs.count()
        draft = qs.filter(status="draft").count()
        validated = qs.filter(status="validated").count()
        paid = qs.filter(status="paid").count()
        cancelled = qs.filter(status="cancelled").count()
        total_amount = qs.aggregate(s=Sum("total_amount"))["s"] or Decimal("0")
        paid_amount = qs.filter(status="paid").aggregate(s=Sum("total_amount"))["s"] or Decimal("0")
        validated_amount = qs.filter(status="validated").aggregate(s=Sum("total_amount"))["s"] or Decimal("0")

        by_partner = qs.values(
            "partner__name", "partner__id",
        ).annotate(
            count=Count("id"),
            amount=Sum("total_amount"),
        ).order_by("-amount")[:10]

        by_month = qs.filter(
            year=timezone.now().year,
        ).values("month").annotate(
            count=Count("id"),
            amount=Sum("total_amount"),
        ).order_by("month")

        by_category = qs.values("category").annotate(
            count=Count("id"),
            amount=Sum("total_amount"),
        ).order_by("-amount")

        voucher_stats = MedicalCoverageVoucher.objects.aggregate(
            consumed=Count("id", filter=Q(workflow_state="consumed")),
            invoiced=Count("id", filter=Q(workflow_state="invoiced")),
            approved=Count("id", filter=Q(workflow_state="approved")),
        )

        lines_qs = InvoiceLine.objects.filter(invoice__in=qs)
        top_employees = lines_qs.values(
            "voucher__employee__first_name", "voucher__employee__last_name",
            "voucher__employee__matricule",
        ).annotate(
            total=Sum("amount"),
            count=Count("id"),
        ).order_by("-total")[:10]

        top_beneficiaries = lines_qs.exclude(
            voucher__beneficiary__isnull=True
        ).values(
            "voucher__beneficiary__first_name", "voucher__beneficiary__last_name",
        ).annotate(
            total=Sum("amount"),
            count=Count("id"),
        ).order_by("-total")[:10]

        return Response({
            "status": "success",
            "data": {
                "total": total,
                "draft": draft,
                "validated": validated,
                "paid": paid,
                "cancelled": cancelled,
                "total_amount": float(total_amount),
                "validated_amount": float(validated_amount),
                "paid_amount": float(paid_amount),
                "by_partner": list(by_partner),
                "by_month": list(by_month),
                "by_category": list(by_category),
                "voucher_stats": voucher_stats,
                "top_employees": [
                    {
                        "name": f"{e['voucher__employee__first_name']} {e['voucher__employee__last_name']}",
                        "matricule": e["voucher__employee__matricule"],
                        "total": float(e["total"]),
                        "count": e["count"],
                    }
                    for e in top_employees
                ],
                "top_beneficiaries": [
                    {
                        "name": f"{b['voucher__beneficiary__first_name']} {b['voucher__beneficiary__last_name']}",
                        "total": float(b["total"]),
                        "count": b["count"],
                    }
                    for b in top_beneficiaries
                ],
            },
        })

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        logger = logging.getLogger(__name__)
        invoice = self.get_object()
        lines = invoice.lines.select_related(
            "voucher", "voucher__employee", "voucher__beneficiary", "voucher__coverage_type",
        ).all()

        ctx = {
            "invoice": invoice,
            "lines": lines,
        }

        template_name = "invoicing/invoice_pdf.html"
        try:
            html = render_to_string(template_name, ctx)
        except Exception as e:
            logger.error("Template rendering failed: %s", e)
            return Response(
                {"error": "Erreur lors de la génération du PDF"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                HTML(string=html).write_pdf(f.name)
                f.seek(0)
                pdf_content = f.read()
                os.unlink(f.name)
        except Exception as e:
            logger.error("PDF generation failed for invoice %s: %s", pk, e)
            return Response(
                {"error": "Erreur lors de la génération du PDF"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            if hasattr(invoice, 'printed_at'):
                invoice.printed_at = timezone.now()
                invoice.print_count = (invoice.print_count or 0) + 1
                invoice.save(update_fields=["printed_at", "print_count", "updated_at"])
        except Exception:
            pass

        mode = request.query_params.get("mode", "download")
        filename = f"{invoice.reference}.pdf"
        disposition = "inline" if mode == "preview" else f'attachment; filename="{filename}"'

        resp = HttpResponse(pdf_content, content_type="application/pdf")
        resp["Content-Disposition"] = disposition
        return resp

    @action(detail=True, methods=["post"], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload_attachment(self, request, pk=None):
        invoice = self.get_object()
        ser = ProviderInvoiceAttachmentUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        file = ser.validated_data["file"]
        attachment = ProviderInvoiceAttachment.objects.create(
            invoice=invoice,
            file=file,
            original_name=file.name,
            file_size=file.size,
            mime_type=file.content_type or "",
            description=ser.validated_data.get("description", ""),
            uploaded_by=request.user,
        )
        result = ProviderInvoiceAttachmentSerializer(attachment, context={"request": request})
        return Response({"status": "success", "data": result.data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"])
    def delete_attachment(self, request, pk=None):
        invoice = self.get_object()
        attachment_id = request.query_params.get("attachment_id")
        if not attachment_id:
            return Response(
                {"status": "error", "message": "attachment_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            attachment = invoice.attachments.get(id=attachment_id)
            attachment.file.delete(save=False)
            attachment.delete()
            return Response({"status": "success", "message": "Pièce jointe supprimée."})
        except ProviderInvoiceAttachment.DoesNotExist:
            return Response(
                {"status": "error", "message": "Pièce jointe introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
