// # Filename: src/features/leases/pages/LeaseCreatePage.tsx
// ✅ New Code

import { Link, useSearchParams } from "react-router-dom";
import { FilePlus2, Building2 } from "lucide-react";

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
 * LeaseCreatePage
 *
 * Shared lease creation entry page.
 *
 * Supported launch contexts:
 * - Tenant-first: /dashboard/leases/new?org=<slug>&tenantId=<id>
 * - Unit-first: /dashboard/leases/new?org=<slug>&unitId=<id>
 * - Prefilled both: /dashboard/leases/new?org=<slug>&tenantId=<id>&unitId=<id>
 *
 * For now this page is a shell so we can verify routing and query-param hydration
 * before wiring the full create form refactor.
 */
export default function LeaseCreatePage() {
  const [searchParams] = useSearchParams();

  // Step 1: Read URL context
  const orgSlug = searchParams.get("org") ?? "";
  const tenantId = parseOptionalNumber(searchParams.get("tenantId"));
  const unitId = parseOptionalNumber(searchParams.get("unitId"));
  const buildingId = parseOptionalNumber(searchParams.get("buildingId"));

  // Step 2: Derive launch mode
  const launchMode =
    tenantId && unitId
      ? "tenant-and-unit"
      : tenantId
        ? "tenant-first"
        : unitId
          ? "unit-first"
          : "blank";

  // Step 3: Guard missing org
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
      {/* Step 4: Hero */}
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
                Shared lease creation entry point. This page will support both
                tenant-driven and unit-driven lease setup.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              Org: {orgSlug}
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

      {/* Step 5: Context debug card */}
      <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-xl sm:p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">
              Launch Context
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              This is a temporary verification panel so we can confirm route
              hydration before wiring the full lease form.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                Mode
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {launchMode}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                Tenant ID
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {tenantId ?? "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                Unit ID
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {unitId ?? "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                Building ID
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {buildingId ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}