# Filename: backend/setting/base.py
# Step 1: base settings shared across environments
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from typing import List

from dotenv import load_dotenv

from shared.logging.logging_conf import build_logging_config

BASE_DIR = Path(__file__).resolve().parents[2]

# Step 2: Load .env for local development (prod will use real env vars)
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
]

# Step 8: Middleware
MIDDLEWARE = [
    # Step 1: CORS first
    "corsheaders.middleware.CorsMiddleware",

    # Step 2: security + static
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    # Step 3: session first
    "django.contrib.sessions.middleware.SessionMiddleware",

    # Step 4: resolve org for the request (X-Org-Slug)
    "shared.tenancy.middleware.OrganizationResolutionMiddleware",

    # Step 5: standard django middleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# Step 9: Templates (admin / browsable API)
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

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Step 10: Database (SQLite for now; can switch to Postgres via env)
DATABASE_URL = _env_str("DATABASE_URL", "")
if DATABASE_URL:
    # Step 1: optional DATABASE_URL support (requires dj-database-url installed)
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
# NOTE: Pagination uses shared.api.pagination.StandardResultsSetPagination
# Create it at: backend/shared/api/pagination.py (snippet below).
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
    # Step 3: Pagination defaults (safe for production)
    "DEFAULT_PAGINATION_CLASS": "shared.api.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": _env_int("DJANGO_PAGE_SIZE", default=25),
}

# Step 13: JWT
SIMPLE_JWT = {
    # Step 1: Keep access short-lived
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=_env_int("JWT_ACCESS_MINUTES", 10)),
    # Step 2: Refresh longer-lived
    "REFRESH_TOKEN_LIFETIME": timedelta(days=_env_int("JWT_REFRESH_DAYS", 14)),
    # Step 3: Safer refresh handling
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    # Step 4: Useful for auditing (admin)
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Step 14: CORS (env-configured; avoid allow-all by default)
CORS_ALLOW_ALL_ORIGINS = _env_bool("CORS_ALLOW_ALL_ORIGINS", "0")
CORS_ALLOWED_ORIGINS = _env_csv("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOW_CREDENTIALS = _env_bool("CORS_ALLOW_CREDENTIALS", "1")

# If you're using cookies anywhere later, you'll likely want these too:
CSRF_TRUSTED_ORIGINS = _env_csv("CSRF_TRUSTED_ORIGINS", "")

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
