// # Filename: src/features/leases/components/LeaseSectionShell.tsx

import type { ReactNode } from "react";

type Tone = "default" | "cyan" | "success" | "danger";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: Tone;
};

/**
 * getToneClasses
 *
 * Returns the shell border/background styling for a given visual tone.
 *
 * @param tone Section tone variant.
 * @returns Tailwind classes for the section shell.
 */
function getToneClasses(tone: Tone): string {
  // Step 1: Map tone to stable UI tokens
  switch (tone) {
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/[0.04]";
    case "success":
      return "border-emerald-400/20 bg-emerald-500/[0.05]";
    case "danger":
      return "border-red-400/20 bg-red-500/[0.05]";
    case "default":
    default:
      return "border-white/10 bg-white/[0.03]";
  }
}

/**
 * getIconToneClasses
 *
 * Returns the icon chip styling for the selected tone.
 *
 * @param tone Section tone variant.
 * @returns Tailwind classes for the icon container.
 */
function getIconToneClasses(tone: Tone): string {
  // Step 1: Match icon tone with section tone
  switch (tone) {
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "success":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "danger":
      return "border-red-400/20 bg-red-500/10 text-red-200";
    case "default":
    default:
      return "border-white/10 bg-white/5 text-neutral-200";
  }
}

/**
 * LeaseSectionShell
 *
 * Shared premium section container for lease workflows.
 *
 * Design goals:
 * - Mobile-first stacked layout.
 * - Matches the dark premium EstateIQ workspace styling.
 * - Provides one consistent shell for section headings, helper text,
 *   icon chips, and optional action content.
 *
 * Usage:
 * - Tenant section
 * - Property context section
 * - Lease terms section
 * - Review / warnings section
 */
export default function LeaseSectionShell({
  eyebrow,
  title,
  description,
  icon,
  actions,
  children,
  className = "",
  contentClassName = "",
  tone = "default",
}: Props) {
  const shellToneClasses = getToneClasses(tone);
  const iconToneClasses = getIconToneClasses(tone);

  return (
    <section
      className={[
        "rounded-3xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.015)]",
        "sm:p-5 lg:p-6",
        shellToneClasses,
        className,
      ].join(" ")}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3 sm:gap-4">
              {icon ? (
                <div
                  className={[
                    "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                    iconToneClasses,
                  ].join(" ")}
                >
                  {icon}
                </div>
              ) : null}

              <div className="min-w-0 space-y-2">
                {eyebrow ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    {eyebrow}
                  </p>
                ) : null}

                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {title}
                  </h2>

                  {description ? (
                    <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                      {description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {actions ? (
            <div className="flex w-full shrink-0 items-center justify-stretch lg:w-auto lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>

        <div className={["space-y-4", contentClassName].join(" ").trim()}>
          {children}
        </div>
      </div>
    </section>
  );
}