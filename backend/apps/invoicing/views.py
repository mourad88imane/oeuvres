from decimal import Decimal
from django.db.models import Count, Sum, Q, Avg
from django.utils import timezone
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsStaff
from core.pagination import StandardResultsSetPagination
from shared.tenant.mixins import TenantViewSetMixin
from apps.invoicing.models import (
    ProviderInvoice, InvoiceLine, VoucherConsumption,
    InvoiceStatusHistory, ProviderInvoiceAttachment,
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
    permission_classes = [IsStaff]
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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
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
        invoice.lines.all().delete()
        invoice.delete()
        return Response({"status": "success", "message": "Facture supprimée."}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        invoice = self.get_object()
        ser = ProviderInvoiceTransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action_val = ser.validated_data["action"]

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

        from apps.medical_coverage.models import MedicalCoverageVoucher

        vouchers = MedicalCoverageVoucher.objects.filter(
            provider__partner_id=partner_id,
            workflow_state__in=["approved"],
        ).select_related("employee", "beneficiary", "coverage_type")

        if request.query_params.get("employee_id"):
            vouchers = vouchers.filter(employee_id=request.query_params["employee_id"])
        if request.query_params.get("beneficiary_id"):
            vouchers = vouchers.filter(beneficiary_id=request.query_params["beneficiary_id"])

        period_start = request.query_params.get("period_start")
        period_end = request.query_params.get("period_end")
        if period_start and period_end:
            vouchers = vouchers.filter(request_date__gte=period_start, request_date__lte=period_end)
        else:
            vouchers = vouchers.filter(request_date__year=year, request_date__month=month)

        already_consumed = set(VoucherConsumption.objects.filter(
            voucher__in=vouchers,
        ).values_list("voucher_id", flat=True))

        already_invoiced = set(ProviderInvoice.objects.filter(
            lines__voucher__in=vouchers,
        ).exclude(status="cancelled").values_list("lines__voucher_id", flat=True))

        excluded = already_consumed | already_invoiced

        data = []
        for v in vouchers:
            if v.id in excluded:
                continue
            beneficiary_type_label = v.get_beneficiary_type_display() if v.beneficiary_type else None
            relationship = (
                "Ayant droit" if v.beneficiary_type == "dependent"
                else "Employé" if v.beneficiary_type == "employee"
                else None
            )
            data.append({
                "id": str(v.id),
                "reference": v.reference,
                "employee_name": f"{v.employee.first_name} {v.employee.last_name}",
                "employee_matricule": v.employee.matricule,
                "beneficiary_name": f"{v.beneficiary.first_name} {v.beneficiary.last_name}" if v.beneficiary else None,
                "beneficiary_type": beneficiary_type_label,
                "beneficiary_relationship": relationship,
                "coverage_type_name": v.coverage_type.name,
                "coverage_type_code": v.coverage_type.code,
                "examination": v.coverage_type.name,
                "request_date": v.request_date.isoformat(),
                "approved_amount": float(v.approved_amount) if v.approved_amount else None,
                "workflow_state": v.workflow_state,
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
