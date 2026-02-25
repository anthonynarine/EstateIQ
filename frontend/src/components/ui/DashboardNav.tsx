
// # Filename: src/components/ui/DashboardNav.tsx

import { NavLink, useLocation } from "react-router-dom";
import  {useOrg } from "../../features/tenancy/hooks/useOrg";

type Props = {
  variant?: "top" | "bottom";
};

type Item = {
  label: string;
  to: string;
  requiresOrg?: boolean;
};

const NAV_ITEMS: Item[] = [
  { label: "Home", to: "/dashboard" },
  { label: "Tenants", to: "/dashboard/tenants", requiresOrg: true },
  { label: "Buildings", to: "/dashboard/buildings", requiresOrg: true },
];

export default function DashboardNav({ variant = "top" }: Props) {
  const isBottom = variant === "bottom";
  const location = useLocation();
  const { orgSlug } = useOrg();

  // Step 1: Preserve ?org=... when navigating
  const withSearch = (path: string) => `${path}${location.search}`;

  const baseTop = "rounded-lg px-2 py-1 text-sm transition border";
  const baseBottom = "flex-1 rounded-xl px-3 py-2 text-center text-sm transition border";
  const base = isBottom ? baseBottom : baseTop;

  const active = "bg-zinc-900/50 text-zinc-100 border-zinc-800";
  const inactive = "text-zinc-300 border-transparent hover:bg-zinc-900/30 hover:text-zinc-100";
  const disabled = "text-zinc-600 border-transparent bg-zinc-950/40 cursor-not-allowed";

  return (
    <nav className={isBottom ? "flex items-center justify-between gap-2" : "flex items-center gap-2"}>
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
            className={({ isActive }) => [base, isActive ? active : inactive].join(" ")}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}