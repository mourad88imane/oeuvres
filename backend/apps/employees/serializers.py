"""Employee serializers — see detailed docstrings in source."""

from rest_framework import serializers

from apps.departments.serializers import DepartmentListSerializer
from core.serializers import BaseModelSerializer

from .models import Employee


class EmployeeListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.ReadOnlyField()
    seniority_years = serializers.ReadOnlyField()
    seniority_label = serializers.ReadOnlyField()
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_code = serializers.CharField(source="department.code", read_only=True)
    photo_url = serializers.ReadOnlyField()
    beneficiaries_count = serializers.ReadOnlyField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    gender_display = serializers.CharField(source="get_gender_display", read_only=True)
    contract_display = serializers.CharField(source="get_contract_type_display", read_only=True)
    bureau_name = serializers.CharField(source="bureau.name", read_only=True, default=None)
    function_name = serializers.CharField(source="function.name", read_only=True, default=None)
    grade_ref_name = serializers.CharField(source="grade_ref.name", read_only=True, default=None)

    class Meta:
        model = Employee
        fields = [
            "id",
            "matricule",
            "full_name",
            "first_name",
            "last_name",
            "gender",
            "gender_display",
            "photo_url",
            "job_title",
            "grade",
            "grade_level",
            "category",
            "department",
            "department_name",
            "department_code",
            "bureau",
            "bureau_name",
            "function",
            "function_name",
            "grade_ref",
            "grade_ref_name",
            "status",
            "status_display",
            "contract_type",
            "contract_display",
            "date_hired",
            "seniority_years",
            "seniority_label",
            "date_of_birth",
            "age",
            "phone",
            "email_professional",
            "beneficiaries_count",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class BeneficiaryInlineSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.ReadOnlyField()
    relationship_display = serializers.CharField(source="get_relationship_display", read_only=True)

    class Meta:
        from apps.beneficiaries.models import Beneficiary

        model = Beneficiary
        fields = [
            "id",
            "full_name",
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "age",
            "relationship",
            "relationship_display",
            "is_eligible",
            "ineligibility_reason",
            "is_student",
            "is_handicapped",
            "national_id",
            "school_name",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class EmployeeDetailSerializer(BaseModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.ReadOnlyField()
    seniority_years = serializers.ReadOnlyField()
    seniority_label = serializers.ReadOnlyField()
    photo_url = serializers.ReadOnlyField()
    department_info = DepartmentListSerializer(source="department", read_only=True)
    manager_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    gender_display = serializers.CharField(source="get_gender_display", read_only=True)
    contract_display = serializers.CharField(source="get_contract_type_display", read_only=True)
    marital_display = serializers.CharField(source="get_marital_status_display", read_only=True)
    beneficiaries = serializers.SerializerMethodField()
    cin_expired = serializers.SerializerMethodField()
    bureau_name = serializers.CharField(source="bureau.name", read_only=True, default=None)
    bureau_code = serializers.CharField(source="bureau.code", read_only=True, default=None)
    direction_name = serializers.SerializerMethodField()
    sub_direction_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    function_name = serializers.CharField(source="function.name", read_only=True, default=None)
    grade_ref_name = serializers.CharField(source="grade_ref.name", read_only=True, default=None)
    grade_ref_level = serializers.IntegerField(source="grade_ref.level", read_only=True, default=None)

    class Meta:
        model = Employee
        fields = [
            "id",
            "matricule",
            "full_name",
            "first_name",
            "last_name",
            "first_name_ar",
            "last_name_ar",
            "gender",
            "gender_display",
            "date_of_birth",
            "age",
            "place_of_birth",
            "marital_status",
            "marital_display",
            "nationality",
            "national_id",
            "national_id_expiry",
            "cin_expired",
            "social_security_number",
            "tax_id",
            "phone",
            "phone_secondary",
            "email_personal",
            "email_professional",
            "address",
            "city",
            "wilaya",
            "photo_url",
            "department",
            "department_info",
            "job_title",
            "grade",
            "grade_level",
            "category",
            "contract_type",
            "contract_display",
            "bureau",
            "bureau_name",
            "bureau_code",
            "function",
            "function_name",
            "grade_ref",
            "grade_ref_name",
            "grade_ref_level",
            "direction_name",
            "sub_direction_name",
            "service_name",
            "manager",
            "manager_name",
            "date_hired",
            "date_end",
            "date_retired",
            "date_promoted",
            "seniority_years",
            "seniority_label",
            "status",
            "status_display",
            "base_salary",
            "bank_account",
            "education_level",
            "education_field",
            "competencies",
            "scoring_profile",
            "metadata",
            "notes",
            "beneficiaries",
            "created_at",
            "updated_at",
            "created_by_name",
        ]
        read_only_fields = [
            "id",
            "matricule",
            "created_at",
            "updated_at",
            "seniority_years",
            "seniority_label",
            "age",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_manager_name(self, obj):
        return obj.manager.get_full_name() if obj.manager else None

    def get_cin_expired(self, obj):
        return obj.is_cin_expired()

    def get_beneficiaries(self, obj):
        qs = obj.beneficiaries.filter(is_deleted=False).order_by("relationship", "date_of_birth")
        return BeneficiaryInlineSerializer(qs, many=True).data

    def get_direction_name(self, obj):
        if obj.bureau and obj.bureau.service and obj.bureau.service.sub_direction:
            return obj.bureau.service.sub_direction.direction.name
        return None

    def get_sub_direction_name(self, obj):
        if obj.bureau and obj.bureau.service:
            return obj.bureau.service.sub_direction.name
        return None

    def get_service_name(self, obj):
        if obj.bureau:
            return obj.bureau.service.name
        return None


class EmployeeCreateSerializer(BaseModelSerializer):
    class Meta:
        model = Employee
        fields = [
            "first_name",
            "last_name",
            "first_name_ar",
            "last_name_ar",
            "gender",
            "date_of_birth",
            "place_of_birth",
            "marital_status",
            "nationality",
            "national_id",
            "national_id_expiry",
            "social_security_number",
            "tax_id",
            "phone",
            "phone_secondary",
            "email_personal",
            "email_professional",
            "address",
            "city",
            "wilaya",
            "photo",
            "department",
            "job_title",
            "grade",
            "grade_level",
            "category",
            "bureau",
            "function",
            "grade_ref",
            "contract_type",
            "manager",
            "date_hired",
            "date_end",
            "status",
            "base_salary",
            "bank_account",
            "education_level",
            "education_field",
            "competencies",
            "notes",
        ]

    def validate_date_of_birth(self, value):
        from datetime import date

        if value >= date.today():
            raise serializers.ValidationError("La date de naissance doit être dans le passé.")
        if (date.today() - value).days // 365 > 100:
            raise serializers.ValidationError("Date de naissance invalide.")
        return value

    def validate_date_hired(self, value):
        from datetime import date

        if not value:
            return value
        if value > date.today():
            raise serializers.ValidationError("La date d'embauche ne peut pas être dans le futur.")
        return value

    def validate(self, attrs):
        dob, hired, end = attrs.get("date_of_birth"), attrs.get("date_hired"), attrs.get("date_end")
        if dob and hired and (hired - dob).days // 365 < 16:
            raise serializers.ValidationError(
                "L'employé doit avoir au moins 16 ans à la date d'embauche."
            )
        if end and hired and end <= hired:
            raise serializers.ValidationError(
                {"date_end": "La date de fin doit être postérieure à la date d'embauche."}
            )
        return attrs


class EmployeeUpdateSerializer(BaseModelSerializer):
    class Meta:
        model = Employee
        fields = [
            "first_name",
            "last_name",
            "first_name_ar",
            "last_name_ar",
            "gender",
            "date_of_birth",
            "place_of_birth",
            "marital_status",
            "nationality",
            "national_id",
            "national_id_expiry",
            "social_security_number",
            "tax_id",
            "phone",
            "phone_secondary",
            "email_personal",
            "email_professional",
            "address",
            "city",
            "wilaya",
            "department",
            "job_title",
            "grade",
            "grade_level",
            "category",
            "bureau",
            "function",
            "grade_ref",
            "contract_type",
            "manager",
            "date_hired",
            "date_end",
            "date_retired",
            "date_promoted",
            "status",
            "base_salary",
            "bank_account",
            "education_level",
            "education_field",
            "competencies",
            "metadata",
            "notes",
        ]


class EmployeePhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ["photo"]

    def validate_photo(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("La photo ne doit pas dépasser 5 Mo.")
        allowed = ("image/jpeg", "image/png", "image/webp")
        if hasattr(value, "content_type") and value.content_type not in allowed:
            raise serializers.ValidationError("Format non supporté. Utilisez JPEG, PNG ou WebP.")
        return value


class EmployeeHistorySerializer(serializers.Serializer):
    history_id = serializers.IntegerField()
    history_date = serializers.DateTimeField()
    history_type = serializers.CharField()
    history_user = serializers.SerializerMethodField()
    changed_fields = serializers.SerializerMethodField()

    def get_history_user(self, obj):
        if obj.history_user:
            return {
                "id": str(obj.history_user.id),
                "name": obj.history_user.get_full_name(),
                "email": obj.history_user.email,
            }
        return None

    def get_changed_fields(self, obj):
        try:
            prev = obj.prev_record
            if not prev:
                return []
            delta = obj.diff_against(prev)
            return [
                {
                    "field": c.field,
                    "old": str(c.old) if c.old is not None else None,
                    "new": str(c.new) if c.new is not None else None,
                }
                for c in delta.changes
                if c.field not in ("updated_at", "updated_by_id")
            ]
        except Exception:
            return []
