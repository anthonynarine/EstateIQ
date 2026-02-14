# # Filename: backend/shared/logging/logging_conf.py

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict


def build_logging_config(base_dir: Path) -> Dict[str, Any]:
    """Build Django LOGGING config.

    Args:
        base_dir: Project base directory (BASE_DIR).

    Returns:
        A Django-compatible LOGGING dict suitable for logging.config.dictConfig.

    Notes:
        - Colorized console logs for local/dev.
        - Clean, non-colored file logs with rotation.
        - App loggers are namespaced (apps.core, apps.users, shared.tenancy).
    """
    # Step 1: env-driven toggles
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    enable_file = os.getenv("LOG_TO_FILE", "1").strip().lower() in {"1", "true", "yes", "on"}
    logs_dir = base_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    # Step 2: file paths
    app_log_path = logs_dir / "app.log"
    error_log_path = logs_dir / "error.log"

    # Step 3: handlers are assembled conditionally (file on/off)
    handlers: Dict[str, Any] = {
        "console": {
            "level": log_level,
            "class": "colorlog.StreamHandler",
            "formatter": "console_verbose",
        },
    }

    if enable_file:
        handlers.update(
            {
                "file_app": {
                    "level": log_level,
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": str(app_log_path),
                    "maxBytes": 10 * 1024 * 1024,  # 10MB
                    "backupCount": 5,
                    "formatter": "file_verbose",
                },
                "file_error": {
                    "level": "ERROR",
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": str(error_log_path),
                    "maxBytes": 10 * 1024 * 1024,  # 10MB
                    "backupCount": 5,
                    "formatter": "file_verbose",
                },
            }
        )

    # Step 4: base handlers list for most loggers
    base_handlers = ["console"] + (["file_app", "file_error"] if enable_file else [])

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            # Step 1: your “Julia Fiesta” vibe for console
            "console_verbose": {
                "()": "colorlog.ColoredFormatter",
                "format": (
                    "{log_color}{levelname}{reset} "
                    "{yellow}{asctime}{reset} "
                    "{blue}{filename}:{lineno}{reset} "
                    "{green}{name}{reset} "
                    "{purple}{message}"
                ),
                "style": "{",
                "log_colors": {
                    "DEBUG": "cyan",
                    "INFO": "green",
                    "WARNING": "yellow",
                    "ERROR": "red",
                    "CRITICAL": "bold_red",
                },
                "reset": True,
            },
            # Step 2: clean file formatter (no ANSI color)
            "file_verbose": {
                "format": "%(levelname)s %(asctime)s %(name)s %(filename)s:%(lineno)d %(message)s",
            },
        },
        "handlers": handlers,
        "loggers": {
            # Step 1: root logger catches anything not explicitly defined
            "": {
                "handlers": base_handlers,
                "level": log_level,
                "propagate": True,
            },
            # Step 2: Django loggers
            "django": {
                "handlers": base_handlers,
                "level": log_level,
                "propagate": False,
            },
            "django.request": {
                "handlers": base_handlers,
                "level": "WARNING",
                "propagate": False,
            },
            "django.security": {
                "handlers": base_handlers,
                "level": "WARNING",
                "propagate": False,
            },
            # Step 3: PortfolioOS namespaces
            "apps.core": {
                "handlers": base_handlers,
                "level": log_level,
                "propagate": False,
            },
            "apps.users": {
                "handlers": base_handlers,
                "level": log_level,
                "propagate": False,
            },
            "shared.tenancy": {
                "handlers": base_handlers,
                "level": log_level,
                "propagate": False,
            },
        },
    }
