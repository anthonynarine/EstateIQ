# Step 1: base settings shared across environments
import os
from pathlib import Path

from dotenv import load_dotenv  # ✅ New Code

BASE_DIR = Path(__file__).resolve().parents[2]

# Step 2: Load .env for local development (prod will use real env vars)
load_dotenv(BASE_DIR / ".env")  # ✅ New Code


def _env_bool(key: str, default: str = "0") -> bool:
    """Return a boolean from an env var.

    Args:
        key: The environment variable key.
        default: Default string value if key is missing ("0" or "1").

    Returns:
        True if the env var is one of: 1, true, yes, on (case-insensitive).
    """
    # Step 1: read raw env string
    raw = os.getenv(key, default)
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _env_csv(key: str, default: str = "") -> list[str]:
    """Return a list from a CSV env var.

    Args:
        key: The environment variable key.
        default: Default CSV string if key is missing.

    Returns:
        List of stripped values split by commas.
    """
    # Step 1: read raw env string
    raw = os.getenv(key, default)
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-dev-secret")
DEBUG = _env_bool("DJANGO_DEBUG", default="0")
ALLOWED_HOSTS = _env_csv("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1")

INSTALLED_APPS = [
    # Step 2: Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Step 3: Third-party
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    # Step 4: Local apps
    "apps.core", 
]

MIDDLEWARE = [
    # Step 1: CORS first
    "corsheaders.middleware.CorsMiddleware",

    # Step 2: security + static
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    # Step 3: session first (so request has session/cookies ready)
    "django.contrib.sessions.middleware.SessionMiddleware",

    # Step 4: resolve org for the request (header/subdomain)
    "shared.tenancy.middleware.OrganizationResolutionMiddleware",

    # Step 5: standard django middleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

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

# Step 7: DB (SQLite for now; we’ll switch to Postgres soon)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Step 8: Redis/Celery
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Step 9: DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "PortfolioOS API",
    "DESCRIPTION": "AI-native financial operating system for small real estate portfolios.",
    "VERSION": "0.1.0",
}

# Step 10: CORS (tighten later)
CORS_ALLOW_ALL_ORIGINS = True

# Step 11: Static
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.BasicAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}
