"""
Shared view mixins for the expenses domain.

This module contains request-scoped helpers used across expense-related
ViewSets. The goal is to keep endpoint classes focused on resource behavior
while centralizing multi-tenant request handling and query param parsing.

Assumption:
The current organization is attached to `request.organization` by middleware.
If your project uses a different attribute name, update `_get_request_organization`.
"""

from __future__ import annotations

from typing import Any

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied, ValidationError


class OrganizationScopedViewMixin:
    """Shared helper mixin for organization-scoped expense views."""

    permission_classes = [permissions.IsAuthenticated]

    def _get_request_organization(self) -> Any:
        """Return the organization resolved for the current request.

        Returns:
            Any: Organization instance attached to the request.

        Raises:
            PermissionDenied: If no organization is available on the request.
        """
        organization = getattr(self.request, "organization", None)
        if organization is None:
            raise PermissionDenied("No organization was resolved for this request.")

        return organization

    def _parse_bool_query_param(self, value: str | None) -> bool | None:
        """Parse a boolean-like query parameter value.

        Accepted truthy values:
        - true
        - 1
        - yes

        Accepted falsy values:
        - false
        - 0
        - no

        Args:
            value: Raw query param value.

        Returns:
            bool | None: Parsed boolean or None when empty/missing.

        Raises:
            ValidationError: If the value cannot be parsed as boolean.
        """
        if value is None or value == "":
            return None

        normalized = str(value).strip().lower()

        if normalized in {"true", "1", "yes"}:
            return True

        if normalized in {"false", "0", "no"}:
            return False

        raise ValidationError(f"Invalid boolean query parameter value: {value}")

    def _build_expense_filters(self) -> dict[str, Any]:
        """Normalize expense list filters from request query params.

        Returns:
            dict[str, Any]: Normalized filter payload for expense selectors.
        """
        query_params = self.request.query_params

        return {
            "building": query_params.get("building"),
            "unit": query_params.get("unit"),
            "lease": query_params.get("lease"),
            "category": query_params.get("category"),
            "vendor": query_params.get("vendor"),
            "status": query_params.get("status"),
            "scope": query_params.get("scope"),
            "reimbursement_status": query_params.get("reimbursement_status"),
            "is_reimbursable": self._parse_bool_query_param(
                query_params.get("is_reimbursable")
            ),
            "is_archived": self._parse_bool_query_param(
                query_params.get("is_archived")
            ),
            "expense_date_from": query_params.get("expense_date_from"),
            "expense_date_to": query_params.get("expense_date_to"),
            "due_date_from": query_params.get("due_date_from"),
            "due_date_to": query_params.get("due_date_to"),
            "search": query_params.get("search"),
        }