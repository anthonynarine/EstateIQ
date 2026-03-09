// # Filename: src/features/leases/components/LeaseWorkspaceHero.tsx

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
 * - Mobile-first stacked layout.
 * - Matches the premium dark EstateIQ dashboard language.
 * - Establishes workflow context immediately.
 * - Shows the fixed unit/building context for unit-first lease creation.
 */
export default function LeaseWorkspaceHero({
  orgSlug,
  buildingLabel,
  unitLabel,
  backTo,
  title = "Create Lease",
  description = "Attach a tenant and define lease terms for this unit.",
}: Props) {
  const contextItems = [
    {
      icon: <Building2 className="h-4 w-4" />,
      label: "Building",
      value: buildingLabel || "Not set",
    },
    {
      icon: <Home className="h-4 w-4" />,
      label: "Unit",
      value: unitLabel || "Not set",
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-950/70 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.015)] sm:p-5 lg:p-6">
      <div className="space-y-5">
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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                <FilePlus2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Leasing
                </p>

                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {title}
                  </h1>

                  <p className="max-w-3xl text-sm leading-6 text-neutral-400 sm:text-[15px]">
                    {description}
                  </p>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contextItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300">
                  {item.icon}
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white sm:text-[15px]">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}