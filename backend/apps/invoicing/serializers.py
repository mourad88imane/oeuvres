from rest_framework import serializers
from core.serializers import BaseModelSerializer
from apps.invoicing.models import (
    ProviderInvoice, InvoiceLine, InvoiceCoverageRequestLine,
    VoucherConsumption, InvoiceStatusHistory, ProviderInvoiceAttachment,
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


class CoverageRequestLineCreateSerializer(BaseModelSerializer):
    class Meta:
        model = InvoiceCoverageRequestLine
        fields = ["coverage_request", "amount", "notes"]


class CoverageRequestLineListSerializer(BaseModelSerializer):
    request_number = serializers.CharField(source="coverage_request.request_number", read_only=True)
    employee_name = serializers.SerializerMethodField()
    employee_matricule = serializers.CharField(source="coverage_request.employee.matricule", read_only=True)
    beneficiary_name = serializers.SerializerMethodField()
    category = serializers.CharField(source="coverage_request.category", read_only=True)
    coverage_date = serializers.DateField(source="coverage_request.coverage_date", read_only=True)
    workflow_state = serializers.CharField(source="coverage_request.workflow_state", read_only=True)

    class Meta:
        model = InvoiceCoverageRequestLine
        fields = [
            "id", "coverage_request", "amount", "notes",
            "request_number", "employee_name", "employee_matricule",
            "beneficiary_name", "category", "coverage_date", "workflow_state",
        ]

    def get_employee_name(self, obj):
        return f"{obj.coverage_request.employee.first_name} {obj.coverage_request.employee.last_name}"

    def get_beneficiary_name(self, obj):
        if obj.coverage_request.beneficiary:
            return f"{obj.coverage_request.beneficiary.first_name} {obj.coverage_request.beneficiary.last_name}"
        return None


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
    coverage_lines = CoverageRequestLineListSerializer(many=True, read_only=True)
    consumptions = VoucherConsumptionSerializer(many=True, read_only=True)
    status_history = InvoiceStatusHistorySerializer(many=True, read_only=True)
    attachments = ProviderInvoiceAttachmentSerializer(many=True, read_only=True)

    class Meta(ProviderInvoiceListSerializer.Meta):
        fields = ProviderInvoiceListSerializer.Meta.fields + [
            "lines", "coverage_lines", "consumptions", "status_history", "attachments",
        ]


class ProviderInvoiceCreateSerializer(BaseModelSerializer):
    lines = InvoiceLineCreateSerializer(many=True, required=False)
    coverage_request_lines = CoverageRequestLineCreateSerializer(many=True, required=False)

    class Meta:
        model = ProviderInvoice
        fields = [
            "partner", "convention", "category",
            "month", "year",
            "invoice_number", "invoice_date", "period_start", "period_end",
            "due_date", "notes", "total_covered_amount",
            "lines", "coverage_request_lines",
        ]

    def validate(self, attrs):
        lines = attrs.get("lines") or []
        coverage_lines = attrs.get("coverage_request_lines") or []
        if not lines and not coverage_lines:
            raise serializers.ValidationError("Au moins une ligne de facture est requise.")
        self._check_consumption_conflicts(lines, coverage_lines, invoice=None)
        # Cohérence prestataire : les bons ajoutés doivent appartenir au
        # prestataire de la facture (règle contrôlée côté backend).
        partner = attrs.get("partner")
        for line_data in coverage_lines:
            cr = line_data.get("coverage_request")
            if cr and partner and cr.partner_id != partner.id:
                raise serializers.ValidationError({
                    "coverage_request_lines": [
                        "Le bon sélectionné ne correspond pas au prestataire "
                        "de la facture."
                    ]
                })
        # NOTE : les lignes legacy (voucher -> MedicalCoverageVoucher.provider ->
        # MedicalProvider) n'ont aucun lien avec Partner ; la règle I1b de
        # cohérence prestataire s'applique aux lignes de demandes
        # (coverage_request_lines -> MedicalCoverageRequest.partner), qui sont
        # les seules utilisées par le workflow actuel.
        return attrs

    def _check_consumption_conflicts(self, lines, coverage_lines, invoice):
        """
        Un bon déjà consommé (ou déjà lié à une autre facture active) ne peut
        pas être ajouté à une autre facture. Règle contrôlée par le backend.
        """
        consumed_msg = (
            "Ce bon de prise en charge a déjà été consommé et ne peut pas être "
            "ajouté à une autre facture."
        )
        for line_data in lines:
            voucher = line_data.get("voucher")
            if not voucher:
                continue
            if voucher.workflow_state in ("consumed", "invoiced"):
                raise serializers.ValidationError({"lines": [consumed_msg]})
            if invoice is None:
                already = InvoiceLine.objects.filter(
                    voucher=voucher,
                    invoice__status__in=["draft", "validated", "paid"],
                ).exists()
            else:
                already = invoice.is_voucher_consumed_elsewhere(voucher.id)
            if already:
                raise serializers.ValidationError({"lines": [consumed_msg]})
        for line_data in coverage_lines:
            cr = line_data.get("coverage_request")
            if not cr:
                continue
            if cr.consumption_status == "consumed" or cr.invoice_status == "invoiced":
                raise serializers.ValidationError({"coverage_request_lines": [consumed_msg]})
            if invoice is None:
                already = InvoiceCoverageRequestLine.objects.filter(
                    coverage_request=cr,
                    invoice__status__in=["draft", "validated", "paid"],
                ).exists()
            else:
                already = invoice.is_request_consumed_elsewhere(cr.id)
            if already:
                raise serializers.ValidationError({"coverage_request_lines": [consumed_msg]})


    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        coverage_lines_data = validated_data.pop("coverage_request_lines", [])
        request = self.context.get("request")
        tenant = getattr(request, "tenant", None) if request else None
        invoice = ProviderInvoice.objects.create(**validated_data, tenant=tenant)
        user = request.user if request else None
        for line_data in lines_data:
            line = InvoiceLine.objects.create(invoice=invoice, tenant=tenant, **line_data)
            invoice.consume_voucher_line(line, user)
        for line_data in coverage_lines_data:
            line = InvoiceCoverageRequestLine.objects.create(invoice=invoice, tenant=tenant, **line_data)
            invoice.consume_coverage_line(line, user)
        invoice.update_total()
        return invoice


class InvoiceLineUpdateSerializer(BaseModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ["id", "voucher", "amount", "quantity", "unit_price", "notes"]
        extra_kwargs = {"id": {"required": False}, "voucher": {"required": False}}


class CoverageRequestLineUpdateSerializer(BaseModelSerializer):
    class Meta:
        model = InvoiceCoverageRequestLine
        fields = ["id", "coverage_request", "amount", "notes"]
        extra_kwargs = {"id": {"required": False}}


class ProviderInvoiceUpdateSerializer(BaseModelSerializer):
    lines = InvoiceLineUpdateSerializer(many=True, required=False)
    coverage_request_lines = CoverageRequestLineUpdateSerializer(many=True, required=False, source="coverage_lines")

    class Meta:
        model = ProviderInvoice
        fields = [
            "convention", "category",
            "month", "year",
            "period_start", "period_end",
            "invoice_number", "invoice_date",
            "due_date", "notes", "total_covered_amount",
            "lines", "coverage_request_lines",
        ]

    def validate(self, attrs):
        if self.instance and self.instance.status != "draft":
            raise serializers.ValidationError("Seules les factures en brouillon peuvent être modifiées.")
        # Les lignes déjà présentes dans CETTE facture sont des mises à jour,
        # pas de nouveaux ajouts : seule la consommation ailleurs est un conflit.
        existing_request_ids = set(
            self.instance.coverage_lines.values_list("coverage_request_id", flat=True)
        )
        existing_voucher_ids = set(
            self.instance.lines.values_list("voucher_id", flat=True)
        )
        new_lines = [
            d for d in (attrs.get("lines") or [])
            if not d.get("id") and d.get("voucher") and d["voucher"].id not in existing_voucher_ids
        ]
        new_coverage = [
            d for d in (attrs.get("coverage_lines") or [])
            if not d.get("id") and d.get("coverage_request") and d["coverage_request"].id not in existing_request_ids
        ]
        self._check_consumption_conflicts(new_lines, new_coverage, invoice=self.instance)
        # Cohérence prestataire : les bons ajoutés doivent appartenir au
        # prestataire de la facture (règle contrôlée côté backend).
        partner = self.instance.partner if self.instance else None
        for line_data in (attrs.get("coverage_lines") or []):
            cr = line_data.get("coverage_request")
            if cr and partner and cr.partner_id != partner.id:
                raise serializers.ValidationError({
                    "coverage_request_lines": [
                        "Le bon sélectionné ne correspond pas au prestataire "
                        "de la facture."
                    ]
                })
        # Les lignes legacy (voucher -> MedicalProvider) n'ont pas de lien avec
        # Partner : la cohérence prestataire s'applique aux lignes de demandes.
        return attrs

    def _check_consumption_conflicts(self, lines, coverage_lines, invoice):
        consumed_msg = (
            "Ce bon de prise en charge a déjà été consommé et ne peut pas être "
            "ajouté à une autre facture."
        )
        for line_data in lines:
            voucher = line_data.get("voucher")
            if not voucher:
                continue
            if voucher.workflow_state in ("consumed", "invoiced"):
                raise serializers.ValidationError({"lines": [consumed_msg]})
            if invoice.is_voucher_consumed_elsewhere(voucher.id):
                raise serializers.ValidationError({"lines": [consumed_msg]})
        for line_data in coverage_lines:
            cr = line_data.get("coverage_request")
            if not cr:
                continue
            if cr.consumption_status == "consumed" or cr.invoice_status == "invoiced":
                raise serializers.ValidationError({"coverage_request_lines": [consumed_msg]})
            if invoice.is_request_consumed_elsewhere(cr.id):
                raise serializers.ValidationError({"coverage_request_lines": [consumed_msg]})


    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        coverage_lines_data = validated_data.pop("coverage_lines", None)
        user = self.context.get("request").user if self.context.get("request") else None
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None:
            self._sync_voucher_lines(instance, lines_data, user)
        if coverage_lines_data is not None:
            self._sync_coverage_lines(instance, coverage_lines_data, user)
        instance.update_total()
        return instance

    def _sync_voucher_lines(self, instance, lines_data, user):
        """Synchronise les lignes de bons : ajout → consommé, retrait → restauré."""
        current = {str(l.id): l for l in instance.lines.all()}
        current_voucher_ids = {str(l.voucher_id): l for l in instance.lines.all()}
        incoming_ids = {str(d.get("id")) for d in lines_data if d.get("id")}
        incoming_voucher_ids = {
            str(d.get("voucher").id) for d in lines_data if d.get("voucher")
        }
        # Lignes retirées de la facture éditable → restauration du statut.
        # Suppression PHYSIQUE : un soft-delete laisserait la ligne visible des
        # contraintes unique_together/unique_voucher_per_invoice en base et
        # ferait échouer un futur ré-ajout du même bon (IntegrityError).
        for line_id, line in current.items():
            if line_id not in incoming_ids and str(line.voucher_id) not in incoming_voucher_ids:
                instance.release_voucher_line(line)
                InvoiceLine.all_objects.filter(id=line.id, invoice=instance).delete()
        for line_data in lines_data:
            line_id = line_data.get("id")
            if line_id and str(line_id) in current:
                line = current[str(line_id)]
                InvoiceLine.objects.filter(id=line.id, invoice=instance).update(
                    **{k: v for k, v in line_data.items() if k != "id" and k != "voucher"}
                )
                # Rattrapage : la ligne appartient déjà à cette facture → le bon
                # doit être consommé (idempotent, rattrape les lignes créées
                # avant la règle de consommation à l'ajout).
                instance.consume_voucher_line(line, user)
            else:
                line = InvoiceLine.objects.create(invoice=instance, tenant=instance.tenant, **line_data)
                instance.consume_voucher_line(line, user)

    def _sync_coverage_lines(self, instance, lines_data, user):
        """Synchronise les lignes de demandes : ajout → consommé, retrait → restauré."""
        current = {str(l.id): l for l in instance.coverage_lines.all()}
        current_request_ids = {str(l.coverage_request_id): l for l in instance.coverage_lines.all()}
        incoming_ids = {str(d.get("id")) for d in lines_data if d.get("id")}
        incoming_request_ids = {
            str(d.get("coverage_request").id) for d in lines_data if d.get("coverage_request")
        }
        # Lignes retirées de la facture éditable → restauration du statut.
        # Suppression PHYSIQUE : un soft-delete laisserait la ligne visible de la
        # contrainte unique_together [invoice, coverage_request] en base et
        # ferait échouer un futur ré-ajout de la même demande (IntegrityError).
        for line_id, line in current.items():
            if line_id not in incoming_ids and str(line.coverage_request_id) not in incoming_request_ids:
                instance.release_coverage_line(line)
                InvoiceCoverageRequestLine.all_objects.filter(id=line.id, invoice=instance).delete()
        for line_data in lines_data:
            line_id = line_data.get("id")
            existing = None
            if line_id and str(line_id) in current:
                existing = current[str(line_id)]
            elif line_data.get("coverage_request") and str(line_data["coverage_request"].id) in current_request_ids:
                existing = current_request_ids[str(line_data["coverage_request"].id)]
            if existing:
                InvoiceCoverageRequestLine.objects.filter(id=existing.id, invoice=instance).update(
                    **{k: v for k, v in line_data.items() if k != "id" and k != "coverage_request"}
                )
                # Rattrapage : la demande appartient déjà à cette facture → elle
                # doit être consommée/facturée (idempotent).
                instance.consume_coverage_line(existing, user)
            else:
                line = InvoiceCoverageRequestLine.objects.create(invoice=instance, tenant=instance.tenant, **line_data)
                instance.consume_coverage_line(line, user)


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
