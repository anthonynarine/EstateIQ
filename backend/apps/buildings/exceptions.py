# Filename: apps/buildings/exceptions.py

from __future__ import annotations

from rest_framework.exceptions import ValidationError as DRFValidationError


class DomainValidationError(DRFValidationError):
    """Domain-level validation error that serializes cleanly in DRF."""
