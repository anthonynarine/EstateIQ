
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"

    def ready(self):
        # Step 1: Import signals so organization bootstrap hooks register.
        import apps.core.signals  # noqa: F401