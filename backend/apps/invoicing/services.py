from apps.invoicing.models import ProviderInvoice


class InvoicingService:
    def __init__(self):
        self.Invoice = ProviderInvoice

    def get_queryset(self):
        return self.Invoice.objects.select_related("partner", "created_by", "validated_by")

    def get_statistics(self):
        from django.db.models import Count, Sum
        qs = self.Invoice.objects.all()
        total = qs.count()
        draft = qs.filter(status="draft").count()
        validated = qs.filter(status="validated").count()
        cancelled = qs.filter(status="cancelled").count()
        total_amount = qs.aggregate(s=Sum("total_amount"))["s"] or 0
        validated_amount = qs.filter(status="validated").aggregate(s=Sum("total_amount"))["s"] or 0
        by_partner = qs.values("partner__name", "partner__id").annotate(
            count=Count("id"), amount=Sum("total_amount"),
        ).order_by("-amount")[:10]
        return {
            "total": total,
            "draft": draft,
            "validated": validated,
            "cancelled": cancelled,
            "total_amount": total_amount,
            "validated_amount": validated_amount,
            "by_partner": list(by_partner),
        }
