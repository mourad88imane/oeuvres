"""
============================================================
URLs PRINCIPALES — config/urls.py
============================================================
"""

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from apps.monitoring.health import deep_health, liveness, readiness

# ── URL Patterns ──────────────────────────────────────────
urlpatterns = [
    # Admin Django
    path("admin/", admin.site.urls),
    # Prometheus metrics (outside auth — Nginx restricts access)
    path("", include("django_prometheus.urls")),
    # API v1 — toutes les routes préfixées par /api/v1/
    path(
        "api/v1/",
        include(
            [
                # Health endpoints (AllowAny — no auth required)
                path("health/", deep_health, name="health-deep"),
                path("health/live/", liveness, name="health-liveness"),
                path("health/ready/", readiness, name="health-readiness"),
                # Authentification (login, logout, refresh, me)
                path("auth/", include("apps.authentication.urls", namespace="auth")),
                # Modules métier
                path("users/", include("apps.users.urls", namespace="users")),
                path("departments/", include("apps.departments.urls", namespace="departments")),
                path("employees/", include("apps.employees.urls", namespace="employees")),
                path(
                    "beneficiaries/", include("apps.beneficiaries.urls", namespace="beneficiaries")
                ),
                path("benefits/", include("apps.benefits.urls", namespace="benefits")),
                path("loans/", include("apps.loans.urls", namespace="loans")),
                path("finance/", include("apps.finance.urls", namespace="finance")),
                path("conventions/", include("apps.conventions.urls", namespace="conventions")),
                path("reporting/", include("apps.reporting.urls", namespace="reporting")),
                path("dashboard/", include("apps.dashboard.urls", namespace="dashboard")),
                path(
                    "notifications/",
                    include("shared.notifications.urls", namespace="notifications"),
                ),
                path("monitoring/", include("apps.monitoring.urls", namespace="monitoring")),
                path(
                    "medical-coverage/",
                    include("apps.medical_coverage.urls", namespace="medical_coverage"),
                ),
                path(
                    "invoicing/",
                    include("apps.invoicing.urls", namespace="invoicing"),
                ),
                path("admin/", include("apps.administration.urls", namespace="administration")),
        path("organization/", include("apps.organization.urls", namespace="organization")),
                path("tenants/", include("shared.tenant.api.urls", namespace="tenant")),
                path("audit/", include("shared.audit.urls", namespace="audit")),
                path("ai/", include("shared.ai.urls", namespace="ai")),
                path("documents/", include("shared.documents.urls", namespace="documents")),
            ]
        ),
    ),
    # Documentation API (OpenAPI 3 / Swagger)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# ── Dev uniquement : debug toolbar + media files ──────────
if settings.DEBUG:
    import debug_toolbar

    from django.conf.urls.static import static

    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
