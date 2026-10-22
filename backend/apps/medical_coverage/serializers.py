from rest_framework import serializers
from core.serializers import BaseModelSerializer
from apps.medical_coverage.models import (
    MedicalCoverageVoucher, MedicalCoverageType, MedicalProvider,
    MedicalCoverageRequest,
)


class MedicalCoverageTypeSerializer(BaseModelSerializer):
    class Meta:
        model = MedicalCoverageType
        fields = [
            "id", "code", "name", "description", "is_active",
            "waiting_period_months", "max_per_year",
            "requires_provider", "color", "icon",
        ]
        read_only_fields = ["id"]


class MedicalProviderSerializer(BaseModelSerializer):
    class Meta:
        model = MedicalProvider
        fields = [
            "id", "name", "type", "coverage_types", "address",
            "phone", "email", "city", "is_active",
        ]
        read_only_fields = ["id"]


class MedicalCoverageVoucherListSerializer(BaseModelSerializer):
    coverage_type_name = serializers.CharField(source="coverage_type.name", read_only=True)
    coverage_type_code = serializers.CharField(source="coverage_type.code", read_only=True)
    coverage_type_color = serializers.CharField(source="coverage_type.color", read_only=True)
    employee_name = serializers.SerializerMethodField()
    employee_matricule = serializers.CharField(source="employee.matricule", read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True, default="")
    provider_name = serializers.CharField(source="provider.name", read_only=True, default="")
    beneficiary_name = serializers.SerializerMethodField()
    state_label = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default=None)

    class Meta:
        model = MedicalCoverageVoucher
        fields = [
            "id", "reference", "coverage_type", "coverage_type_name",
            "coverage_type_code", "coverage_type_color",
            "employee", "employee_name", "employee_matricule", "department_name",
            "beneficiary_type", "beneficiary", "beneficiary_name",
            "provider", "provider_name",
            "request_date", "expected_date",
            "workflow_state", "state_label",
            "observations", "rejection_reason",
            "next_eligible_date", "voucher_number", "consumed_at",
            "created_at", "updated_at", "created_by_name",
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_beneficiary_name(self, obj):
        if obj.beneficiary:
            return f"{obj.beneficiary.first_name} {obj.beneficiary.last_name}"
        return None

    def get_state_label(self, obj):
        return dict(MedicalCoverageVoucher.VOUCHER_STATUS).get(
            obj.workflow_state, obj.workflow_state
        )


class MedicalCoverageVoucherDetailSerializer(MedicalCoverageVoucherListSerializer):
    coverage_type_info = MedicalCoverageTypeSerializer(source="coverage_type", read_only=True)
    available_transitions = serializers.SerializerMethodField()

    class Meta(MedicalCoverageVoucherListSerializer.Meta):
        fields = MedicalCoverageVoucherListSerializer.Meta.fields + [
            "coverage_type_info", "available_transitions",
        ]

    def get_available_transitions(self, obj):
        from apps.medical_coverage.services import MedicalCoverageService
        svc = MedicalCoverageService()
        request = self.context.get("request")
        user = request.user if request else None
        if not user:
            return []
        return svc.get_available_transitions(obj.id, user)


class MedicalCoverageVoucherCreateSerializer(BaseModelSerializer):
    class Meta:
        model = MedicalCoverageVoucher
        fields = [
            "coverage_type", "employee", "beneficiary_type",
            "beneficiary", "provider", "request_date",
            "expected_date", "observations",
        ]

    def validate(self, attrs):
        from apps.medical_coverage.services import MedicalCoverageService
        svc = MedicalCoverageService()
        coverage_type = attrs["coverage_type"]
        employee = attrs["employee"]
        request_date = attrs.get("request_date")

        if attrs.get("beneficiary_type") == "dependent" and attrs.get("beneficiary"):
            result = svc.eligibility.check_dependent_eligibility(
                employee=employee,
                dependent=attrs["beneficiary"],
                coverage_type=coverage_type,
                request_date=request_date,
            )
        else:
            result = svc.eligibility.check_employee_eligibility(
                employee=employee,
                coverage_type=coverage_type,
                request_date=request_date,
            )

        attrs["_eligibility_result"] = result
        return attrs


class MedicalCoverageVoucherTransitionSerializer(serializers.Serializer):
    to_state = serializers.ChoiceField(choices=[s[0] for s in MedicalCoverageVoucher.VOUCHER_STATUS])
    reason = serializers.CharField(required=False, allow_blank=True)


class MedicalCoverageVoucherUpdateSerializer(BaseModelSerializer):
    class Meta:
        model = MedicalCoverageVoucher
        fields = ["observations", "expected_date", "provider", "beneficiary"]


class EmployeeEligibilitySerializer(serializers.Serializer):
    employee_id = serializers.CharField()
    coverage_type_code = serializers.CharField(required=False, allow_blank=True)
    request_date = serializers.DateField(required=False)

    class Meta:
        fields = ["employee_id", "coverage_type_code", "request_date"]


class MedicalCoverageRequestListSerializer(BaseModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_matricule = serializers.CharField(source="employee.matricule", read_only=True)
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    beneficiary_name = serializers.SerializerMethodField()
    state_label = serializers.SerializerMethodField()
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default=None)

    class Meta:
        model = MedicalCoverageRequest
        fields = [
            "id", "request_number", "category", "category_display",
            "partner", "partner_name",
            "employee", "employee_name", "employee_matricule",
            "beneficiary", "beneficiary_name",
            "coverage_date", "validation_date",
            "observation", "workflow_state", "state_label",
            "printed_at", "print_count",
            "voucher_number", "consumption_status", "invoice_status", "consumed_at",
            "created_at", "created_by_name",
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.get_full_name()

    def get_beneficiary_name(self, obj):
        return obj.beneficiary.get_full_name() if obj.beneficiary else None

    def get_state_label(self, obj):
        return dict(MedicalCoverageRequest.Status.choices).get(
            obj.workflow_state, obj.workflow_state
        )


class MedicalCoverageRequestDetailSerializer(MedicalCoverageRequestListSerializer):
    available_transitions = serializers.SerializerMethodField()

    class Meta(MedicalCoverageRequestListSerializer.Meta):
        fields = MedicalCoverageRequestListSerializer.Meta.fields + ["available_transitions"]

    def get_available_transitions(self, obj):
        from apps.medical_coverage.services import MedicalCoverageRequestService
        svc = MedicalCoverageRequestService()
        request = self.context.get("request")
        user = request.user if request else None
        if not user:
            return []
        return svc.get_available_transitions(obj.id, user)


class MedicalCoverageRequestCreateSerializer(BaseModelSerializer):
    # Correspondance catégorie de demande -> catégorie de partenaire.
    # La règle « Catégorie → Prestataire » est contrôlée côté BACKEND (et non
    # seulement côté frontend) : un prestataire d'une autre catégorie est refusé.
    CATEGORY_PARTNER_MAP = {
        "analysis": "medical_analysis_lab",
        "imaging": "medical_imaging_center",
        "center": "medical_center",
    }

    class Meta:
        model = MedicalCoverageRequest
        fields = [
            "category", "partner", "employee", "beneficiary",
            "coverage_date", "observation",
        ]

    def validate_partner(self, value):
        from apps.conventions.models import Convention
        if not value.conventions.filter(status=Convention.Status.ACTIVE).exists():
            raise serializers.ValidationError(
                "Ce partenaire n'a pas de convention active."
            )
        return value

    def validate(self, attrs):
        category = attrs.get("category")
        partner = attrs.get("partner")
        if category and partner:
            expected = self.CATEGORY_PARTNER_MAP.get(category)
            if expected and partner.category != expected:
                raise serializers.ValidationError(
                    "Le prestataire sélectionné ne correspond pas à la catégorie "
                    "de la demande."
                )
        return attrs


class MedicalCoverageRequestUpdateSerializer(MedicalCoverageRequestCreateSerializer):
    class Meta(MedicalCoverageRequestCreateSerializer.Meta):
        fields = MedicalCoverageRequestCreateSerializer.Meta.fields

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)
        if instance and instance.workflow_state != MedicalCoverageRequest.Status.DRAFT:
            raise serializers.ValidationError(
                "Seules les demandes en brouillon peuvent être modifiées."
            )
        return attrs


class MedicalCoverageRequestTransitionSerializer(serializers.Serializer):
    to_state = serializers.ChoiceField(
        choices=[s[0] for s in MedicalCoverageRequest.Status.choices]
    )
    reason = serializers.CharField(required=False, allow_blank=True)


class MedicalCoverageRequestStatisticsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    draft = serializers.IntegerField()
    pending = serializers.IntegerField()
    approved = serializers.IntegerField()
    rejected = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    by_partner = serializers.ListField()
    by_month = serializers.ListField()
