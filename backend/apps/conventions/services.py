import logging
from datetime import timedelta

from django.db import models, transaction
from django.utils import timezone
from shared.audit.services import AuditService

from .models import Convention, ConventionAlert, Partner

logger = logging.getLogger("apps.conventions")
audit = AuditService()


class ConventionValidationError(Exception):
    def __init__(self, message: str, code: str = "CONVENTION_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class PartnerService:
    def get_queryset(self):
        return Partner.objects.filter(is_deleted=False)

    def search(self, queryset=None, search="", type="", is_active="", wilaya="", category="", has_active_convention=""):
        qs = queryset or self.get_queryset()
        if search:
            qs = qs.filter(
                models.Q(code__icontains=search)
                | models.Q(name__icontains=search)
                | models.Q(email__icontains=search)
                | models.Q(contact_name__icontains=search)
            )
        if type:
            qs = qs.filter(type=type)
        if category:
            qs = qs.filter(category=category)
        if is_active:
            qs = qs.filter(is_active=(is_active.lower() == "true"))
        if has_active_convention:
            qs = qs.filter(conventions__status="active").distinct()
        if wilaya:
            qs = qs.filter(wilaya__icontains=wilaya)
        return qs

    @transaction.atomic
    def create(self, data, user=None, request=None):
        partner = Partner.objects.create(**data)
        audit.log_create(user=user, obj=partner, request=request)
        logger.info("Partenaire créé: %s", partner.code)
        return partner

    @transaction.atomic
    def update(self, instance, data, user=None, request=None):
        old = {f: getattr(instance, f) for f in data}
        for k, v in data.items():
            setattr(instance, k, v)
        instance.save()
        audit.log_update(user=user, obj=instance, before_data=old, request=request)
        logger.info("Partenaire mis à jour: %s", instance.code)
        return instance


class ConventionService:
    def get_queryset(self):
        return Convention.objects.filter(is_deleted=False).select_related("partner")

    def search(
        self,
        queryset=None,
        search="",
        status="",
        partner_id="",
        date_from="",
        date_to="",
        expiring_soon=False,
        expired=False,
        ordering="-start_date",
    ):
        qs = queryset or self.get_queryset()
        if search:
            qs = qs.filter(
                models.Q(reference__icontains=search)
                | models.Q(title__icontains=search)
                | models.Q(partner__name__icontains=search)
            )
        if status:
            qs = qs.filter(status=status)
        if partner_id:
            qs = qs.filter(partner_id=partner_id)
        if date_from:
            qs = qs.filter(end_date__gte=date_from)
        if date_to:
            qs = qs.filter(end_date__lte=date_to)
        if expiring_soon:
            qs = qs.filter(
                end_date__lte=timezone.localdate() + timedelta(days=30),
                end_date__gte=timezone.localdate(),
            )
        if expired:
            qs = qs.filter(end_date__lt=timezone.localdate())
        return qs.order_by(ordering)

    @transaction.atomic
    def create(self, data, user=None, request=None):
        convention = Convention.objects.create(**data)
        audit.log_create(user=user, obj=convention, request=request)
        self._check_and_create_alerts(convention)
        logger.info("Convention créée: %s", convention.reference)
        return convention

    @transaction.atomic
    def update(self, instance, data, user=None, request=None):
        old = {k: getattr(instance, k) for k in data if hasattr(instance, k)}
        for k, v in data.items():
            setattr(instance, k, v)
        instance.save()
        audit.log_update(user=user, obj=instance, before_data=old, request=request)
        self._check_and_create_alerts(instance)
        logger.info("Convention mise à jour: %s", instance.reference)
        return instance

    @transaction.atomic
    def renew(self, instance, new_end_date, new_amount=None, notes="", user=None, request=None):
        if instance.status not in (
            Convention.Status.ACTIVE,
            Convention.Status.EXPIRING_SOON,
            Convention.Status.EXPIRED,
        ):
            raise ConventionValidationError(
                "Seules les conventions actives ou expirées peuvent être renouvelées.",
                "INVALID_STATUS",
            )
        if new_end_date <= instance.end_date:
            raise ConventionValidationError(
                "La nouvelle date d'échéance doit être après l'ancienne.", "INVALID_END_DATE"
            )

        old_end_date = instance.end_date

        instance.end_date = new_end_date
        if new_amount is not None:
            instance.amount = new_amount
        instance.renewed_at = timezone.localdate()
        instance.status = Convention.Status.RENEWED
        instance.save()

        ConventionAlert.objects.create(
            convention=instance,
            alert_type=ConventionAlert.AlertType.AUTO_RENEWED,
            severity=ConventionAlert.Severity.LOW,
            title="Convention renouvelée",
            message=f"Convention {instance.reference} renouvelée jusqu'au {new_end_date}.{(' Notes: ' + notes) if notes else ''}",
        )

        new_conv = Convention.objects.create(
            partner=instance.partner,
            title=instance.title,
            description=instance.description,
            status=Convention.Status.ACTIVE,
            renewal_mode=instance.renewal_mode,
            renewal_notice_days=instance.renewal_notice_days,
            start_date=instance.end_date + timedelta(days=1),
            end_date=new_end_date,
            amount=new_amount or instance.amount,
            auto_renewal_days=instance.auto_renewal_days,
            requires_attachments=instance.requires_attachments,
        )

        audit.log_action(
            action="RENEW",
            obj=new_conv,
            extra_data={
                "old_end_date": str(old_end_date),
                "new_end_date": str(new_end_date),
                "notes": notes,
                "previous_id": str(instance.id),
            },
            user=user,
            request=request,
        )
        logger.info("Convention renouvelée: %s -> %s", instance.reference, new_conv.reference)
        return new_conv

    @transaction.atomic
    def terminate(self, instance, terminated_date=None, reason="", user=None, request=None):
        if instance.status in (Convention.Status.TERMINATED, Convention.Status.EXPIRED):
            raise ConventionValidationError(
                "La convention est déjà terminée ou expirée.", "ALREADY_TERMINATED"
            )
        instance.status = Convention.Status.TERMINATED
        instance.terminated_date = terminated_date or timezone.localdate()
        instance.save()
        audit.log_action(
            action="TERMINATE",
            obj=instance,
            extra_data={"reason": reason},
            user=user,
            request=request,
        )
        logger.info("Convention résiliée: %s", instance.reference)
        return instance

    def _check_and_create_alerts(self, convention):
        today = timezone.localdate()
        alerts = []
        if convention.end_date:
            delta = (convention.end_date - today).days
            if delta <= 7 and delta >= 0:
                alerts.append(
                    ConventionAlert(
                        convention=convention,
                        alert_type=ConventionAlert.AlertType.EXPIRY_CRITICAL,
                        severity=ConventionAlert.Severity.CRITICAL,
                        title="Expiration imminente",
                        message=f"La convention {convention.reference} expire dans {delta} jour(s) ({convention.end_date}).",
                    )
                )
            elif delta <= 30 and delta > 7:
                alerts.append(
                    ConventionAlert(
                        convention=convention,
                        alert_type=ConventionAlert.AlertType.EXPIRY_WARNING,
                        severity=ConventionAlert.Severity.HIGH,
                        title="Expiration prochaine",
                        message=f"La convention {convention.reference} expire dans {delta} jour(s) ({convention.end_date}).",
                    )
                )
            elif delta <= 60 and delta > 30:
                alerts.append(
                    ConventionAlert(
                        convention=convention,
                        alert_type=ConventionAlert.AlertType.EXPIRY_WARNING,
                        severity=ConventionAlert.Severity.MEDIUM,
                        title="Expiration dans moins de 2 mois",
                        message=f"La convention {convention.reference} expire le {convention.end_date}.",
                    )
                )
            if (
                delta <= convention.renewal_notice_days
                and convention.renewal_mode != Convention.Renewal.NONE
            ):
                alerts.append(
                    ConventionAlert(
                        convention=convention,
                        alert_type=ConventionAlert.AlertType.RENEWAL_REMINDER,
                        severity=ConventionAlert.Severity.MEDIUM,
                        title="Rappel reconduction",
                        message=f"Préavis de reconduction pour la convention {convention.reference} avant le {convention.end_date}.",
                    )
                )
        if alerts:
            ConventionAlert.objects.bulk_create(alerts)


class ConventionAlertService:
    def get_queryset(self):
        return ConventionAlert.objects.filter(is_deleted=False).select_related("convention")

    @transaction.atomic
    def resolve(self, alert, user=None):
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolved_by = user
        alert.save(update_fields=["is_resolved", "resolved_at", "resolved_by", "updated_at"])
        return alert

    def mark_all_read(self):
        ConventionAlert.objects.filter(is_deleted=False, is_read=False).update(is_read=True)
