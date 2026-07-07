import uuid

from rest_framework import serializers

from core.serializers import BaseModelSerializer

from .models import Convention, ConventionAlert, ConventionDocument, Partner


class PartnerListSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    wilaya_display = serializers.SerializerMethodField()

    class Meta:
        model = Partner
        fields = [
            "id",
            "code",
            "name",
            "type",
            "type_display",
            "is_active",
            "city",
            "wilaya",
            "wilaya_display",
            "email",
            "phone",
            "contact_name",
            "category",
            "created_at",
        ]

    def get_wilaya_display(self, obj):
        return obj.wilaya


class PartnerSerializer(BaseModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = Partner
        fields = [
            "id",
            "code",
            "name",
            "type",
            "type_display",
            "is_active",
            "legal_form",
            "registration_number",
            "tax_id",
            "rc_number",
            "email",
            "phone",
            "website",
            "address",
            "city",
            "wilaya",
            "postal_code",
            "contact_name",
            "contact_phone",
            "contact_email",
            "category",
            "gps_coordinates",
            "description",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
            "created_by_name",
        ]


class PartnerCreateSerializer(serializers.ModelSerializer):
    category = serializers.ChoiceField(choices=[
        "medical_analysis_lab",
        "medical_center",
        "medical_imaging_center",
    ], required=True)
    code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    type = serializers.CharField(required=False, default="other")

    class Meta:
        model = Partner
        fields = [
            "code",
            "name",
            "type",
            "is_active",
            "legal_form",
            "registration_number",
            "tax_id",
            "rc_number",
            "email",
            "phone",
            "website",
            "address",
            "city",
            "wilaya",
            "postal_code",
            "contact_name",
            "contact_phone",
            "contact_email",
            "category",
            "gps_coordinates",
            "description",
            "notes",
            "metadata",
        ]

    def validate(self, attrs):
        if not attrs.get("code"):
            attrs["code"] = f"PRT-{uuid.uuid4().hex[:8].upper()}"
        else:
            attrs["code"] = attrs["code"].upper().strip()
        return attrs


class ConventionListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    partner_code = serializers.CharField(source="partner.code", read_only=True)
    days_until_expiry = serializers.ReadOnlyField()
    duration_display = serializers.ReadOnlyField()

    class Meta:
        model = Convention
        fields = [
            "id",
            "reference",
            "partner",
            "partner_name",
            "partner_code",
            "title",
            "status",
            "status_display",
            "start_date",
            "end_date",
            "amount",
            "days_until_expiry",
            "duration_display",
            "renewal_mode",
            "covered_services",
            "created_at",
        ]


class ConventionSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    renewal_mode_display = serializers.CharField(source="get_renewal_mode_display", read_only=True)
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    partner_code = serializers.CharField(source="partner.code", read_only=True)
    days_until_expiry = serializers.ReadOnlyField()
    duration_display = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    is_expiring_soon = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Convention
        fields = [
            "id",
            "reference",
            "partner",
            "partner_name",
            "partner_code",
            "title",
            "description",
            "status",
            "status_display",
            "renewal_mode",
            "renewal_mode_display",
            "renewal_notice_days",
            "start_date",
            "end_date",
            "signed_date",
            "terminated_date",
            "renewed_at",
            "amount",
            "auto_renewal_days",
            "requires_attachments",
            "days_until_expiry",
            "duration_display",
            "is_expired",
            "is_expiring_soon",
            "is_active",
            "ai_metadata",
            "analytics_data",
            "covered_services",
            "created_at",
            "updated_at",
            "created_by_name",
        ]


class ConventionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Convention
        fields = [
            "partner",
            "title",
            "description",
            "renewal_mode",
            "renewal_notice_days",
            "start_date",
            "end_date",
            "signed_date",
            "amount",
            "auto_renewal_days",
            "requires_attachments",
            "covered_services",
        ]

    def validate(self, attrs):
        if attrs["start_date"] >= attrs["end_date"]:
            raise serializers.ValidationError(
                {"end_date": "La date d'échéance doit être après la date d'effet."}
            )
        return attrs


class ConventionRenewSerializer(serializers.Serializer):
    new_end_date = serializers.DateField()
    new_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class ConventionDocumentSerializer(BaseModelSerializer):
    doc_type_display = serializers.CharField(source="get_doc_type_display", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ConventionDocument
        fields = [
            "id",
            "convention",
            "doc_type",
            "doc_type_display",
            "file",
            "file_url",
            "original_name",
            "description",
            "file_size",
            "mime_type",
            "created_at",
            "updated_at",
            "created_by_name",
        ]
        read_only_fields = ["id", "file_size", "mime_type", "created_at", "updated_at"]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class ConventionDocumentUploadSerializer(serializers.Serializer):
    doc_type = serializers.ChoiceField(choices=ConventionDocument.DocType.choices)
    file = serializers.FileField()
    description = serializers.CharField(required=False, allow_blank=True)


class ConventionAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    convention_reference = serializers.CharField(source="convention.reference", read_only=True)
    convention_title = serializers.CharField(source="convention.title", read_only=True)

    class Meta:
        model = ConventionAlert
        fields = [
            "id",
            "convention",
            "convention_reference",
            "convention_title",
            "alert_type",
            "alert_type_display",
            "severity",
            "severity_display",
            "title",
            "message",
            "is_read",
            "is_resolved",
            "resolved_at",
            "ai_generated",
            "ai_confidence",
            "metadata",
            "created_at",
        ]
