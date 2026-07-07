from rest_framework import serializers
from core.serializers import BaseModelSerializer
from apps.invoicing.models import (
    ProviderInvoice, InvoiceLine, VoucherConsumption,
    InvoiceStatusHistory, ProviderInvoiceAttachment,
)


class InvoiceLineSerializer(BaseModelSerializer):
    voucher_reference = serializers.CharField(source="voucher.reference", read_only=True)
    voucher_employee_name = serializers.SerializerMethodField()
    voucher_employee_matricule = serializers.CharField(source="voucher.employee.matricule", read_only=True)
    voucher_beneficiary_name = serializers.SerializerMethodField()
    voucher_beneficiary_type = serializers.CharField(source="voucher.beneficiary_type", read_only=True)
    voucher_coverage_type = serializers.CharField(source="voucher.coverage_type.name", read_only=True)
    voucher_coverage_type_code = serializers.CharField(source="voucher.coverage_type.code", read_only=True)
    voucher_request_date = serializers.DateField(source="voucher.request_date", read_only=True)
    voucher_approved_amount = serializers.DecimalField(
        source="voucher.approved_amount", max_digits=12, decimal_places=2, allow_null=True, read_only=True
    )
    voucher_workflow_state = serializers.CharField(source="voucher.workflow_state", read_only=True)

    class Meta:
        model = InvoiceLine
        fields = [
            "id", "invoice", "voucher", "amount", "quantity", "unit_price", "notes",
            "voucher_reference", "voucher_employee_name", "voucher_employee_matricule",
            "voucher_beneficiary_name", "voucher_beneficiary_type", "voucher_coverage_type",
            "voucher_coverage_type_code", "voucher_request_date", "voucher_approved_amount",
            "voucher_workflow_state",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_voucher_employee_name(self, obj):
        return f"{obj.voucher.employee.first_name} {obj.voucher.employee.last_name}"

    def get_voucher_beneficiary_name(self, obj):
        if obj.voucher.beneficiary:
            return f"{obj.voucher.beneficiary.first_name} {obj.voucher.beneficiary.last_name}"
        return None


class InvoiceLineCreateSerializer(BaseModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ["voucher", "amount", "quantity", "unit_price", "notes"]


class VoucherConsumptionSerializer(BaseModelSerializer):
    consumed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VoucherConsumption
        fields = [
            "id", "invoice", "voucher", "amount",
            "consumed_at", "consumed_by", "consumed_by_name", "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "consumed_at"]

    def get_consumed_by_name(self, obj):
        if obj.consumed_by:
            return obj.consumed_by.get_full_name() or obj.consumed_by.email
        return None


class InvoiceStatusHistorySerializer(BaseModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceStatusHistory
        fields = [
            "id", "invoice", "status_from", "status_to",
            "changed_by", "changed_by_name", "changed_at", "notes",
        ]
        read_only_fields = ["id", "changed_at"]

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return None


class ProviderInvoiceAttachmentSerializer(BaseModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProviderInvoiceAttachment
        fields = [
            "id", "invoice", "file", "file_url", "original_name",
            "file_size", "mime_type", "description",
            "uploaded_by", "uploaded_by_name", "uploaded_at",
        ]
        read_only_fields = ["id", "file_size", "mime_type", "uploaded_at"]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None


class ProviderInvoiceListSerializer(BaseModelSerializer):
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    partner_code = serializers.CharField(source="partner.code", read_only=True)
    partner_category = serializers.CharField(source="partner.get_category_display", read_only=True)
    convention_reference = serializers.CharField(source="convention.reference", read_only=True, allow_null=True)
    convention_title = serializers.CharField(source="convention.title", read_only=True, allow_null=True)
    category_label = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    line_count = serializers.SerializerMethodField()
    validated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProviderInvoice
        fields = [
            "id", "reference", "invoice_number", "invoice_date",
            "period_start", "period_end",
            "partner", "partner_name", "partner_code", "partner_category",
            "convention", "convention_reference", "convention_title",
            "category", "category_label",
            "month", "year", "due_date", "status", "status_label",
            "total_amount", "total_covered_amount", "total_beneficiary_payment",
            "notes", "line_count",
            "validated_at", "validated_by", "validated_by_name",
            "paid_at", "paid_by",
            "created_at", "updated_at", "created_by_name",
        ]
        read_only_fields = fields

    def get_status_label(self, obj):
        return dict(ProviderInvoice.INVOICE_STATUS).get(obj.status, obj.status)

    def get_category_label(self, obj):
        return dict(ProviderInvoice.CATEGORY_CHOICES).get(obj.category, obj.category or "")

    def get_line_count(self, obj):
        return obj.lines.count()

    def get_validated_by_name(self, obj):
        if obj.validated_by:
            return obj.validated_by.get_full_name() or obj.validated_by.email
        return None


class ProviderInvoiceDetailSerializer(ProviderInvoiceListSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    consumptions = VoucherConsumptionSerializer(many=True, read_only=True)
    status_history = InvoiceStatusHistorySerializer(many=True, read_only=True)
    attachments = ProviderInvoiceAttachmentSerializer(many=True, read_only=True)

    class Meta(ProviderInvoiceListSerializer.Meta):
        fields = ProviderInvoiceListSerializer.Meta.fields + [
            "lines", "consumptions", "status_history", "attachments",
        ]


class ProviderInvoiceCreateSerializer(BaseModelSerializer):
    lines = InvoiceLineCreateSerializer(many=True)

    class Meta:
        model = ProviderInvoice
        fields = [
            "partner", "convention", "category",
            "month", "year",
            "invoice_number", "invoice_date", "period_start", "period_end",
            "due_date", "notes", "total_covered_amount",
            "lines",
        ]

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("Au moins une ligne de facture est requise.")
        return value

    def validate(self, attrs):
        from apps.invoicing.models import ProviderInvoice
        existing = ProviderInvoice.objects.filter(
            partner=attrs["partner"],
            month=attrs["month"],
            year=attrs["year"],
        ).exclude(status="cancelled").first()
        if existing:
            raise serializers.ValidationError(
                f"Une facture brouillon/validée existe déjà pour ce prestataire "
                f"sur la période {attrs['month']}/{attrs['year']} (réf: {existing.reference})."
            )
        return attrs

    def create(self, validated_data):
        lines_data = validated_data.pop("lines")
        invoice = ProviderInvoice.objects.create(**validated_data)
        for line_data in lines_data:
            InvoiceLine.objects.create(invoice=invoice, **line_data)
        invoice.update_total()
        return invoice


class InvoiceLineUpdateSerializer(BaseModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ["id", "amount", "quantity", "unit_price", "notes"]
        extra_kwargs = {"id": {"required": True}}


class ProviderInvoiceUpdateSerializer(BaseModelSerializer):
    lines = InvoiceLineUpdateSerializer(many=True, required=False)

    class Meta:
        model = ProviderInvoice
        fields = [
            "convention", "category",
            "invoice_number", "invoice_date", "period_start", "period_end",
            "due_date", "notes", "total_covered_amount",
            "lines",
        ]

    def validate(self, attrs):
        if self.instance and self.instance.status != "draft":
            raise serializers.ValidationError("Seules les factures en brouillon peuvent être modifiées.")
        return attrs

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data:
            for line_data in lines_data:
                line_id = line_data.pop("id", None)
                if line_id:
                    InvoiceLine.objects.filter(id=line_id, invoice=instance).update(**line_data)
            instance.update_total()
        return instance


class ProviderInvoiceTransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["validate", "pay", "cancel"])
    notes = serializers.CharField(required=False, allow_blank=True)


class AvailableVoucherSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    reference = serializers.CharField()
    employee_name = serializers.CharField()
    employee_matricule = serializers.CharField()
    beneficiary_name = serializers.CharField(allow_null=True)
    beneficiary_type = serializers.CharField(allow_null=True)
    beneficiary_relationship = serializers.CharField(allow_null=True)
    coverage_type_name = serializers.CharField()
    coverage_type_code = serializers.CharField()
    examination = serializers.CharField()
    request_date = serializers.DateField()
    approved_amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    workflow_state = serializers.CharField()


class ProviderInvoiceStatisticsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    draft = serializers.IntegerField()
    validated = serializers.IntegerField()
    paid = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    by_partner = serializers.ListField()
    by_month = serializers.ListField()
    by_category = serializers.ListField()
    voucher_stats = serializers.DictField()
    top_employees = serializers.ListField()
    top_beneficiaries = serializers.ListField()


class ProviderInvoiceAttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    description = serializers.CharField(required=False, allow_blank=True)
