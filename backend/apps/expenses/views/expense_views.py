"""
Expense ViewSet definitions for the expenses domain.

This module owns the main expense API surface, including:
- list
- retrieve
- create
- update
- archive / unarchive
- attachment list / upload

Design principles:
- keep views thin
- use selectors for reads
- use serializers for API shape
- use services for business logic
"""

from __future__ import annotations

from typing import Any

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from apps.expenses.models import Expense
from shared.api.pagination import ExpensesPagination
from apps.expenses.selectors import get_expense_detail, list_expenses
from apps.expenses.serializers import (
    ExpenseArchiveSerializer,
    ExpenseAttachmentCreateSerializer,
    ExpenseAttachmentSerializer,
    ExpenseCreateSerializer,
    ExpenseDetailSerializer,
    ExpenseListSerializer,
    ExpenseUpdateSerializer,
)
from apps.expenses.services import ExpenseService
from apps.expenses.views.mixins import OrganizationScopedViewMixin


class ExpenseViewSet(OrganizationScopedViewMixin, viewsets.ModelViewSet):
    """ViewSet for expense list/detail/create/update/archive endpoints."""

    # Step 1: Make the records pagination contract explicit at the view layer.
    pagination_class = ExpensesPagination

    def get_queryset(self):
        """Return the org-scoped queryset for list operations."""
        organization = self._get_request_organization()
        return list_expenses(
            organization=organization,
            filters=self._build_expense_filters(),
        )

    def get_object(self) -> Expense:
        """Return a single org-scoped expense instance.

        Returns:
            Expense: Matching organization-scoped expense record.

        Raises:
            NotFound: If no matching expense exists.
        """
        organization = self._get_request_organization()
        lookup_value = self.kwargs.get(self.lookup_field, self.kwargs.get("pk"))

        try:
            return get_expense_detail(
                organization=organization,
                expense_id=int(lookup_value),
            )
        except Expense.DoesNotExist as exc:
            raise NotFound("Expense not found.") from exc

    def get_serializer_class(self):
        """Select the serializer class for the current action."""
        if self.action == "list":
            return ExpenseListSerializer

        if self.action == "retrieve":
            return ExpenseDetailSerializer

        if self.action == "create":
            return ExpenseCreateSerializer

        if self.action in {"update", "partial_update"}:
            return ExpenseUpdateSerializer

        if self.action in {"archive", "unarchive"}:
            return ExpenseArchiveSerializer

        if self.action == "attachments":
            if self.request.method == "POST":
                return ExpenseAttachmentCreateSerializer
            return ExpenseAttachmentSerializer

        return ExpenseDetailSerializer

    def get_serializer_context(self) -> dict[str, Any]:
        """Return serializer context for the current request.

        Returns:
            dict[str, Any]: Serializer context with organization added.
        """
        context = super().get_serializer_context()
        context["organization"] = self._get_request_organization()
        return context

    def perform_create(self, serializer):
        """Create an expense while enforcing request organization."""
        organization = self._get_request_organization()
        serializer.save(organization=organization)

    def perform_update(self, serializer):
        """Update an expense through the serializer/service stack."""
        serializer.save()

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Soft-archive an expense."""
        expense = self.get_object()
        expense = ExpenseService.archive_expense(
            expense=expense,
            updated_by=request.user,
        )
        serializer = ExpenseArchiveSerializer(expense)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unarchive(self, request, pk=None):
        """Restore a previously archived expense."""
        expense = self.get_object()
        expense = ExpenseService.unarchive_expense(
            expense=expense,
            updated_by=request.user,
        )
        serializer = ExpenseArchiveSerializer(expense)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"])
    def attachments(self, request, pk=None):
        """List or upload attachments for a specific expense."""
        expense = self.get_object()
        organization = self._get_request_organization()

        if request.method == "GET":
            queryset = expense.attachments.all().order_by("-uploaded_at", "-id")
            serializer = ExpenseAttachmentSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = ExpenseAttachmentCreateSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["expense"].id != expense.id:
            raise ValidationError(
                "Attachment expense id must match the expense in the URL."
            )

        if serializer.validated_data["organization"].id != organization.id:
            raise ValidationError(
                "Attachment organization must match the request organization."
            )

        attachment = serializer.save()
        response_serializer = ExpenseAttachmentSerializer(attachment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)