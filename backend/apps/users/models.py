"""
============================================================
USERS MODELS — Modèle utilisateur personnalisé
============================================================
Remplace le modèle User Django par défaut.
AUTH_USER_MODEL = "users.User"
"""

import uuid
from datetime import timedelta

from simple_history.models import HistoricalRecords

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Manager personnalisé pour le modèle User."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superuser doit avoir is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Modèle utilisateur personnalisé.

    - Authentification par email (pas username)
    - Système de rôles intégré (admin, gestionnaire, comptable, consultant)
    - Traçabilité complète (historique django-simple-history)
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrateur"
        GESTIONNAIRE = "gestionnaire", "Gestionnaire RH"
        COMPTABLE = "comptable", "Comptable"
        CONSULTANT = "consultant", "Consultant"
        SOCIAL_AGENT = "social_agent", "Agent Social"
        DEPARTMENT_MANAGER = "department_manager", "Chef de Service"
        COMMITTEE_MEMBER = "committee_member", "Membre de Commission"
        DIRECTOR = "director", "Directeur"

    # ── Identifiant ──────────────────────────────────────
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ── Rattachement multi-tenant ─────────────────────────
    tenant = models.ForeignKey(
        "tenant.Tenant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Organisme",
        help_text="Organisme de rattachement (multi-tenant)",
    )

    # ── Authentification ─────────────────────────────────
    email = models.EmailField(unique=True, verbose_name="Adresse email")

    # ── Profil ───────────────────────────────────────────
    first_name = models.CharField(max_length=150, verbose_name="Prénom")
    last_name = models.CharField(max_length=150, verbose_name="Nom")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True, verbose_name="Avatar")

    # ── Rôle et permissions ───────────────────────────────
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.CONSULTANT, verbose_name="Rôle"
    )

    # ── Statut ───────────────────────────────────────────
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    is_staff = models.BooleanField(default=False, verbose_name="Staff Django")

    # ── Sécurité ─────────────────────────────────────────
    must_change_password = models.BooleanField(
        default=True,
        verbose_name="Doit changer le mot de passe",
        help_text="Forcé après la première connexion ou reset admin",
    )
    password_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Dernier changement de mot de passe",
        help_text="Horodatage du dernier changement de mot de passe (null tant que jamais changé)",
    )
    last_login_ip = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="Dernière IP de connexion"
    )
    failed_login_count = models.PositiveIntegerField(default=0, verbose_name="Tentatives échouées")

    # ── Timestamps ───────────────────────────────────────
    date_joined = models.DateTimeField(default=timezone.now, verbose_name="Date d'inscription")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Préparation AI : métadonnées supplémentaires ─────
    preferences = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Préférences utilisateur",
        help_text="Stockage JSON pour préférences UI et paramètres personnalisés",
    )

    # Historique complet (django-simple-history)
    history = HistoricalRecords()

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["tenant"]),
        ]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    def is_password_expired(self, max_age_days=None) -> bool:
        """
        Politique d'expiration : True si le mot de passe a été changé il y a
        plus de `max_age_days` jours (défaut : settings.PASSWORD_EXPIRATION_DAYS).

        - 0 ou valeur négative -> politique désactivée (jamais expiré).
        - password_changed_at NULL (compte hérité, jamais suivi) -> jamais forcé.
        """
        if max_age_days is None:
            max_age_days = settings.PASSWORD_EXPIRATION_DAYS or 0
        if not max_age_days or max_age_days <= 0:
            return False
        if self.password_changed_at is None:
            return False
        return timezone.now() - self.password_changed_at > timedelta(days=max_age_days)

    # ── Helpers rôles ────────────────────────────────────
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_gestionnaire(self):
        return self.role == self.Role.GESTIONNAIRE

    @property
    def is_comptable(self):
        return self.role == self.Role.COMPTABLE

    @property
    def is_consultant(self):
        return self.role == self.Role.CONSULTANT

    @property
    def is_social_agent(self):
        return self.role == self.Role.SOCIAL_AGENT

    @property
    def is_department_manager(self):
        return self.role == self.Role.DEPARTMENT_MANAGER

    @property
    def is_committee_member(self):
        return self.role == self.Role.COMMITTEE_MEMBER

    @property
    def is_director(self):
        return self.role == self.Role.DIRECTOR

    def has_role(self, *roles) -> bool:
        """Vérifie si l'utilisateur a l'un des rôles donnés."""
        return self.role in roles

    def can_approve_benefits(self) -> bool:
        """Peut valider des prestations."""
        return self.role in [self.Role.ADMIN, self.Role.GESTIONNAIRE]

    def can_process_payments(self) -> bool:
        """Peut traiter des paiements."""
        return self.role in [self.Role.ADMIN, self.Role.COMPTABLE]

    def can_approve_coverage_request(self) -> bool:
        return self.role in [self.Role.ADMIN, self.Role.DEPARTMENT_MANAGER, self.Role.DIRECTOR]

    def can_escalate_coverage_request(self) -> bool:
        return self.role in [self.Role.ADMIN, self.Role.DEPARTMENT_MANAGER]
