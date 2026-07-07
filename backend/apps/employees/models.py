"""
============================================================
EMPLOYEES MODELS
============================================================
"""

import os
import uuid
from datetime import date

from core.models import BaseModel
from django.db import models
from django.utils import timezone


def employee_photo_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    return os.path.join("employees", "photos", f"{uuid.uuid4().hex}.{ext}")


class Employee(BaseModel):

    class Status(models.TextChoices):
        ACTIVE = "active", "Actif"
        INACTIVE = "inactive", "Inactif"
        RETIRED = "retired", "Retraité"
        SUSPENDED = "suspended", "Suspendu"
        DECEASED = "deceased", "Décédé"

    class Gender(models.TextChoices):
        MALE = "M", "Masculin"
        FEMALE = "F", "Féminin"

    class MaritalStatus(models.TextChoices):
        SINGLE = "single", "Célibataire"
        MARRIED = "married", "Marié(e)"
        DIVORCED = "divorced", "Divorcé(e)"
        WIDOWED = "widowed", "Veuf/Veuve"

    class ContractType(models.TextChoices):
        CDI = "cdi", "CDI"
        CDD = "cdd", "CDD"
        STAGE = "stage", "Stagiaire"
        PART_TIME = "part_time", "Temps partiel"
        CONSULTANT = "consultant", "Consultant"

    # Identification
    matricule = models.CharField(max_length=20, unique=True, verbose_name="Matricule")

    # État civil
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    first_name_ar = models.CharField(max_length=100, blank=True, verbose_name="Prénom (arabe)")
    last_name_ar = models.CharField(max_length=100, blank=True, verbose_name="Nom (arabe)")
    gender = models.CharField(max_length=1, choices=Gender.choices, verbose_name="Genre")
    date_of_birth = models.DateField(verbose_name="Date de naissance")
    place_of_birth = models.CharField(max_length=100, blank=True, verbose_name="Lieu de naissance")
    marital_status = models.CharField(
        max_length=10,
        choices=MaritalStatus.choices,
        default=MaritalStatus.SINGLE,
        verbose_name="Situation familiale",
    )
    nationality = models.CharField(max_length=50, default="Algérienne", verbose_name="Nationalité")

    # Documents
    national_id = models.CharField(
        max_length=20, unique=True, null=True, blank=True, verbose_name="NNI / CIN"
    )
    national_id_expiry = models.DateField(null=True, blank=True, verbose_name="Expiration CIN")
    social_security_number = models.CharField(max_length=30, blank=True, verbose_name="N° SS")
    tax_id = models.CharField(max_length=20, blank=True, verbose_name="NIF")

    # Contact
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    phone_secondary = models.CharField(max_length=20, blank=True, verbose_name="Tél. secondaire")
    email_personal = models.EmailField(blank=True, verbose_name="Email personnel")
    email_professional = models.EmailField(blank=True, verbose_name="Email professionnel")
    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    wilaya = models.CharField(max_length=100, blank=True, verbose_name="Wilaya")

    # Photo
    photo = models.ImageField(
        upload_to=employee_photo_path, null=True, blank=True, verbose_name="Photo"
    )

    # Poste
    department = models.ForeignKey(
        "departments.Department",
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="employees",
        verbose_name="Département",
    )
    job_title = models.CharField(max_length=150, blank=True, default="", verbose_name="Intitulé du poste")
    grade = models.CharField(max_length=100, blank=True, verbose_name="Grade")
    grade_level = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="Niveau grade"
    )

    # Organisation hiérarchique (direction → sous-direction → service → bureau)
    bureau = models.ForeignKey(
        "organization.Bureau",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="employees",
        verbose_name="Bureau",
    )
    function = models.ForeignKey(
        "organization.Function",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="employees",
        verbose_name="Fonction",
    )
    grade_ref = models.ForeignKey(
        "organization.Grade",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="employees",
        verbose_name="Grade (référentiel)",
    )

    category = models.CharField(max_length=50, blank=True, verbose_name="Catégorie CSP")
    contract_type = models.CharField(
        max_length=20,
        choices=ContractType.choices,
        default=ContractType.CDI,
        verbose_name="Type de contrat",
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordinates",
        verbose_name="Supérieur hiérarchique",
    )

    # Dates RH
    date_hired = models.DateField(null=True, blank=True, verbose_name="Date d'embauche")
    date_end = models.DateField(null=True, blank=True, verbose_name="Date fin contrat")
    date_retired = models.DateField(null=True, blank=True, verbose_name="Date retraite")
    date_promoted = models.DateField(null=True, blank=True, verbose_name="Dernière promotion")

    # Statut
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, verbose_name="Statut"
    )

    # Finance
    base_salary = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Salaire de base (DZD)"
    )
    bank_account = models.CharField(max_length=50, blank=True, verbose_name="RIB/CCP")

    # Formation
    education_level = models.CharField(
        max_length=100, blank=True, verbose_name="Niveau de formation"
    )
    education_field = models.CharField(
        max_length=100, blank=True, verbose_name="Domaine de formation"
    )

    # Champs AI / Analytics
    competencies = models.JSONField(default=list, blank=True, verbose_name="Compétences")
    scoring_profile = models.JSONField(default=dict, blank=True, verbose_name="Profil scoring AI")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Métadonnées")

    # Notes
    notes = models.TextField(blank=True, verbose_name="Notes internes")

    class Meta:
        verbose_name = "Employé"
        verbose_name_plural = "Employés"
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["matricule"]),
            models.Index(fields=["status"]),
            models.Index(fields=["department"]),
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["date_hired"]),
            models.Index(fields=["grade_level"]),
        ]

    def __str__(self):
        return f"{self.matricule} — {self.get_full_name()}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        dob = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    @property
    def seniority_years(self):
        if not self.date_hired:
            return None
        return round((date.today() - self.date_hired).days / 365.25, 2)

    @property
    def seniority_label(self):
        if not self.date_hired:
            return "—"
        total_months = (date.today() - self.date_hired).days // 30
        years, months = divmod(total_months, 12)
        if years and months:
            return f"{years} an{'s' if years > 1 else ''} {months} mois"
        elif years:
            return f"{years} an{'s' if years > 1 else ''}"
        return f"{months} mois"

    @property
    def beneficiaries_count(self):
        return self.beneficiaries.filter(is_deleted=False, is_eligible=True).count()

    @property
    def photo_url(self):
        return self.photo.url if self.photo else None

    def is_cin_expired(self):
        if not self.national_id_expiry:
            return False
        return self.national_id_expiry < date.today()

    def save(self, *args, **kwargs):
        if not self.matricule:
            self.matricule = self._generate_matricule()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_matricule(cls):
        year = timezone.now().year
        prefix = f"MAT-{year}-"
        last = cls.all_objects.filter(matricule__startswith=prefix).order_by("-matricule").first()
        if last:
            try:
                num = int(last.matricule.rsplit("-", 1)[-1]) + 1
            except ValueError:
                num = 1
        else:
            num = 1
        return f"{prefix}{num:05d}"
