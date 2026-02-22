# Filename: backend/apps/billing/views.py

from __future__ import annotations

from datetime import date

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.serializers import (
    CreatePaymentResponseSerializer,
    CreatePaymentSerializer,
    DelinquencyQuerySerializer,
    DelinquencyReportResponseSerializer,
    GenerateMonthChargeResponseSerializer,
    GenerateMonthChargeSerializer,
    LeaseLedgerResponseSerializer,
    OrgDashboardQuerySerializer,
    OrgDashboardSummarySerializer,
    RentPostingRunQuerySerializer,
    RentPostingRunResponseSerializer,
)
from apps.billing.services.delinquency_service import DelinquencyService
from apps.billing.services.lease_ledger_service import LeaseLedgerService
from apps.billing.services.org_dashboard_service import OrgDashboardService
from apps.billing.services.rent_charge_service import RentChargeService
from apps.billing.services.rent_posting_service import RentPostingService
from apps.leases.models import Lease
from shared.auth.permissions import IsOrgMember



class OrgScopedAPIView(APIView):
    """Base class for org-scoped endpoints.

    This enforces tenancy at the view boundary so orgless calls never reach
    business logic, preventing 500s like `'NoneType' object has no attribute 'id'`.
    """

    permission_classes = [IsOrgMember]

    def _get_org_or_response(self, request) -> tuple[object | None, Response | None]:
        """Return (org, error_response)."""
        # Step 1: org must be resolved by middleware via X-Org-Slug
        org = getattr(request, "org", None)
        if org is None:
            return (
                None,
                Response(
                    {"detail": "X-Org-Slug header is required for this endpoint."},
                    status=status.HTTP_400_BAD_REQUEST,
                ),
            )
        return org, None


class GenerateLeaseRentChargeMonthView(OrgScopedAPIView):
    """Generate a rent charge for a lease for a given (year, month)."""

    def post(self, request, lease_id: int) -> Response:
        # Step 1: validate input
        serializer = GenerateMonthChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        year = serializer.validated_data["year"]
        month = serializer.validated_data["month"]

        # Step 2: enforce org boundary at query-level
        org, err = self._get_org_or_response(request)
        if err:
            return err

        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 3: call service
        result = RentChargeService.generate_monthly_rent_charge(
            lease_id=lease.id,
            year=year,
            month=month,
        )

        # Step 4: respond
        resp = GenerateMonthChargeResponseSerializer(
            {
                "created": result.created,
                "charge_id": result.charge_id,
                "due_date": result.due_date,
            }
        )
        return Response(resp.data, status=status.HTTP_200_OK)


class LeaseLedgerView(OrgScopedAPIView):
    """Returns computed ledger statement for a lease."""

    def get(self, request, lease_id: int) -> Response:
        # Step 1: org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 2: build ledger
        data = LeaseLedgerService.build_lease_ledger(
            organization_id=org.id,
            lease_id=lease.id,
        )

        # Step 3: respond
        resp = LeaseLedgerResponseSerializer(data)
        return Response(resp.data, status=status.HTTP_200_OK)


class DelinquencyReportView(OrgScopedAPIView):
    """Compute delinquency report for an organization."""

    def get(self, request) -> Response:
        # Step 1: validate query
        q = DelinquencyQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        as_of: date = q.validated_data.get("as_of") or date.today()

        # Step 2: org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: compute report
        rows = DelinquencyService.compute_for_org(
            organization_id=org.id,
            as_of=as_of,
        )

        payload = {
            "as_of": as_of,
            "results": [
                {
                    "lease_id": r.lease_id,
                    "unit_id": r.unit_id,
                    "tenant_name": r.tenant_name,
                    "amount_due": r.amount_due,
                    "days_past_due": r.days_past_due,
                }
                for r in rows
            ],
        }

        resp = DelinquencyReportResponseSerializer(payload)
        return Response(resp.data, status=status.HTTP_200_OK)


class OrgDashboardSummaryView(OrgScopedAPIView):
    """Compute org-level dashboard summary."""

    def get(self, request) -> Response:
        # Step 1: validate query
        q = OrgDashboardQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        as_of = q.validated_data.get("as_of") or date.today()

        # Step 2: org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: compute
        summary = OrgDashboardService.compute(
            organization_id=org.id,
            as_of=as_of,
        )

        resp = OrgDashboardSummarySerializer(summary)
        return Response(resp.data, status=status.HTTP_200_OK)


class CreatePaymentView(OrgScopedAPIView):
    """Create a payment and apply allocations."""

    def post(self, request) -> Response:
        # Step 1: validate input
        s = CreatePaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        # Step 2: org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        lease = get_object_or_404(Lease, id=s.validated_data["lease_id"], organization=org)

        allocation_mode = s.validated_data.get("allocation_mode", "auto")
        allocations_payload = s.validated_data.get("allocations") or []

        # Step 3: service call
        result = LeaseLedgerService.create_payment_and_allocate(
            organization_id=org.id,
            lease_id=lease.id,
            amount=s.validated_data["amount"],
            payment_date=s.validated_data["payment_date"],
            allocation_mode=allocation_mode,
            allocations_payload=allocations_payload,
            memo=s.validated_data.get("memo"),
            reference=s.validated_data.get("reference"),
        )

        # Step 4: respond
        resp = CreatePaymentResponseSerializer(
            {
                "payment_id": result.payment_id,
                "allocations_created": result.allocations_created,
            }
        )
        return Response(resp.data, status=status.HTTP_201_CREATED)


class GenerateLeaseRentChargeCurrentMonthView(OrgScopedAPIView):
    """Generate the current-month rent charge for a lease (server derives year/month)."""

    def post(self, request, lease_id: int) -> Response:
        # Step 1: org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 2: derive current year/month (server-side)
        today = date.today()
        year = today.year
        month = today.month

        # Step 3: call service
        result = RentChargeService.generate_monthly_rent_charge(
            lease_id=lease.id,
            year=year,
            month=month,
        )

        # Step 4: respond
        resp = GenerateMonthChargeResponseSerializer(
            {
                "created": result.created,
                "charge_id": result.charge_id,
                "due_date": result.due_date,
            }
        )
        return Response(resp.data, status=status.HTTP_200_OK)


class RunCurrentMonthRentPostingView(OrgScopedAPIView):
    """Run the current-month rent posting job for the org.

    - idempotent at the service layer
    - used to generate charges for all active leases for the org
    """

    def post(self, request) -> Response:
        # Step 1: validate query
        q = RentPostingRunQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        as_of = q.validated_data.get("as_of") or date.today()

        # Step 2: org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: run service
        result = RentPostingService.run_current_month_for_org(
            organization_id=org.id,
            as_of=as_of,
        )

        # Step 4: respond
        resp = RentPostingRunResponseSerializer(
            {
                "as_of": as_of,
                "leases_processed": result.leases_processed,
                "charges_created": result.charges_created,
                "charges_skipped_existing": result.charges_skipped_existing,
            }
        )
        return Response(resp.data, status=status.HTTP_200_OK)