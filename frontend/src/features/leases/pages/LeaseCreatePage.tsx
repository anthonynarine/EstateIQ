// # Filename: src/features/leases/pages/LeaseCreatePage.tsx

import { Link, useSearchParams } from "react-router-dom";
import { Building2, FilePlus2 } from "lucide-react";

import CreateLeaseForm, {
  type LeaseCreateInitialContext,
  type LeaseCreateLaunchMode,
} from "../forms/CreateLeaseForm/CreateLeaseForm";

/**
 * parseOptionalNumber
 *
 * Safely converts a query param string into a number.
 *
 * @param value Raw query param value.
 * @returns Parsed number or null when invalid.
 */
function parseOptionalNumber(value: string | null): number | null {
  // Step 1: Guard missing values
  if (!value) {
    return null;
  }

  // Step 2: Convert to number
  const parsed = Number(value);

  // Step 3: Reject invalid values
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

/**
 * deriveLaunchMode
 *
 * Determines which lease-create workflow launched this page.
 *
 * @param tenantId Parsed tenant id
 * @param unitId Parsed unit id
 * @returns Launch mode for the shared lease form
 */
function deriveLaunchMode(
  tenantId: number | null,
  unitId: number | null
): LeaseCreateLaunchMode {
  // Step 1: Both tenant + unit present
  if (tenantId && unitId) {
    return "tenant-and-unit";
  }

  // Step 2: Tenant-only launch
  if (tenantId) {
    return "tenant-first";
  }

  // Step 3: Unit-only launch
  if (unitId) {
    return "unit-first";
  }

  // Step 4: Fully manual launch
  return "blank";
}

/**
 * LeaseCreatePage
 *
 * Shared lease creation entry page.
 *
 * Supported launch contexts:
 * - Tenant-first: /dashboard/leases/new?org=<slug>&tenantId=<id>
 * - Unit-first: /dashboard/leases/new?org=<slug>&unitId=<id>
 * - Prefilled both: /dashboard/leases/new?org=<slug>&tenantId=<id>&unitId=<id>
 * - Optional building assist: /dashboard/leases/new?org=<slug>&buildingId=<id>
 *
 * Responsibilities:
 * - Parse URL search params
 * - Build deterministic initial launch context
 * - Guard missing org scope
 * - Hand off context to the shared CreateLeaseForm
 */
export default function LeaseCreatePage() {
  const [searchParams] = useSearchParams();

  // Step 1: Read raw URL context
  const orgSlug = (searchParams.get("org") ?? "").trim();
  const tenantId = parseOptionalNumber(searchParams.get("tenantId"));
  const unitId = parseOptionalNumber(searchParams.get("unitId"));
  const buildingId = parseOptionalNumber(searchParams.get("buildingId"));

  // Step 2: Derive shared launch mode
  const launchMode = deriveLaunchMode(tenantId, unitId);

  // Step 3: Build initial context for the shared lease form
  const initialContext: LeaseCreateInitialContext = {
    orgSlug,
    tenantId,
    unitId,
    buildingId,
    launchMode,
  };

  // Step 4: Guard missing org scope
  if (!orgSlug) {
    return (
      <section className="space-y-5 sm:space-y-6">
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xl sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-300">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/70">
                Lease workspace
              </p>

              <h1 className="text-lg font-semibold text-white sm:text-xl">
                Lease Creation
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-neutral-300">
                No organization is currently selected. Open lease creation from
                an org-scoped workflow so the page can initialize safely.
              </p>

              <div className="pt-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* Step 5: Page hero */}
      <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-300">
              <FilePlus2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Leasing
              </p>

              <h1 className="text-lg font-semibold text-white sm:text-xl">
                Create Lease
              </h1>

              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Create a lease using unit-first, tenant-first, combined, or
                manual launch context without leaving the shared workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              Org: {orgSlug}
            </span>

            <span className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
              Mode: {launchMode}
            </span>

            <Link
              to={`/dashboard?org=${orgSlug}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Step 6: Shared form */}
      <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-xl sm:p-6">
        <CreateLeaseForm initialContext={initialContext} />
      </div>
    </section>
  );
}