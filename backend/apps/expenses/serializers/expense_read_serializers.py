"""
Read serializers for the expense intelligence domain.

These serializers are shaped for frontend UI needs rather than raw database
representation. They support:
- tables
- cards
- detail pages
- drawer panels
- future audit views
- future AI insight presentation

Business rules do not belong here. These serializers are deterministic read
models for API responses.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from apps.expenses.choices import ExpenseScope, ExpenseStatus
from apps.expenses.models import Expense
from apps.expenses.serializers.attachment_serializers import ExpenseAttachmentSerializer
from apps.expenses.serializers.summary_serializers import (
    ExpenseCategorySummarySerializer,
    VendorSummarySerializer,
)


class ExpenseListSerializer(serializers.ModelSerializer):
    """Rich serializer for expense list views."""

    scope_label = serializers.CharField(source="get_scope_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    reimbursement_status_label = serializers.CharField(
        source="get_reimbursement_status_display",
        read_only=True,
    )

    category = ExpenseCategorySummarySerializer(read_only=True)
    vendor = VendorSummarySerializer(read_only=True)

    building_summary = serializers.SerializerMethodField()
    unit_summary = serializers.SerializerMethodField()
    lease_summary = serializers.SerializerMethodField()

    is_paid = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    can_archive = serializers.SerializerMethodField()
    has_attachments = serializers.SerializerMethodField()
    attachment_count = serializers.IntegerField(read_only=True, default=0)
    location_summary = serializers.SerializerMethodField()
    reimbursement = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "organization",
            "scope",
            "scope_label",
            "building",
            "unit",
            "lease",
            "building_summary",
            "unit_summary",
            "lease_summary",
            "category",
            "vendor",
            "title",
            "amount",
            "expense_date",
            "due_date",
            "paid_date",
            "status",
            "status_label",
            "is_paid",
            "is_overdue",
            "is_reimbursable",
            "reimbursement_status",
            "reimbursement_status_label",
            "reimbursement",
            "location_summary",
            "attachment_count",
            "has_attachments",
            "can_archive",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_building_summary(self, obj: Expense) -> dict | None:
        """Return a compact building summary for UI use."""
        if not obj.building:
            return None

        return {
            "id": obj.building.id,
            "name": getattr(obj.building, "name", str(obj.building)),
        }

    def get_unit_summary(self, obj: Expense) -> dict | None:
        """Return a compact unit summary for UI use."""
        if not obj.unit:
            return None

        return {
            "id": obj.unit.id,
            "name": getattr(obj.unit, "name", str(obj.unit)),
        }

    def get_lease_summary(self, obj: Expense) -> dict | None:
        """Return a compact lease summary for UI use."""
        if not obj.lease:
            return None

        return {
            "id": obj.lease.id,
            "status": getattr(obj.lease, "status", ""),
            "start_date": getattr(obj.lease, "start_date", None),
            "end_date": getattr(obj.lease, "end_date", None),
        }

    def get_is_paid(self, obj: Expense) -> bool:
        """Return whether the expense is currently paid."""
        return obj.status == ExpenseStatus.PAID

    def get_is_overdue(self, obj: Expense) -> bool:
        """Return whether the expense is overdue and unpaid."""
        today = timezone.localdate()

        if obj.is_archived:
            return False

        if not obj.due_date:
            return False

        if obj.status == ExpenseStatus.PAID:
            return False

        if obj.status == ExpenseStatus.CANCELLED:
            return False

        return obj.due_date < today

    def get_can_archive(self, obj: Expense) -> bool:
        """Return whether the expense is currently archivable."""
        return not obj.is_archived

    def get_has_attachments(self, obj: Expense) -> bool:
        """Return whether the expense has one or more attachments."""
        count = getattr(obj, "attachment_count", None)
        if count is not None:
            return count > 0

        return obj.attachments.exists()

    def get_location_summary(self, obj: Expense) -> str:
        """Return a deterministic human-readable scope/location summary."""
        if obj.scope == ExpenseScope.ORGANIZATION:
            return "Portfolio-level"

        if obj.scope == ExpenseScope.BUILDING and obj.building:
            return getattr(obj.building, "name", str(obj.building))

        if obj.scope == ExpenseScope.UNIT and obj.building and obj.unit:
            building_name = getattr(obj.building, "name", str(obj.building))
            unit_name = getattr(obj.unit, "name", str(obj.unit))
            return f"{building_name} • {unit_name}"

        if obj.scope == ExpenseScope.LEASE and obj.building and obj.unit and obj.lease:
            building_name = getattr(obj.building, "name", str(obj.building))
            unit_name = getattr(obj.unit, "name", str(obj.unit))
            return f"Lease #{obj.lease.id} • {building_name} • {unit_name}"

        return "Unscoped"

    def get_reimbursement(self, obj: Expense) -> dict:
        """Return a UI-friendly reimbursement summary object."""
        return {
            "is_reimbursable": obj.is_reimbursable,
            "status": obj.reimbursement_status,
            "status_label": obj.get_reimbursement_status_display(),
        }


class ExpenseDetailSerializer(serializers.ModelSerializer):
    """Rich serializer for expense detail views."""

    scope_label = serializers.CharField(source="get_scope_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    reimbursement_status_label = serializers.CharField(
        source="get_reimbursement_status_display",
        read_only=True,
    )

    category = ExpenseCategorySummarySerializer(read_only=True)
    vendor = VendorSummarySerializer(read_only=True)

    building_summary = serializers.SerializerMethodField()
    unit_summary = serializers.SerializerMethodField()
    lease_summary = serializers.SerializerMethodField()

    is_paid = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    has_attachments = serializers.SerializerMethodField()
    attachment_count = serializers.SerializerMethodField()
    location_summary = serializers.SerializerMethodField()
    reimbursement = serializers.SerializerMethodField()
    attachments = ExpenseAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "organization",
            "scope",
            "scope_label",
            "building",
            "unit",
            "lease",
            "building_summary",
            "unit_summary",
            "lease_summary",
            "category",
            "vendor",
            "title",
            "description",
            "amount",
            "expense_date",
            "due_date",
            "paid_date",
            "status",
            "status_label",
            "is_paid",
            "is_overdue",
            "is_reimbursable",
            "reimbursement_status",
            "reimbursement_status_label",
            "reimbursement",
            "invoice_number",
            "external_reference",
            "notes",
            "source",
            "location_summary",
            "attachment_count",
            "has_attachments",
            "attachments",
            "is_archived",
            "archived_at",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_building_summary(self, obj: Expense) -> dict | None:
        """Return a compact building summary for UI use."""
        if not obj.building:
            return None

        return {
            "id": obj.building.id,
            "name": getattr(obj.building, "name", str(obj.building)),
        }

    def get_unit_summary(self, obj: Expense) -> dict | None:
        """Return a compact unit summary for UI use."""
        if not obj.unit:
            return None

        return {
            "id": obj.unit.id,
            "name": getattr(obj.unit, "name", str(obj.unit)),
        }

    def get_lease_summary(self, obj: Expense) -> dict | None:
        """Return a compact lease summary for UI use."""
        if not obj.lease:
            return None

        return {
            "id": obj.lease.id,
            "status": getattr(obj.lease, "status", ""),
            "start_date": getattr(obj.lease, "start_date", None),
            "end_date": getattr(obj.lease, "end_date", None),
        }

    def get_is_paid(self, obj: Expense) -> bool:
        """Return whether the expense is currently paid."""
        return obj.status == ExpenseStatus.PAID

    def get_is_overdue(self, obj: Expense) -> bool:
        """Return whether the expense is overdue and unpaid."""
        today = timezone.localdate()

        if obj.is_archived:
            return False

        if not obj.due_date:
            return False

        if obj.status == ExpenseStatus.PAID:
            return False

        if obj.status == ExpenseStatus.CANCELLED:
            return False

        return obj.due_date < today

    def get_has_attachments(self, obj: Expense) -> bool:
        """Return whether the expense has one or more attachments."""
        return obj.attachments.exists()

    def get_attachment_count(self, obj: Expense) -> int:
        """Return the attachment count for the expense."""
        return obj.attachments.count()

    def get_location_summary(self, obj: Expense) -> str:
        """Return a deterministic human-readable scope/location summary."""
        if obj.scope == ExpenseScope.ORGANIZATION:
            return "Portfolio-level"

        if obj.scope == ExpenseScope.BUILDING and obj.building:
            return getattr(obj.building, "name", str(obj.building))

        if obj.scope == ExpenseScope.UNIT and obj.building and obj.unit:
            building_name = getattr(obj.building, "name", str(obj.building))
            unit_name = getattr(obj.unit, "name", str(obj.unit))
            return f"{building_name} • {unit_name}"

        if obj.scope == ExpenseScope.LEASE and obj.building and obj.unit and obj.lease:
            building_name = getattr(obj.building, "name", str(obj.building))
            unit_name = getattr(obj.unit, "name", str(obj.unit))
            return f"Lease #{obj.lease.id} • {building_name} • {unit_name}"

        return "Unscoped"

    def get_reimbursement(self, obj: Expense) -> dict:
        """Return a UI-friendly reimbursement summary object."""
        return {
            "is_reimbursable": obj.is_reimbursable,
            "status": obj.reimbursement_status,
            "status_label": obj.get_reimbursement_status_display(),
        }