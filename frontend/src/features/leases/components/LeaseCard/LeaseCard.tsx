// # Filename: src/features/leases/components/LeaseCard/LeaseCard.tsx
// ✅ New Code

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import {
  getPrimaryLeaseParty,
  requiresPrimaryTenantRepair,
} from "../../utils/leaseParty";
import { useEditLeaseForm } from "../../forms/EditLeaseForm/useEditLeaseForm";
import { useEditLeaseSubmit } from "../../forms/EditLeaseForm/useEditLeaseSubmit";
import type { LeaseCardProps } from "./types";
import {
  formatDateRange,
  getStatusCopy,
  getStatusPillClasses,
} from "./formatters";
import LeaseCardHeader from "./LeaseCardHeader";
import LeaseSummaryGrid from "./LeaseSummaryGrid";
import LeaseTenantPanel from "./LeaseTenantPanel";
import LeaseRepairBanner from "./LeaseRepairBanner";
import LeaseActions from "./LeaseActions";
import EditLeaseModal from "./EditLeaseModal";
import LeaseTermsForm from "./LeaseTermsForm";

/**
 * LeaseCard
 *
 * Orchestrates:
 * - lease display
 * - authoritative tenant display from parties_detail
 * - reducer-backed edit form state
 * - safe edit submit workflow
 *
 * Child components own the layout details.
 */
export default function LeaseCard({
  lease,
  orgSlug,
  unitId,
  compact = false,
  showDbId = false,
  displayLabel,
}: LeaseCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Step 1: Derive the authoritative tenant read model
  const primaryParty = useMemo(() => getPrimaryLeaseParty(lease), [lease]);
  const missingPrimaryTenant = useMemo(
    () => requiresPrimaryTenantRepair(lease),
    [lease],
  );

  const tenantName = primaryParty?.tenant.full_name ?? "Missing primary tenant";
  const tenantEmail = primaryParty?.tenant.email ?? null;
  const tenantPhone = primaryParty?.tenant.phone ?? null;

  // Step 2: Build stable display title
  const title = useMemo(() => {
    if (displayLabel) {
      return displayLabel;
    }

    if (showDbId) {
      return `Lease #${lease.id}`;
    }

    return "Lease";
  }, [displayLabel, lease.id, showDbId]);

  // Step 3: Build stable ledger navigation target
  const ledgerHref = useMemo(() => {
    const basePath = `/dashboard/leases/${lease.id}/ledger`;

    if (!orgSlug) {
      return basePath;
    }

    return `${basePath}?org=${encodeURIComponent(orgSlug)}`;
  }, [lease.id, orgSlug]);

  // Step 4: Initialize reducer-backed edit form
  const form = useEditLeaseForm(lease);

  // Step 5: Initialize safe submit workflow
  const { isSubmitting, submit } = useEditLeaseSubmit({
    orgSlug,
    unitId,
    lease,
    form,
    onSuccess: () => {
      setIsOpen(false);
    },
  });

  // Step 6: Normalize mutation error display from local form state only
  const onOpen = () => {
    form.reset();
    setIsOpen(true);
  };

  const onClose = () => {
    form.reset();
    setIsOpen(false);
  };

  const onReset = () => {
    form.reset();
  };

  const onSubmit = async () => {
    await submit();
  };

  if (compact) {
    return (
      <>
        <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {title}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${getStatusPillClasses(
                    lease.status,
                  )}`}
                >
                  {getStatusCopy(lease.status)}
                </span>
              </div>

              <p className="mt-2 text-xs text-neutral-400">
                {formatDateRange(lease.start_date, lease.end_date)}
                {showDbId ? (
                  <span className="ml-2 text-neutral-600">
                    (id: {lease.id})
                  </span>
                ) : null}
              </p>

              <div className="mt-3 flex items-center gap-2 text-xs">
                <UserRound className="h-4 w-4 text-cyan-300" />
                <span
                  className={
                    missingPrimaryTenant
                      ? "text-amber-300"
                      : "text-neutral-200"
                  }
                >
                  {tenantName}
                </span>
              </div>

              {missingPrimaryTenant ? (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                  This lease needs a primary tenant repair before safe updates.
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={ledgerHref}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-neutral-100 ring-1 ring-white/10 transition hover:bg-white/8 hover:text-white"
              >
                Open ledger
              </Link>

              <LeaseActions compact onEdit={onOpen} />
            </div>
          </div>
        </article>

        <EditLeaseModal
          isOpen={isOpen}
          lease={lease}
          unitId={unitId}
          showDbId={showDbId}
          tenantName={tenantName}
          missingPrimaryTenant={missingPrimaryTenant}
          localError={form.localError}
          apiErrorMessage={null}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onReset={onReset}
          onSubmit={onSubmit}
        >
          <LeaseTermsForm
            startDate={form.startDate}
            endDate={form.endDate}
            rentAmount={form.rentAmount}
            securityDepositAmount={form.securityDeposit}
            rentDueDay={form.rentDueDay}
            status={form.status}
            onStartDateChange={form.setStartDate}
            onEndDateChange={form.setEndDate}
            onRentAmountChange={form.setRentAmount}
            onSecurityDepositChange={form.setSecurityDeposit}
            onRentDueDayChange={form.setRentDueDay}
            onStatusChange={form.setStatus}
          />
        </EditLeaseModal>
      </>
    );
  }

  return (
    <>
      <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/20 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-4">
            <LeaseCardHeader
              title={title}
              status={lease.status}
              startDate={lease.start_date}
              endDate={lease.end_date}
              leaseId={lease.id}
              showDbId={showDbId}
            />

            <LeaseTenantPanel
              tenantName={tenantName}
              tenantEmail={tenantEmail}
              tenantPhone={tenantPhone}
              leaseStatus={lease.status}
              missingPrimaryTenant={missingPrimaryTenant}
            />

            <LeaseSummaryGrid
              rentAmount={lease.rent_amount}
              rentDueDay={lease.rent_due_day}
              securityDepositAmount={lease.security_deposit_amount}
            />

            {missingPrimaryTenant ? <LeaseRepairBanner /> : null}
          </div>
        </div>

        <div className="mt-auto pt-5">
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="max-w-xl text-sm text-neutral-400">
                Review lease terms, status, tenant context, and billing activity
                for this lease.
              </p>

              <div className="flex items-center gap-2">
                <Link
                  to={ledgerHref}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-neutral-100 ring-1 ring-white/10 transition hover:bg-white/8 hover:text-white"
                >
                  Open ledger
                </Link>

                <button
                  type="button"
                  onClick={onOpen}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-neutral-100 ring-1 ring-white/10 transition hover:bg-white/8 hover:text-white"
                >
                  Edit lease
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <EditLeaseModal
        isOpen={isOpen}
        lease={lease}
        unitId={unitId}
        showDbId={showDbId}
        tenantName={tenantName}
        missingPrimaryTenant={missingPrimaryTenant}
        localError={form.localError}
        apiErrorMessage={null}
        isSubmitting={isSubmitting}
        onClose={onClose}
        onReset={onReset}
        onSubmit={onSubmit}
      >
        <LeaseTermsForm
          startDate={form.startDate}
          endDate={form.endDate}
          rentAmount={form.rentAmount}
          securityDepositAmount={form.securityDeposit}
          rentDueDay={form.rentDueDay}
          status={form.status}
          onStartDateChange={form.setStartDate}
          onEndDateChange={form.setEndDate}
          onRentAmountChange={form.setRentAmount}
          onSecurityDepositChange={form.setSecurityDeposit}
          onRentDueDayChange={form.setRentDueDay}
          onStatusChange={form.setStatus}
        />
      </EditLeaseModal>
    </>
  );
}