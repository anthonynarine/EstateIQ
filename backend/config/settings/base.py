# Filename: backend/config/settings/base.py
"""
Base Django settings for EstateIQ / PortfolioOS.

Shared settings for dev/staging/prod.

Key rules:
- Multi-tenant requests use X-Org-Slug (CORS-allowed header).
- CORS is explicit in production (env-driven).
- In DEBUG, safe localhost defaults apply if env vars are missing.
- JWT is the primary auth mechanism (SimpleJWT).
"""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from typing import List

from corsheaders.defaults import default_headers
from dotenv import load_dotenv

from shared.logging.logging_conf import build_logging_config

# Step 1: Base directory
# base.py is at: backend/config/settings/base.py
# parents[3] => backend/
BASE_DIR = Path(__file__).resolve().parents[3]

# Step 2: Load .env for local development (production should use real env vars)
# NOTE: If you ever move .env elsewhere, update this path.
load_dotenv(BASE_DIR / ".env")

# Step 3: Env helpers
def _env_str(key: str, default: str = "") -> str:
    """Return a string from an env var."""
    return str(os.getenv(key, default)).strip()


def _env_bool(key: str, default: str = "0") -> bool:
    """Return a boolean from an env var.

    Args:
        key: The environment variable key.
        default: Default string value if key is missing ("0" or "1").

    Returns:
        True if the env var is one of: 1, true, yes, on (case-insensitive).
    """
    raw = os.getenv(key, default)
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _env_int(key: str, default: int = 0) -> int:
    """Return an int from an env var."""
    raw = os.getenv(key, str(default))
    try:
        return int(str(raw).strip())
    except ValueError:
        return default


def _env_csv(key: str, default: str = "") -> List[str]:
    """Return a list from a CSV env var."""
    raw = os.getenv(key, default)
    if not raw:
        return []
    return [item.strip() for item in str(raw).split(",") if item.strip()]


# Step 4: Core Django
SECRET_KEY = _env_str("DJANGO_SECRET_KEY", "unsafe-dev-secret")
DEBUG = _env_bool("DJANGO_DEBUG", default="0")

ALLOWED_HOSTS = _env_csv("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1")

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Step 5: Custom user model
AUTH_USER_MODEL = "users.CustomUser"

# Step 6: Logging
LOGGING = build_logging_config(BASE_DIR)

# Step 7: Apps
INSTALLED_APPS = [
    # Step 1: Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Step 2: Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Step 3: Local apps
    "apps.core",
    "apps.users",
    "apps.buildings",
    "apps.leases",
    "apps.billing",
]

# Step 8: Middleware (ORDER MATTERS)
MIDDLEWARE = [
    # Step 1: CORS must be high to ensure headers are added to *all* responses (including errors)
    "corsheaders.middleware.CorsMiddleware",

    # Step 2: security + static
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    # Step 3: session
    "django.contrib.sessions.middleware.SessionMiddleware",

    # Step 4: standard django middleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",

    # Step 5: resolve org for request (X-Org-Slug)
    # IMPORTANT: this middleware must bypass auth endpoints like /api/v1/auth/token/
    "shared.tenancy.middleware.OrganizationResolutionMiddleware",
]

# Step 9: Templates
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

# Step 10: Database (SQLite default; DATABASE_URL optional)
DATABASE_URL = _env_str("DATABASE_URL", "")
if DATABASE_URL:
    import dj_database_url  # type: ignore

    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Step 11: Redis / Celery
REDIS_URL = _env_str("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = _env_str("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = _env_str("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Step 12: DRF
REST_FRAMEWORK = {
    # Step 1: Auth backends
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    # Step 2: Default permission (lock down by default)
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    # Step 3: Pagination defaults
    "DEFAULT_PAGINATION_CLASS": "shared.api.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": _env_int("DJANGO_PAGE_SIZE", default=25),
}

# Step 13: JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=_env_int("JWT_ACCESS_MINUTES", 10)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=_env_int("JWT_REFRESH_DAYS", 14)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Step 14: CORS (multi-tenant + frontend-safe)
CORS_ALLOW_ALL_ORIGINS = _env_bool("CORS_ALLOW_ALL_ORIGINS", "0")
CORS_ALLOWED_ORIGINS = _env_csv("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOW_CREDENTIALS = _env_bool("CORS_ALLOW_CREDENTIALS", "1")

# Step 14.1: Allow required custom headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-org-slug",
]

# Step 14.2: Dev-safe defaults (prevents empty-origin footgun)
if DEBUG and not CORS_ALLOW_ALL_ORIGINS and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# Step 14.3: CSRF trusted origins (future-proof)
CSRF_TRUSTED_ORIGINS = _env_csv("CSRF_TRUSTED_ORIGINS", "")
if DEBUG and not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# Step 15: Static
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Step 16: Locale / time
LANGUAGE_CODE = _env_str("DJANGO_LANGUAGE_CODE", "en-us")
TIME_ZONE = _env_str("DJANGO_TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True
