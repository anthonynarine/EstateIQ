# Filename: backend/apps/demo_data/apps.py

from django.apps import AppConfig


class DemoDataConfig(AppConfig):
    """App config for deterministic demo/staging seed infrastructure."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.demo_data"
    verbose_name = "Demo Data"