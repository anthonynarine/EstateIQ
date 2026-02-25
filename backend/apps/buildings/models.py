# Filename: apps/buildings/models.py
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import Organization


class Building(models.Model):
    """Represents a physical property (building) owned/managed by an organization.

    Multi-tenant rule:
        - Every Building belongs to exactly one Organization.
        - All access must be scoped by request.org (never client-supplied org ids).
    """

    class BuildingType(models.TextChoices):
        SFH = "SFH", "Single Family"
        MULTI_FAMILY = "MULTI_FAMILY", "Multi-Family"
        CONDO = "CONDO", "Condo"
        TOWNHOUSE = "TOWNHOUSE", "Townhouse"
        MIXED_USE = "MIXED_USE", "Mixed Use"
        OTHER = "OTHER", "Other"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="buildings",
        help_text="Owning organization (tenant). Derived from request.org on create.",
    )

    name = models.CharField(
        max_length=200,
        help_text="Internal nickname or label for the building (e.g., 'Astoria Duplex').",
    )

    building_type = models.CharField(
        max_length=32,
        choices=BuildingType.choices,
        default=BuildingType.OTHER,
        help_text="High-level building category used for reporting and defaults.",
    )

    # Address (optional for MVP; safe + structured)
    address_line1 = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        default="",
        help_text="Street address line 1.",
    )
    address_line2 = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        default="",
        help_text="Street address line 2 (apt/suite).",
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="City.",
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="State / province / region.",
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Postal/ZIP code.",
    )
    country = models.CharField(
        max_length=2,
        blank=True,
        default="",
        help_text="ISO-3166 alpha-2 country code (e.g., US).",
    )

    created_at = models.DateTimeField(auto_now_add=True, help_text="Created timestamp.")
    updated_at = models.DateTimeField(auto_now=True, help_text="Last updated timestamp.")

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "name"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="uniq_building_name_per_org",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.organization.slug})"


class Unit(models.Model):
    """Represents a rentable unit within a building.

    Multi-tenant rules:
        - Every Unit belongs to exactly one Organization.
        - Every Unit belongs to exactly one Building.
        - Unit.organization must match Unit.building.organization.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="units",
        help_text="Owning organization (tenant). Derived from request.org on create.",
    )

    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name="units",
        help_text="Parent building that contains this unit.",
    )

    label = models.CharField(
        max_length=50,
        help_text="Unit label/number (e.g., '1A', 'Unit 2', 'Downstairs').",
    )

    bedrooms = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Number of bedrooms (optional).",
    )

    bathrooms = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Number of bathrooms (optional). Use .50 for half baths.",
    )

    sqft = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Square footage (optional).",
    )

    created_at = models.DateTimeField(auto_now_add=True, help_text="Created timestamp.")
    updated_at = models.DateTimeField(auto_now=True, help_text="Last updated timestamp.")

    class Meta:
        indexes = [
            models.Index(fields=["organization", "building"]),
            models.Index(fields=["organization", "label"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["building", "label"],
                name="uniq_unit_label_per_building",
            )
        ]

    def clean(self) -> None:
        """Validate tenant integrity."""
        # Step 1: if either side missing (e.g., partial form), skip
        if not self.organization_id or not self.building_id:
            return

        # Step 2: enforce org match
        if self.building.organization_id != self.organization_id:
            raise ValidationError(
                {"building": "Building belongs to a different organization."}
            )

    def save(self, *args, **kwargs) -> None:
        # Step 1: enforce clean() on every save (admin + services + scripts)
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.building.name} - {self.label}"
