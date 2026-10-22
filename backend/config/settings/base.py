"""
============================================================
SETTINGS BASE — Communs à tous les environnements
============================================================
Principe : Ce fichier ne contient AUCUNE valeur sensible.
Tout secret passe par python-decouple (variables d'env).
"""

from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# ── Chemins ───────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Sécurité de base ──────────────────────────────────────
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost", cast=Csv())

# ── Application ───────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "django_prometheus",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "axes",
    "simple_history",
    "django_celery_beat",
    "django_celery_results",
    "django_extensions",
    "csp",
]

LOCAL_APPS = [
    "core",
    "shared.registry",
    "shared.api",
    "shared.permissions",
    "shared.audit",
    "shared.notifications",
    "shared.workflow",
    "shared.reporting",
    "shared.ai",
    "shared.documents",
    "shared.tenant",
    "apps.departments",
    "apps.authentication",
    "apps.users",
    "apps.employees",
    "apps.beneficiaries",
    "apps.benefits",
    "apps.loans",
    "apps.finance",
    "apps.conventions",
    "apps.reporting",
    "apps.dashboard",
    "apps.monitoring",
    "apps.medical_coverage",
    "apps.invoicing",
    "apps.administration",
    "apps.organization",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── Middleware ─────────────────────────────────────────────
MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "core.middleware.CorrelationIDMiddleware",
    "core.middleware.CsrfExemptApiMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "csp.middleware.CSPMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
    "shared.tenant.middleware.TenantMiddleware",
    "shared.audit.middleware.AuditMiddleware",
    "apps.monitoring.middleware.APIMonitoringMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ── Base de données ───────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="oeuvres_sociales"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,  # Connexions persistantes (60 secondes)
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

# ── Modèle utilisateur personnalisé ───────────────────────
AUTH_USER_MODEL = "users.User"

# ── Validation mots de passe ──────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalisation ──────────────────────────────────
LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Algiers"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("fr", "Français"),
    ("en", "English"),
    ("ar", "العربية"),
]

LOCALE_PATHS = [BASE_DIR / "locale"]

# ── Fichiers statiques & médias ───────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Django REST Framework ─────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    # Throttling (rate limiting)
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "login": "10/minute",  # Throttle spécial pour login
    },
}

# ── Politique de mot de passe ─────────────────────────────
# Expiration : force le changement si password_changed_at est plus vieux que
# PASSWORD_EXPIRATION_DAYS jours. 0 ou valeur négative = désactivé.
# Les comptes hérités (password_changed_at NULL) ne sont jamais forcés.
PASSWORD_EXPIRATION_DAYS = config("PASSWORD_EXPIRATION_DAYS", default=90, cast=int)

# Avertissement : informe (sans forcer) quand il reste moins de
# PASSWORD_EXPIRATION_WARNING_DAYS jours avant l'expiration. 0 = désactivé.
PASSWORD_EXPIRATION_WARNING_DAYS = config("PASSWORD_EXPIRATION_WARNING_DAYS", default=15, cast=int)

# ── JWT Configuration ─────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_LIFETIME_MINUTES", default=30, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,  # Nouveau refresh token à chaque refresh
    "BLACKLIST_AFTER_ROTATION": True,  # Ancien token mis en blacklist
    "UPDATE_LAST_LOGIN": True,  # Met à jour last_login de l'user
    "ALGORITHM": "HS256",
    "SIGNING_KEY": config("SECRET_KEY"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "USER_AUTHENTICATION_RULE": "rest_framework_simplejwt.authentication.default_user_authentication_rule",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "TOKEN_USER_CLASS": "rest_framework_simplejwt.models.TokenUser",
    "JTI_CLAIM": "jti",
    # Claims personnalisés dans le token
    "TOKEN_OBTAIN_SERIALIZER": "apps.authentication.serializers.CustomTokenObtainPairSerializer",
}

# ── CORS ──────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-request-id",
    "x-correlation-id",
]

# ── Content Security Policy (CSP) ─────────────────────────
CONTENT_SECURITY_POLICY_REPORT_ONLY = {
    "DIRECTIVES": {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'", "ws://localhost:*", "http://localhost:*", "https://*.sentry.io"],
        "frame-src": ["'none'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
    },
}

# ── DRF Spectacular (OpenAPI) ─────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "Oeuvres Sociales API",
    "DESCRIPTION": "API de gestion des oeuvres sociales",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "TAGS": [
        {"name": "auth", "description": "Authentification et gestion de session"},
        {"name": "users", "description": "Gestion des utilisateurs"},
        {"name": "employees", "description": "Gestion des employés"},
        {"name": "benefits", "description": "Prestations sociales"},
        {"name": "finance", "description": "Finance et paiements"},
    ],
}

# ── Cache (Redis) ─────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": config("REDIS_URL", default="redis://localhost:6379/0"),
        "KEY_PREFIX": "oeuvres",
        "TIMEOUT": 300,  # 5 minutes par défaut
    }
}

# ── Sessions ──────────────────────────────────────────────
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

# ── Celery ────────────────────────────────────────────────
CELERY_BROKER_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"
CELERY_ACCEPT_CONTENT = ["application/json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# ── Moteurs réutilisables (engine configuration) ──────────
ENGINE_AUDIT_MODELS = [
    "apps.employees.Employee",
    "apps.benefits.Benefit",
    "apps.beneficiaries.Beneficiary",
    "apps.conventions.Convention",
    "apps.conventions.Partner",
    "apps.finance.Payment",
    "apps.finance.BudgetLine",
    "apps.departments.Department",
    "apps.users.User",
    "apps.medical_coverage.MedicalCoverageVoucher",
]
ENGINE_ROLES = ["admin", "gestionnaire", "comptable", "consultant",
                 "social_agent", "department_manager", "committee_member", "director"]

# ── Email ─────────────────────────────────────────────────
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = config("EMAIL_HOST", default="localhost")
EMAIL_PORT = config("EMAIL_PORT", default=1025, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=False, cast=bool)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@oeuvres-sociales.dz")
SITE_URL = config("SITE_URL", default="http://localhost:5173")

# ── Axes (protection brute force) ────────────────────────
AXES_FAILURE_LIMIT = 5  # Blocage après 5 tentatives échouées
AXES_COOLOFF_TIME = timedelta(minutes=30)
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_CALLABLE = "apps.authentication.utils.axes_lockout_response"
AXES_HANDLER = "axes.handlers.database.AxesDatabaseHandler"
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# ── Logging structuré JSON ────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d %(request_id)s %(correlation_id)s",
        },
        "verbose": {
            "format": "[{asctime}] {levelname} {name} [{request_id}] {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "filters": {
        "request_context": {"()": "core.logging_filters.RequestContextFilter"},
        "require_debug_true": {"()": "django.utils.log.RequireDebugTrue"},
        "require_debug_false": {"()": "django.utils.log.RequireDebugFalse"},
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "filters": ["request_context"],
        },
        "json_file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "app.json.log",
            "maxBytes": 1024 * 1024 * 50,
            "backupCount": 10,
            "formatter": "json",
            "filters": ["request_context"],
        },
        "error_file": {
            "level": "ERROR",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "errors.log",
            "maxBytes": 1024 * 1024 * 10,
            "backupCount": 5,
            "formatter": "json",
            "filters": ["request_context"],
        },
        "security_file": {
            "level": "WARNING",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "security.log",
            "maxBytes": 1024 * 1024 * 10,
            "backupCount": 10,
            "formatter": "json",
            "filters": ["request_context"],
        },
        "audit_file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "audit.log",
            "maxBytes": 1024 * 1024 * 50,
            "backupCount": 20,
            "formatter": "json",
            "filters": ["request_context"],
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "json_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["security_file", "console"],
            "level": "WARNING",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console", "json_file"],
            "level": "DEBUG",
            "propagate": False,
        },
        "audit": {
            "handlers": ["audit_file"],
            "level": "INFO",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console", "json_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console", "error_file"],
        "level": "WARNING",
    },
}

# ── Audit & Historique (préparation AI) ──────────────────
SIMPLE_HISTORY_HISTORY_CHANGE_REASON_USE_TEXT_FIELD = True
SIMPLE_HISTORY_REVERT_DISABLED = False

# ── Paramètres métier ─────────────────────────────────────
APP_NAME = "Plateforme Oeuvres Sociales"
APP_VERSION = "1.0.0"
FINANCE_LARGE_PAYMENT_THRESHOLD = 500000  # DZD
