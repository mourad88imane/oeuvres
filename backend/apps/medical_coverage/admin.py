from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from apps.medical_coverage.models import (
    MedicalCoverageVoucher, MedicalCoverageType, MedicalProvider,
    MedicalCoverageRequest,
)


@admin.register(MedicalCoverageType)
class MedicalCoverageTypeAdmin(SimpleHistoryAdmin):
    list_display = ["code", "name", "is_active", "waiting_period_months", "max_per_year"]
    list_filter = ["is_active"]
    search_fields = ["code", "name"]


@admin.register(MedicalProvider)
class MedicalProviderAdmin(SimpleHistoryAdmin):
    list_display = ["name", "type", "city", "is_active", "partner_link"]
    list_filter = ["type", "is_active", "city"]
    search_fields = ["name", "city", "phone", "partner__code", "partner__name"]
    raw_id_fields = ["partner"]

    def partner_link(self, obj):
        if obj.partner_id:
            from django.utils.html import format_html
            url = f"/admin/conventions/partner/{obj.partner_id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.partner.name)
        return "—"
    partner_link.short_description = "Partenaire"


@admin.register(MedicalCoverageVoucher)
class MedicalCoverageVoucherAdmin(SimpleHistoryAdmin):
    list_display = [
        "reference", "coverage_type", "employee_name", "beneficiary_type",
        "workflow_state", "request_date", "created_at",
    ]
    list_filter = ["workflow_state", "coverage_type", "beneficiary_type"]
    search_fields = ["reference", "employee__first_name", "employee__last_name"]
    date_hierarchy = "request_date"
    readonly_fields = [
        "reference", "voucher_number", "created_at", "updated_at",
        "created_by", "updated_by", "next_eligible_date",
    ]

    def employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    employee_name.short_description = "Employé"


@admin.register(MedicalCoverageRequest)
class MedicalCoverageRequestAdmin(SimpleHistoryAdmin):
    list_display = [
        "request_number", "category", "employee_name", "workflow_state",
        "coverage_date", "validation_date", "created_at",
    ]
    list_filter = ["workflow_state", "category"]
    search_fields = ["request_number", "employee__first_name", "employee__last_name"]
    date_hierarchy = "coverage_date"
    readonly_fields = ["request_number", "created_at", "updated_at", "created_by", "updated_by"]

    def employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    employee_name.short_description = "Employé"
