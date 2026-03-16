"""
Attachment serializers for the expenses domain.

Attachments are split into their own module because they typically grow their
own validation rules, upload concerns, and UI behaviors over time.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.expenses.models import ExpenseAttachment


class ExpenseAttachmentSerializer(serializers.ModelSerializer):
    """Read serializer for expense attachment metadata."""

    class Meta:
        model = ExpenseAttachment
        fields = [
            "id",
            "organization",
            "expense",
            "file",
            "original_filename",
            "content_type",
            "file_size",
            "uploaded_by",
            "uploaded_at",
        ]
        read_only_fields = fields


class ExpenseAttachmentCreateSerializer(serializers.ModelSerializer):
    """Write serializer for uploading expense attachments."""

    class Meta:
        model = ExpenseAttachment
        fields = [
            "organization",
            "expense",
            "file",
            "original_filename",
            "content_type",
            "file_size",
        ]

    def create(self, validated_data: dict) -> ExpenseAttachment:
        """Create attachment metadata while stamping uploader context."""
        request = self.context.get("request")
        user = getattr(request, "user", None)

        return ExpenseAttachment.objects.create(
            uploaded_by=user,
            **validated_data,
        )