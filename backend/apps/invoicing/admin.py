from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from apps.invoicing.models import (
    ProviderInvoice, InvoiceLine, VoucherConsumption,
    InvoiceStatusHistory, ProviderInvoiceAttachment,
)


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0
    readonly_fields = ["voucher", "amount", "notes"]


class VoucherConsumptionInline(admin.TabularInline):
    model = VoucherConsumption
    extra = 0
    readonly_fields = ["voucher", "amount", "consumed_at", "consumed_by"]


class InvoiceStatusHistoryInline(admin.TabularInline):
    model = InvoiceStatusHistory
    extra = 0
    readonly_fields = ["status_from", "status_to", "changed_by", "changed_at"]


class ProviderInvoiceAttachmentInline(admin.TabularInline):
    model = ProviderInvoiceAttachment
    extra = 0
    readonly_fields = ["file", "original_name", "file_size", "mime_type", "uploaded_by", "uploaded_at"]


@admin.register(ProviderInvoice)
class ProviderInvoiceAdmin(SimpleHistoryAdmin):
    list_display = ["reference", "partner_name", "category", "month", "year", "total_amount", "status", "invoice_number", "validated_at", "created_at"]
    list_filter = ["status", "category", "year", "month", "partner__category"]
    search_fields = ["reference", "partner__name", "partner__code", "invoice_number"]
    date_hierarchy = "created_at"
    readonly_fields = ["reference", "total_amount", "total_covered_amount", "total_beneficiary_payment", "validated_at", "validated_by", "paid_at", "paid_by", "created_at", "updated_at", "created_by", "updated_by"]
    inlines = [InvoiceLineInline, VoucherConsumptionInline, InvoiceStatusHistoryInline, ProviderInvoiceAttachmentInline]

    def partner_name(self, obj):
        return obj.partner.name
    partner_name.short_description = "Prestataire"


@admin.register(InvoiceLine)
class InvoiceLineAdmin(SimpleHistoryAdmin):
    list_display = ["invoice_ref", "voucher_ref", "amount", "created_at"]
    list_filter = ["invoice__status"]
    search_fields = ["invoice__reference", "voucher__reference"]

    def invoice_ref(self, obj):
        return obj.invoice.reference
    invoice_ref.short_description = "Facture"

    def voucher_ref(self, obj):
        return obj.voucher.reference
    voucher_ref.short_description = "Bon"


@admin.register(VoucherConsumption)
class VoucherConsumptionAdmin(SimpleHistoryAdmin):
    list_display = ["voucher_ref", "invoice_ref", "amount", "consumed_at", "consumed_by"]
    list_filter = ["consumed_at"]
    search_fields = ["voucher__reference", "invoice__reference"]

    def voucher_ref(self, obj):
        return obj.voucher.reference
    voucher_ref.short_description = "Bon"

    def invoice_ref(self, obj):
        return obj.invoice.reference
    invoice_ref.short_description = "Facture"


@admin.register(InvoiceStatusHistory)
class InvoiceStatusHistoryAdmin(SimpleHistoryAdmin):
    list_display = ["invoice_ref", "status_from", "status_to", "changed_by", "changed_at"]
    list_filter = ["status_to", "changed_at"]
    search_fields = ["invoice__reference"]

    def invoice_ref(self, obj):
        return obj.invoice.reference
    invoice_ref.short_description = "Facture"


@admin.register(ProviderInvoiceAttachment)
class ProviderInvoiceAttachmentAdmin(SimpleHistoryAdmin):
    list_display = ["invoice_ref", "original_name", "file_size", "mime_type", "uploaded_by", "uploaded_at"]
    list_filter = ["mime_type", "uploaded_at"]
    search_fields = ["original_name", "invoice__reference"]

    def invoice_ref(self, obj):
        return obj.invoice.reference
    invoice_ref.short_description = "Facture"
