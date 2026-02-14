#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

from dotenv import load_dotenv


def main():
    """Run administrative tasks."""
    # Step 1: load environment variables from .env
    load_dotenv()

    # Step 2: point Django to the settings *package*
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    try:
        # Step 3: import Django CLI runner
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Step 4: execute command
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
