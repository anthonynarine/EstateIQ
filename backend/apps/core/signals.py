# Filename: backend/apps/core/signals.py


"""Core organization lifecycle signals."""

from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.models import Organization
from apps.expenses.services.category_seed_service import (
    seed_default_expense_categories_for_organization,
)


@receiver(post_save, sender=Organization)
def seed_default_expense_categories_on_org_create(
    sender,
    instance,
    created,
    **kwargs,
):
    """Seed default expense categories the first time an org is created."""
    # Step 1: Only act on first creation.
    if not created:
        return

    # Step 2: Seed org-owned default categories.
    seed_default_expense_categories_for_organization(instance)