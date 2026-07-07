"""
============================================================
BENEFICIARIES MODELS — Ayants droit
============================================================
"""

from datetime import date

from core.models import BaseModel
from django.db import models


class Beneficiary(BaseModel):

    class Relationship(models.TextChoices):
        SPOUSE = "spouse", "Conjoint(e)"
        CHILD = "child", "Enfant"
        PARENT = "parent", "Parent(e)"
        SIBLING = "sibling", "Frère/Sœur"
        OTHER = "other", "Autre"

    class Gender(models.TextChoices):
        MALE = "M", "Masculin"
        FEMALE = "F", "Féminin"

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="beneficiaries",
        verbose_name="Employé",
    )
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    first_name_ar = models.CharField(max_length=100, blank=True)
    last_name_ar = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices)
    date_of_birth = models.DateField(verbose_name="Date de naissance")
    national_id = models.CharField(max_length=20, blank=True, verbose_name="NNI")
    relationship = models.CharField(
        max_length=20, choices=Relationship.choices, verbose_name="Lien de parenté"
    )
    is_eligible = models.BooleanField(default=True, verbose_name="Éligible")
    ineligibility_reason = models.CharField(max_length=300, blank=True)
    is_student = models.BooleanField(default=False, verbose_name="Étudiant(e)")
    is_handicapped = models.BooleanField(default=False, verbose_name="Handicapé(e)")
    school_name = models.CharField(max_length=200, blank=True)
    school_year = models.CharField(max_length=20, blank=True)
    spouse_is_employed = models.BooleanField(null=True, blank=True)
    spouse_employer = models.CharField(max_length=200, blank=True)
    birth_certificate_uploaded = models.BooleanField(default=False)
    marriage_certificate_uploaded = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    address = models.TextField(blank=True, verbose_name="Adresse")
    social_security_number = models.CharField(max_length=30, blank=True, verbose_name="N° SS")
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Ayant droit"
        verbose_name_plural = "Ayants droit"
        ordering = ["relationship", "last_name"]
        indexes = [
            models.Index(fields=["employee"]),
            models.Index(fields=["relationship"]),
            models.Index(fields=["is_eligible"]),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_relationship_display()}) → {self.employee.matricule}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        dob = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    def check_eligibility(self):
        if self.relationship == self.Relationship.SPOUSE:
            return True, ""
        if self.relationship == self.Relationship.CHILD:
            a = self.age
            if a is None:
                return True, ""
            if self.is_handicapped:
                return True, ""
            if a < 18:
                return True, ""
            if a <= 25 and self.is_student:
                return True, ""
            return False, f"Enfant de {a} ans non étudiant et non handicapé"
        return True, ""

    def update_eligibility(self):
        eligible, reason = self.check_eligibility()
        if self.is_eligible != eligible or self.ineligibility_reason != reason:
            self.is_eligible = eligible
            self.ineligibility_reason = reason
            self.save(update_fields=["is_eligible", "ineligibility_reason", "updated_at"])
