# Filename: backend/shared/tenancy/querysets.py
# ✅ New Code

# Step 1: org-scoped queryset + manager utilities
from __future__ import annotations

from typing import Optional

from django.db import models

from apps.core.models import Organization


class OrgScopedQuerySet(models.QuerySet):
    """QuerySet that enforces organization scoping."""

    def for_org(self, organization: Optional[Organization]):
        # Step 2: deny unscoped queries by default
        if organization is None:
            return self.none()
        return self.filter(organization=organization)


class OrgScopedManager(models.Manager):
    """Manager that returns an OrgScopedQuerySet."""

    def get_queryset(self):
        return OrgScopedQuerySet(self.model, using=self._db)

    def for_org(self, organization: Optional[Organization]):
        return self.get_queryset().for_org(organization)
