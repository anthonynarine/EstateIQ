// # Filename: src/features/leases/components/LeaseWorkspaceHero.tsx
// ✅ New Code

import { Link } from "react-router-dom";
import { Building2, ChevronLeft, FilePlus2, Home } from "lucide-react";

type Props = {
  orgSlug: string;
  buildingLabel?: string | null;
  unitLabel?: string | null;
  backTo?: string;
  title?: string;
  description?: string;
};

/**
 * LeaseWorkspaceHero
 *
 * Route-level workspace header for lease creation / management views.
 *
 * Design goals:
 * - noticeably tighter vertical rhythm
 * - more horizontal information density
 * - softer shell styling
 * - inline context instead of bulky context cards
 */
export default function LeaseWorkspaceHero({
  orgSlug,
  buildingLabel,
  unitLabel,
  backTo,
  title = "Create Lease",
  description = "Attach a tenant and define lease terms for this unit.",
}: Props) {
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-950/70 px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.015)] sm:px-5 sm:py-4 lg:px-6 lg:py-5">
      <div className="space-y-3">
        {backTo ? (
          <div>
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to unit
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                <FilePlus2 className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Leasing
                </p>

                <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {title}
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-neutral-400">
                  {description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-300">
                    <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-neutral-500">Building</span>
                    <span className="font-medium text-neutral-200">
                      {buildingLabel || "Not set"}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-300">
                    <Home className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-neutral-500">Unit</span>
                    <span className="font-medium text-neutral-200">
                      {unitLabel || "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-300">
              Org: {orgSlug}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}