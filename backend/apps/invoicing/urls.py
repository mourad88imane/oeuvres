from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.invoicing.views import ProviderInvoiceViewSet

app_name = "invoicing"

router = DefaultRouter()
router.register(r"invoices", ProviderInvoiceViewSet, basename="invoice")

urlpatterns = [
    path("", include(router.urls)),
]
