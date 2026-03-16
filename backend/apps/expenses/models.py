"""
Core data models for the expense intelligence domain.

This module stores the durable financial truth for expense records.

Design principles:
- expenses are explicit, positive-value outflow records
- scope is modeled deliberately, not inferred loosely from random FK combinations
- relationships are org-scoped and audit-friendly
- database constraints enforce structural correctness where possible
- deeper cross-model validation is deferred to the service layer

Important:
This module defines the storage model only.
Business workflow orchestration, relationship validation, and write rules belong
in services.py.
"""

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from apps.expenses.choices import (
    ExpenseCategoryKind,
    ExpenseScope,
    ExpenseSource,
    ExpenseStatus,
    ReimbursementStatus,
    VendorType,
)


class ExpenseCategory(models.Model):
    """Organization-owned expense category used for classification and reporting.

    Categories are modeled as first-class records instead of free-text labels so
    the platform can support:
    - clean reporting
    - future tax-aligned categorization
    - AI-assisted classification suggestions
    - category trend and drift analysis
    """

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="expense_categories",
    )
    name = models.CharField(
        max_length=120,
        help_text="Human-readable category name within the organization.",
    )
    slug = models.SlugField(
        max_length=140,
        help_text="Stable slug used for filtering and programmatic references.",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        help_text="Optional parent category for hierarchical classification.",
    )
    kind = models.CharField(
        max_length=50,
        choices=ExpenseCategoryKind.choices,
        default=ExpenseCategoryKind.OTHER,
        help_text="High-level grouping for reporting and intelligence.",
    )
    description = models.TextField(
        blank=True,
        help_text="Optional internal description of how this category should be used.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the category is active for new expense assignment.",
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Optional UI/report ordering value.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Model metadata for ExpenseCategory."""

        ordering = ["sort_order", "name"]
        unique_together = [("organization", "slug")]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["organization", "kind"]),
            models.Index(fields=["organization", "name"]),
        ]
        verbose_name = "Expense category"
        verbose_name_plural = "Expense categories"

    def __str__(self) -> str:
        """Return a readable category label."""
        return f"{self.name} ({self.organization_id})"


class Vendor(models.Model):
    """Organization-owned payee/vendor registry.

    Vendors are separated from Expense so spend can be analyzed by payee over
    time. This supports future reporting and AI features such as:
    - vendor concentration analysis
    - expensive vendor identification
    - duplicate/suspicious vendor spend detection
    """

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="vendors",
    )
    name = models.CharField(
        max_length=200,
        help_text="Vendor or payee display name.",
    )
    vendor_type = models.CharField(
        max_length=50,
        choices=VendorType.choices,
        blank=True,
        help_text="Optional classification for reporting and filtering.",
    )
    contact_name = models.CharField(
        max_length=120,
        blank=True,
        help_text="Optional contact person name.",
    )
    email = models.EmailField(
        blank=True,
        help_text="Optional vendor email address.",
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        help_text="Optional vendor phone number.",
    )
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about the vendor.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the vendor is active for new expense assignment.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Model metadata for Vendor."""

        ordering = ["name"]
        unique_together = [("organization", "name")]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["organization", "vendor_type"]),
            models.Index(fields=["organization", "name"]),
        ]
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"

    def __str__(self) -> str:
        """Return a readable vendor label."""
        return self.name


class Expense(models.Model):
    """Canonical expense truth record.

    An expense represents a positive-value outflow or payable record tied to an
    explicit organizational scope.

    Scope rules:
    - organization scope: building/unit/lease must be null
    - building scope: building required, unit/lease null
    - unit scope: building and unit required, lease null
    - lease scope: lease required; building/unit are persisted for reporting and
      must be kept consistent with the lease by the service layer

    Important:
    Cross-model consistency checks such as org alignment and lease/unit/building
    derivation belong in services.py, not in model save() methods.
    """

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    building = models.ForeignKey(
        "buildings.Building",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="Building scope or derived building for lease-scoped expenses.",
    )
    unit = models.ForeignKey(
        "buildings.Unit",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="Unit scope or derived unit for lease-scoped expenses.",
    )
    lease = models.ForeignKey(
        "leases.Lease",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="Lease reference for lease-scoped expenses.",
    )
    scope = models.CharField(
        max_length=20,
        choices=ExpenseScope.choices,
        help_text="Structural scope of this expense record.",
    )
    category = models.ForeignKey(
        "expenses.ExpenseCategory",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="Optional structured category for reporting and intelligence.",
    )
    vendor = models.ForeignKey(
        "expenses.Vendor",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="Optional payee/vendor reference.",
    )
    title = models.CharField(
        max_length=200,
        help_text="Short human-readable expense title.",
    )
    description = models.TextField(
        blank=True,
        help_text="Optional structured description or memo.",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Positive expense amount stored as Decimal.",
    )
    expense_date = models.DateField(
        help_text="Primary reporting date for when the expense occurred.",
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Optional due date for unpaid/submitted expenses.",
    )
    paid_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date the expense was paid, if applicable.",
    )
    status = models.CharField(
        max_length=20,
        choices=ExpenseStatus.choices,
        default=ExpenseStatus.DRAFT,
        help_text="Operational state of the expense.",
    )
    is_reimbursable = models.BooleanField(
        default=False,
        help_text="Whether this expense is eligible for reimbursement tracking.",
    )
    reimbursement_status = models.CharField(
        max_length=20,
        choices=ReimbursementStatus.choices,
        default=ReimbursementStatus.NOT_APPLICABLE,
        help_text="Reimbursement workflow state.",
    )
    invoice_number = models.CharField(
        max_length=120,
        blank=True,
        help_text="Optional vendor invoice or bill number.",
    )
    external_reference = models.CharField(
        max_length=120,
        blank=True,
        help_text="Optional import/reference id from an external system.",
    )
    notes = models.TextField(
        blank=True,
        help_text="Internal notes not intended to replace structured data.",
    )
    source = models.CharField(
        max_length=20,
        choices=ExpenseSource.choices,
        default=ExpenseSource.MANUAL,
        help_text="How this expense entered the system.",
    )
    is_archived = models.BooleanField(
        default=False,
        help_text="Soft-archive flag used to hide inactive records from default views.",
    )
    archived_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp for when the record was archived.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_expenses",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_expenses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Model metadata for Expense."""

        ordering = ["-expense_date", "-id"]
        indexes = [
            models.Index(fields=["organization", "expense_date"]),
            models.Index(fields=["organization", "status", "due_date"]),
            models.Index(fields=["organization", "scope", "expense_date"]),
            models.Index(fields=["organization", "building", "expense_date"]),
            models.Index(fields=["organization", "unit", "expense_date"]),
            models.Index(fields=["organization", "lease", "expense_date"]),
            models.Index(fields=["organization", "category", "expense_date"]),
            models.Index(fields=["organization", "vendor", "expense_date"]),
            models.Index(fields=["organization", "is_archived", "expense_date"]),
        ]
        constraints = [
            # Step 1: Amount must always be positive.
            models.CheckConstraint(
                check=Q(amount__gt=0),
                name="expenses_expense_amount_positive",
            ),
            # Step 2: A unit can never exist without a building.
            models.CheckConstraint(
                check=Q(unit__isnull=True) | Q(building__isnull=False),
                name="expenses_expense_unit_requires_building",
            ),
            # Step 3: Organization-scoped expenses cannot point to property objects.
            models.CheckConstraint(
                check=(
                    Q(scope=ExpenseScope.ORGANIZATION)
                    & Q(building__isnull=True)
                    & Q(unit__isnull=True)
                    & Q(lease__isnull=True)
                )
                | ~Q(scope=ExpenseScope.ORGANIZATION),
                name="expenses_expense_org_scope_shape",
            ),
            # Step 4: Building-scoped expenses require a building only.
            models.CheckConstraint(
                check=(
                    Q(scope=ExpenseScope.BUILDING)
                    & Q(building__isnull=False)
                    & Q(unit__isnull=True)
                    & Q(lease__isnull=True)
                )
                | ~Q(scope=ExpenseScope.BUILDING),
                name="expenses_expense_building_scope_shape",
            ),
            # Step 5: Unit-scoped expenses require building and unit, but no lease.
            models.CheckConstraint(
                check=(
                    Q(scope=ExpenseScope.UNIT)
                    & Q(building__isnull=False)
                    & Q(unit__isnull=False)
                    & Q(lease__isnull=True)
                )
                | ~Q(scope=ExpenseScope.UNIT),
                name="expenses_expense_unit_scope_shape",
            ),
            # Step 6: Lease-scoped expenses require a lease.
            models.CheckConstraint(
                check=(Q(scope=ExpenseScope.LEASE) & Q(lease__isnull=False))
                | ~Q(scope=ExpenseScope.LEASE),
                name="expenses_expense_lease_scope_shape",
            ),
        ]
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"

    def __str__(self) -> str:
        """Return a readable expense label."""
        return f"{self.title} - {self.amount} on {self.expense_date}"


class ExpenseAttachment(models.Model):
    """Attachment metadata for an expense.

    This model stores supporting document references for receipts, invoices,
    statements, and other evidence tied to an expense record.

    The file field is intentionally simple in v1. More advanced storage
    abstractions, OCR pipelines, and document extraction workflows can be added
    later without changing the core Expense model.
    """

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="expense_attachments",
    )
    expense = models.ForeignKey(
        "expenses.Expense",
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(
        upload_to="expense_attachments/%Y/%m/",
        help_text="Uploaded attachment file.",
    )
    original_filename = models.CharField(
        max_length=255,
        blank=True,
        help_text="Original client-side filename if captured.",
    )
    content_type = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional MIME type metadata.",
    )
    file_size = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        help_text="Optional file size in bytes.",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_expense_attachments",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        """Model metadata for ExpenseAttachment."""

        ordering = ["-uploaded_at", "-id"]
        indexes = [
            models.Index(fields=["organization", "expense"]),
            models.Index(fields=["organization", "uploaded_at"]),
        ]
        verbose_name = "Expense attachment"
        verbose_name_plural = "Expense attachments"

    def __str__(self) -> str:
        """Return a readable attachment label."""
        return self.original_filename or self.file.name