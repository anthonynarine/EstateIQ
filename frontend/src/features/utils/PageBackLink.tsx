// # Filename: src/components/navigation/PageBackLink.tsx
// ✅ New Code

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  to: string;
  label: string;
  className?: string;
  icon?: ReactNode;
};

/**
 * PageBackLink
 *
 * Small contextual navigation control used inside pages.
 *
 * Use this for "up one level" navigation:
 * - Back to Buildings
 * - Back to Units
 *
 * This is intentionally NOT part of the global dashboard nav.
 */
export default function PageBackLink({
  to,
  label,
  className = "",
  icon,
}: Props) {
  return (
    <Link
      to={to}
      className={[
        "inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10",
        "bg-white/5 px-3 py-2 text-sm text-neutral-300 transition-colors",
        "hover:bg-white/10 hover:text-white",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        className,
      ].join(" ")}
    >
      <span aria-hidden="true">{icon ?? "←"}</span>
      <span>{label}</span>
    </Link>
  );
}