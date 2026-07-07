from simple_history.admin import SimpleHistoryAdmin

from django.contrib import admin

from .models import Convention, ConventionAlert, ConventionDocument, Partner


class ConventionDocumentInline(admin.TabularInline):
    model = ConventionDocument
    extra = 0
    fields = ["doc_type", "original_name", "file_size", "created_at"]
    readonly_fields = ["file_size", "created_at"]
    can_delete = True


class ConventionAlertInline(admin.TabularInline):
    model = ConventionAlert
    extra = 0
    fields = ["alert_type", "severity", "title", "is_read", "is_resolved", "created_at"]
    readonly_fields = ["created_at"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Partner)
class PartnerAdmin(SimpleHistoryAdmin):
    list_display = [
        "code",
        "name",
        "type",
        "is_active",
        "city",
        "wilaya",
        "email",
        "phone",
        "contact_name",
        "medical_provider_link",
    ]
    list_filter = ["type", "is_active", "wilaya"]
    search_fields = ["code", "name", "email", "contact_name"]
    ordering = ["name"]
    fieldsets = [
        ("Identification", {"fields": ["code", "name", "type", "is_active"]}),
        (
            "Informations légales",
            {"fields": ["legal_form", "registration_number", "tax_id", "rc_number"]},
        ),
        ("Contact", {"fields": ["email", "phone", "website"]}),
        ("Adresse", {"fields": ["address", "city", "wilaya", "postal_code"]}),
        ("Personne de contact", {"fields": ["contact_name", "contact_phone", "contact_email"]}),
        ("Notes", {"fields": ["notes", "metadata"]}),
    ]

    def medical_provider_link(self, obj):
        mp = getattr(obj, "medical_provider", None)
        if mp:
            from django.utils.html import format_html
            url = f"/admin/medical_coverage/medicalprovider/{mp.pk}/change/"
            return format_html('<a href="{}">{}</a>', url, mp.name)
        return "—"
    medical_provider_link.short_description = "Prestataire médical"


@admin.register(Convention)
class ConventionAdmin(SimpleHistoryAdmin):
    list_display = [
        "reference",
        "title",
        "partner",
        "status",
        "start_date",
        "end_date",
        "amount",
        "days_until_expiry",
        "renewal_mode",
    ]
    list_filter = ["status", "renewal_mode", "start_date", "end_date"]
    search_fields = ["reference", "title", "partner__name", "partner__code"]
    ordering = ["-start_date"]
    date_hierarchy = "end_date"
    inlines = [ConventionDocumentInline, ConventionAlertInline]
    fieldsets = [
        ("Identification", {"fields": ["reference", "partner", "title", "description", "status"]}),
        (
            "Dates",
            {"fields": ["start_date", "end_date", "signed_date", "terminated_date", "renewed_at"]},
        ),
        ("Reconduction", {"fields": ["renewal_mode", "renewal_notice_days", "auto_renewal_days"]}),
        ("Financier", {"fields": ["amount"]}),
        ("Options", {"fields": ["requires_attachments", "ai_metadata", "analytics_data"]}),
    ]
    readonly_fields = ["reference", "renewed_at", "days_until_expiry", "duration"]

    def days_until_expiry(self, obj):
        return obj.days_until_expiry

    days_until_expiry.short_description = "Jours restants"

    def duration(self, obj):
        return obj.duration_display

    duration.short_description = "Durée"


@admin.register(ConventionAlert)
class ConventionAlertAdmin(SimpleHistoryAdmin):
    list_display = [
        "title",
        "convention",
        "alert_type",
        "severity",
        "is_read",
        "is_resolved",
        "created_at",
    ]
    list_filter = ["alert_type", "severity", "is_read", "is_resolved"]
    search_fields = ["title", "message", "convention__reference"]
    ordering = ["-created_at"]
    readonly_fields = ["resolved_at", "resolved_by"]

    def has_add_permission(self, request, obj=None):
        return False
