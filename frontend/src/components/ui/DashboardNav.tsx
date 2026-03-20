// # Filename: src/components/ui/DashboardNav.tsx

import { NavLink, useLocation } from "react-router-dom";
import { useOrg } from "../../features/tenancy/hooks/useOrg";

type Props = {
  variant?: "top" | "bottom";
};

type Item = {
  label: string;
  to: string;
  requiresOrg?: boolean;
};

const NAV_ITEMS: Item[] = [
  // ✅ New Code
  { label: "Home", to: "/dashboard" },
  { label: "Buildings", to: "/dashboard/buildings", requiresOrg: true },
  { label: "Tenants", to: "/dashboard/tenants", requiresOrg: true },
  { label: "Expenses", to: "/dashboard/expenses", requiresOrg: true },
];

export default function DashboardNav({ variant = "top" }: Props) {
  const isBottom = variant === "bottom";
  const location = useLocation();
  const { orgSlug } = useOrg();

  // # Step 1: Preserve ?org=... when navigating.
  const withSearch = (path: string) => `${path}${location.search}`;

  // # Step 2: Keep top nav compact and tight.
  const baseTop =
    "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium leading-none transition-colors duration-200";

  // # Step 3: Keep bottom nav usable on mobile but still visually aligned.
  const baseBottom =
    "flex flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium leading-none transition-colors duration-200";

  const base = isBottom ? baseBottom : baseTop;

  // # Step 4: Active state should emphasize text first, then border/background.
  const active =
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.06)]";

  // # Step 5: Hover state stays compact but feels interactive.
  const inactive =
    "border-transparent bg-transparent text-zinc-300 hover:border-white/12 hover:bg-white/[0.04] hover:text-white";

  const disabled =
    "cursor-not-allowed border-transparent bg-transparent text-zinc-600";

  return (
    <nav
      className={
        isBottom
          ? "flex items-center justify-between gap-2"
          : "flex items-center gap-2"
      }
    >
      {NAV_ITEMS.map((item) => {
        const isDisabled = Boolean(item.requiresOrg) && !orgSlug;

        if (isDisabled) {
          return (
            <span key={item.to} className={[base, disabled].join(" ")}>
              {item.label}
            </span>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={withSearch(item.to)}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              [base, isActive ? active : inactive].join(" ")
            }
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}