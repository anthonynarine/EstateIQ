# Filename: backend/apps/billing/views/report_views.py

"""
Reporting views for the billing domain.

This module contains organization-scoped billing report endpoints.

Why this file exists:
- Keeps report-style endpoints separate from payment writes, lease-ledger
  reads, and rent-charge generation endpoints.
- Gives the billing app a dedicated place for delinquency, dashboard, and
  rent-posting operational views.
- Preserves the thin-view pattern while allowing small compatibility adapters
  where legacy service result shapes do not yet perfectly match the public API
  contract.

Refactor note:
This module intentionally normalizes legacy service outputs into the current
serializer contracts so the public API becomes stable before deeper service
refactors.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from rest_framework import status
from rest_framework.response import Response

from apps.billing.serializers import (
    DelinquencyQuerySerializer,
    DelinquencyReportResponseSerializer,
    OrgDashboardQuerySerializer,
    OrgDashboardSummarySerializer,
    RentPostingRunQuerySerializer,
    RentPostingRunResponseSerializer,
)
from apps.billing.services.delinquency_service import DelinquencyService
from apps.billing.services.org_dashboard_service import OrgDashboardService
from apps.billing.services.rent_posting_service import RentPostingService
from apps.billing.views.mixins import OrgScopedAPIView


class DelinquencyReportView(OrgScopedAPIView):
    """
    Return the delinquency report for the active organization.

    Public response contract:
        {
            "as_of": "2026-05-01",
            "results": [
                {
                    "lease_id": 1,
                    "total_outstanding": "950.00",
                    "oldest_due_date": "2026-01-01",
                    "buckets": {
                        "current_0_30": "100.00",
                        "days_31_60": "150.00",
                        "days_61_90": "300.00",
                        "days_90_plus": "400.00"
                    }
                }
            ]
        }
    """

    @staticmethod
    def _row_value(row: Any, *names: str, default: Any = None) -> Any:
        """
        Read a value from a service row object or dict using fallback names.

        Args:
            row: Service result row, either dict-like or object-like.
            *names: Candidate field names to try in order.
            default: Value to return when no field is found.

        Returns:
            Any: First matching value or the provided default.
        """
        # Step 1: support dict-like service rows
        if isinstance(row, dict):
            for name in names:
                if name in row:
                    return row[name]
            return default

        # Step 2: support object-like service rows
        for name in names:
            if hasattr(row, name):
                return getattr(row, name)

        # Step 3: return fallback
        return default

    @classmethod
    def _serialize_delinquency_row(cls, row: Any) -> dict[str, Any]:
        """
        Normalize one service row into the public delinquency serializer shape.

        This compatibility layer lets the view tolerate either:
        - newer service rows that already expose buckets + totals
        - older transitional rows that may use different attribute names

        Args:
            row: One delinquency service result row.

        Returns:
            dict[str, Any]: Payload matching DelinquencyLeaseRowSerializer.
        """
        # Step 1: gather top-level row fields with safe fallbacks
        lease_id = cls._row_value(row, "lease_id")
        total_outstanding = cls._row_value(
            row,
            "total_outstanding",
            "amount_due",
            default="0.00",
        )
        oldest_due_date = cls._row_value(
            row,
            "oldest_due_date",
            default=None,
        )

        # Step 2: gather aging buckets, tolerating either nested or flat shapes
        buckets = cls._row_value(row, "buckets", default=None)
        if isinstance(buckets, dict):
            current_0_30 = buckets.get("current_0_30", "0.00")
            days_31_60 = buckets.get("days_31_60", "0.00")
            days_61_90 = buckets.get("days_61_90", "0.00")
            days_90_plus = buckets.get("days_90_plus", "0.00")
        else:
            current_0_30 = cls._row_value(row, "current_0_30", default="0.00")
            days_31_60 = cls._row_value(row, "days_31_60", default="0.00")
            days_61_90 = cls._row_value(row, "days_61_90", default="0.00")
            days_90_plus = cls._row_value(row, "days_90_plus", default="0.00")

        # Step 3: return serializer-ready row payload
        return {
            "lease_id": lease_id,
            "total_outstanding": total_outstanding,
            "oldest_due_date": oldest_due_date,
            "buckets": {
                "current_0_30": current_0_30,
                "days_31_60": days_31_60,
                "days_61_90": days_61_90,
                "days_90_plus": days_90_plus,
            },
        }

    def get(self, request) -> Response:
        """
        Compute the delinquency report for the active organization.

        Args:
            request: DRF request object.

        Returns:
            Response: Serialized delinquency report payload.
        """
        # Step 1: validate query parameters
        query_serializer = DelinquencyQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        as_of: date = query_serializer.validated_data.get("as_of") or date.today()

        # Step 2: resolve org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: compute report rows through the service layer
        rows = DelinquencyService.compute_for_org(
            organization_id=org.id,
            as_of=as_of,
        )

        # Step 4: normalize service rows into the public serializer contract
        payload = {
            "as_of": as_of,
            "results": [self._serialize_delinquency_row(row) for row in rows],
        }

        # Step 5: serialize and return response
        response_serializer = DelinquencyReportResponseSerializer(instance=payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class OrgDashboardSummaryView(OrgScopedAPIView):
    """
    Return the organization-level billing dashboard summary.

    This endpoint remains intentionally thin because the current service output
    is already expected to align with the serializer contract.
    """

    def get(self, request) -> Response:
        """
        Compute and return the billing dashboard summary.

        Args:
            request: DRF request object.

        Returns:
            Response: Serialized dashboard-summary payload.
        """
        # Step 1: validate query parameters
        query_serializer = OrgDashboardQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        as_of = query_serializer.validated_data.get("as_of") or date.today()

        # Step 2: resolve org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: compute summary through the service layer
        summary = OrgDashboardService.compute(
            organization_id=org.id,
            as_of=as_of,
        )

        # Step 4: serialize and return response
        response_serializer = OrgDashboardSummarySerializer(instance=summary)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class RunCurrentMonthRentPostingView(OrgScopedAPIView):
    """
    Run the current-month rent posting workflow for the active organization.

    This endpoint delegates idempotent monthly posting to the service layer and
    normalizes the result into the public response contract.
    """

    @staticmethod
    def _result_value(result: Any, *names: str, default: Any = None) -> Any:
        """
        Read a value from a service result object or dict using fallback names.

        Args:
            result: Service result object or dict.
            *names: Candidate field names to try in order.
            default: Value to return if no candidate matches.

        Returns:
            Any: First matching value or the provided default.
        """
        # Step 1: support dict-like service results
        if isinstance(result, dict):
            for name in names:
                if name in result:
                    return result[name]
            return default

        # Step 2: support object-like service results
        for name in names:
            if hasattr(result, name):
                return getattr(result, name)

        # Step 3: return fallback
        return default

    def post(self, request) -> Response:
        """
        Run the current-month rent posting operation for the active organization.

        Args:
            request: DRF request object.

        Returns:
            Response: Serialized rent-posting run payload.
        """
        # Step 1: validate query parameters
        query_serializer = RentPostingRunQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        as_of = query_serializer.validated_data.get("as_of") or date.today()

        # Step 2: resolve org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: run posting service
        result = RentPostingService.run_current_month_for_org(
            organization_id=org.id,
            as_of=as_of,
        )

        # Step 4: normalize legacy/new service result shapes
        payload = {
            "as_of": as_of,
            "leases_processed": self._result_value(
                result,
                "leases_processed",
                default=0,
            ),
            "charges_created": self._result_value(
                result,
                "charges_created",
                default=0,
            ),
            "charges_existing": self._result_value(
                result,
                "charges_existing",
                "charges_skipped_existing",
                default=0,
            ),
            "created_charge_ids": self._result_value(
                result,
                "created_charge_ids",
                default=[],
            ),
            "errors": self._result_value(
                result,
                "errors",
                default=[],
            ),
        }

        # Step 5: serialize and return response
        response_serializer = RentPostingRunResponseSerializer(instance=payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)