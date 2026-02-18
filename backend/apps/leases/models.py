# Filename: backend/apps/leases/models.py
from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.buildings.models import Unit
from apps.core.models import Organization


class Tenant(models.Model):
    """A tenant (person/business) scoped to an organization.

    Data minimization: store only what we need (name + optional email/phone).
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="tenants",
        db_index=True,
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "full_name"]),
        ]
        constraints = [
            # If email is provided, enforce uniqueness within the org.
            models.UniqueConstraint(
                fields=["organization", "email"],
                condition=Q(email__isnull=False),
                name="uniq_tenant_email_per_org_when_present",
            )
        ]

    def __str__(self) -> str:
        return self.full_name

    def clean(self) -> None:
        """Validate tenant fields."""
        errors = {}

        if self.email:
            self.email = self.email.strip().lower()

        if self.phone:
            self.phone = self.phone.strip()

        if not self.full_name or not self.full_name.strip():
            errors["full_name"] = "Full name is required."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        # Step 1: enforce validation on every save
        self.full_clean()
        super().save(*args, **kwargs)


class Lease(models.Model):
    """A lease that ties a unit to rent terms within an organization."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ENDED = "ended", "Ended"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="leases",
        db_index=True,
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name="leases",
        db_index=True,
    )

    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)

    rent_amount = models.DecimalField(max_digits=12, decimal_places=2)
    security_deposit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
    )
    rent_due_day = models.PositiveSmallIntegerField(default=1)

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "unit"]),
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "unit", "status"]),
        ]
        constraints = [
            # Step 1: prevent double-occupancy — only one ACTIVE lease per unit per org.
            models.UniqueConstraint(
                fields=["organization", "unit"],
                condition=Q(status="active"),
                name="uniq_active_lease_per_unit_per_org",
            )
        ]

    def __str__(self) -> str:
        return f"Lease(unit={self.unit_id}, status={self.status})"

    def clean(self) -> None:
        """Validate org integrity + business rules."""
        errors = {}

        # Step 1: hard org integrity (must match Unit.organization)
        if self.unit_id and self.organization_id:
            if self.unit.organization_id != self.organization_id:
                errors["unit"] = "Unit must belong to the same organization as the lease."

        # Step 2: date rules
        if self.end_date and self.end_date < self.start_date:
            errors["end_date"] = "End date cannot be before start date."

        # Step 3: money rules
        if self.rent_amount is None or self.rent_amount <= Decimal("0"):
            errors["rent_amount"] = "Rent amount must be greater than 0."

        if self.security_deposit_amount is not None and self.security_deposit_amount < Decimal("0"):
            errors["security_deposit_amount"] = "Security deposit cannot be negative."

        # Step 4: due day bounds
        if not (1 <= int(self.rent_due_day) <= 28):
            errors["rent_due_day"] = "Rent due day must be between 1 and 28."

        # Step 5: status sanity
        if self.status == self.Status.ENDED and not self.end_date:
            errors["status"] = "Ended leases must have an end_date."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        # Step 1: enforce validation on every save
        self.full_clean()
        super().save(*args, **kwargs)


class LeaseTenant(models.Model):
    """Join table linking many tenants to a lease (roommates, etc.)."""

    class Role(models.TextChoices):
        PRIMARY = "primary", "Primary"
        CO_TENANT = "co_tenant", "Co-tenant"
        OCCUPANT = "occupant", "Occupant"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="lease_tenants",
        db_index=True,
    )
    lease = models.ForeignKey(
        Lease,
        on_delete=models.CASCADE,
        related_name="parties",
        db_index=True,
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="lease_links",
        db_index=True,
    )
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.PRIMARY)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["lease", "tenant"], name="uniq_tenant_per_lease"),
            models.UniqueConstraint(
                fields=["lease"],
                condition=Q(role="primary"),
                name="uniq_primary_tenant_per_lease",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "lease"]),
            models.Index(fields=["organization", "tenant"]),
        ]

    def __str__(self) -> str:
        return f"LeaseTenant(lease={self.lease_id}, tenant={self.tenant_id}, role={self.role})"

    def clean(self) -> None:
        """Validate org consistency across the join."""
        errors = {}

        if self.organization_id and self.lease_id:
            if self.lease.organization_id != self.organization_id:
                errors["lease"] = "Lease must belong to the same organization as the link."

        if self.organization_id and self.tenant_id:
            if self.tenant.organization_id != self.organization_id:
                errors["tenant"] = "Tenant must belong to the same organization as the link."

        if self.lease_id and self.tenant_id:
            if self.lease.organization_id != self.tenant.organization_id:
                errors["tenant"] = "Tenant and Lease must belong to the same organization."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        # Step 1: enforce validation on every save
        self.full_clean()
        super().save(*args, **kwargs)

