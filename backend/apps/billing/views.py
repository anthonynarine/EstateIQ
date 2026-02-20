from datetime import date

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.serializers import (
    DelinquencyQuerySerializer,
    DelinquencyReportResponseSerializer,
    GenerateMonthChargeResponseSerializer,
    GenerateMonthChargeSerializer,
    LeaseLedgerResponseSerializer,
    OrgDashboardQuerySerializer,
    OrgDashboardSummarySerializer,
    CreatePaymentResponseSerializer,
    CreatePaymentSerializer,
    RentPostingRunQuerySerializer,
    RentPostingRunResponseSerializer
)
from apps.billing.services.delinquency_service import DelinquencyService
from apps.billing.services.lease_ledger_service import LeaseLedgerService
from apps.billing.services.org_dashboard_service import OrgDashboardService
from apps.billing.services.rent_charge_service import RentChargeService
from apps.leases.models import Lease
from apps.billing.services.allocation_service import AllocationRequest, AllocationService
from apps.billing.models import Payment
from apps.billing.services.rent_posting_service import RentPostingService


class GenerateLeaseRentChargeMonthView(APIView):
    """
    POST /api/v1/leases/{lease_id}/charges/generate-month/

    Generates the rent charge for a given lease and month (idempotent).
    """

    def post(self, request, lease_id: int) -> Response:
        # Step 1: validate payload
        serializer = GenerateMonthChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        year = serializer.validated_data["year"]
        month = serializer.validated_data["month"]

        # Step 2: enforce org boundary at query-level
        org = request.org  # assumes your OrgMiddleware attaches request.org
        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 3: call service
        result = RentChargeService.generate_monthly_rent_charge(
            lease_id=lease.id,
            year=year,
            month=month,
            created_by_id=getattr(request.user, "id", None),
        )

        # Step 4: return response
        resp = GenerateMonthChargeResponseSerializer(
            {
                "created": result.created,
                "charge_id": result.charge_id,
                "due_date": result.due_date,
            }
        )
        return Response(resp.data, status=status.HTTP_200_OK)

class LeaseLedgerView(APIView):

    """
    GET /api/v1/leases/{lease_id}/ledger/

    Returns computed ledger statement for a lease.
    """

    def get(self, request, lease_id: int) -> Response:
        # Step 1: org boundary
        org = request.org
        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 2: build ledger
        data = LeaseLedgerService.build_lease_ledger(
            organization_id=org.id,
            lease_id=lease.id,
        )

        # Step 3: serialize and return
        serializer = LeaseLedgerResponseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class DelinquencyReportView(APIView):
    """
    GET /api/v1/reports/delinquency/?as_of=YYYY-MM-DD

    Returns A/R aging buckets per lease as-of a date.
    """

    def get(self, request) -> Response:
        # Step 1: validate query params
        q = DelinquencyQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        as_of: date = q.validated_data.get("as_of") or date.today()

        # Step 2: org boundary
        org = request.org

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
                    "total_outstanding": r.total_outstanding,
                    "oldest_due_date": r.oldest_due_date,
                    "buckets": {
                        "current_0_30": r.buckets.current_0_30,
                        "days_31_60": r.buckets.days_31_60,
                        "days_61_90": r.buckets.days_61_90,
                        "days_90_plus": r.buckets.days_90_plus,
                    },
                }
                for r in rows
            ],
        }

        # Step 4: serialize response
        s = DelinquencyReportResponseSerializer(data=payload)
        s.is_valid(raise_exception=True)
        return Response(s.data, status=status.HTTP_200_OK)

class OrgDashboardSummaryView(APIView):
    """
    GET /api/v1/reports/dashboard-summary/?as_of=YYYY-MM-DD
    """

    def get(self, request) -> Response:
        # Step 1: validate query
        q = OrgDashboardQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        as_of = q.validated_data.get("as_of") or date.today()

        # Step 2: org boundary
        org = request.org

        # Step 3: compute
        summary = OrgDashboardService.compute(
            organization_id=org.id,
            as_of=as_of,
        )

        payload = {
            "as_of": summary.as_of,
            "expected_rent_this_month": summary.expected_rent_this_month,
            "collected_this_month": summary.collected_this_month,
            "outstanding_as_of": summary.outstanding_as_of,
            "delinquent_leases_count": summary.delinquent_leases_count,
            "unapplied_credits_total": summary.unapplied_credits_total,
        }

        s = OrgDashboardSummarySerializer(data=payload)
        s.is_valid(raise_exception=True)
        return Response(s.data, status=status.HTTP_200_OK)

class CreatePaymentView(APIView):
    """
    POST /api/v1/payments/

    Creates a payment and allocates it:
      - allocation_mode=auto (default): FIFO oldest-due-first
      - allocation_mode=manual: allocations[] required
    """

    def post(self, request) -> Response:
        # Step 1: validate input
        s = CreatePaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        org = request.org
        lease = get_object_or_404(Lease, id=s.validated_data["lease_id"], organization=org)

        allocation_mode = s.validated_data.get("allocation_mode", "auto")
        allocations_payload = s.validated_data.get("allocations") or []

        # Step 2: create payment (fact)
        payment = Payment.objects.create(
            organization=org,
            lease=lease,
            amount=s.validated_data["amount"],
            paid_at=s.validated_data["paid_at"],
            method=s.validated_data.get("method") or "other",
            external_ref=s.validated_data.get("external_ref", ""),
            notes=s.validated_data.get("notes", ""),
            created_by=request.user if request.user.is_authenticated else None,
        )

        # Step 3: allocate via service
        if allocation_mode == "manual":
            if not allocations_payload:
                return Response(
                    {"detail": "allocations[] is required when allocation_mode=manual."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            reqs = [
                AllocationRequest(charge_id=item["charge_id"], amount=item["amount"])
                for item in allocations_payload
            ]
            result = AllocationService.allocate_payment_manual(payment.id, reqs)
        else:
            result = AllocationService.allocate_payment_auto(payment.id)

        # Step 4: response
        payload = {
            "payment_id": payment.id,
            "allocation_mode": allocation_mode,
            "allocated_total": result.allocated_total,
            "unapplied_amount": result.unapplied_amount,
            "allocation_ids": result.allocation_ids,
        }
        resp = CreatePaymentResponseSerializer(data=payload)
        resp.is_valid(raise_exception=True)
        return Response(resp.data, status=status.HTTP_201_CREATED)

class GenerateLeaseRentChargeCurrentMonthView(APIView):
    """
    POST /api/v1/leases/{lease_id}/charges/generate-current-month/

    Convenience endpoint:
    - derives (year, month) from server date.today()
    - calls RentChargeService.generate_monthly_rent_charge (idempotent)
    """

    def post(self, request, lease_id: int) -> Response:
        # Step 1: org boundary
        org = request.org
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
            created_by_id=getattr(request.user, "id", None),
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

class RunCurrentMonthRentPostingView(APIView):
    """
    POST /api/v1/reports/rent-posting/run-current-month/?as_of=YYYY-MM-DD

    Runs bulk rent posting for the org for the month containing `as_of`.
    """

    def post(self, request) -> Response:
        # Step 1: validate query
        q = RentPostingRunQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        as_of = q.validated_data.get("as_of") or date.today()

        # Step 2: org boundary
        org = request.org

        # Step 3: run service
        result = RentPostingService.run_current_month_for_org(
            organization_id=org.id,
            as_of=as_of,
            created_by_id=getattr(request.user, "id", None),
        )

        payload = {
            "as_of": result.as_of,
            "leases_processed": result.leases_processed,
            "charges_created": result.charges_created,
            "charges_existing": result.charges_existing,
            "created_charge_ids": result.created_charge_ids,
            "errors": [{"lease_id": e.lease_id, "error": e.error} for e in result.errors],
        }

        s = RentPostingRunResponseSerializer(data=payload)
        s.is_valid(raise_exception=True)
        return Response(s.data, status=status.HTTP_200_OK)
