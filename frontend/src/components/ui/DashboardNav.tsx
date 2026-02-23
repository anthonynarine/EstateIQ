// ✅ New Code
// # Filename: src/components/ui/DashboardNav.tsx

import { NavLink } from "react-router-dom";

type Props = {
  variant?: "top" | "bottom";
};

type Item = {
  label: string;
  to: string;
};

const NAV_ITEMS: Item[] = [
  { label: "Home", to: "/dashboard" },
  { label: "Tenants", to: "/dashboard/tenants" },
];

export default function DashboardNav({ variant = "top" }: Props) {
  const isBottom = variant === "bottom";

  return (
    <nav
      className={
        isBottom
          ? "flex items-center justify-between gap-2"
          : "flex items-center gap-2"
      }
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/dashboard"}
          className={({ isActive }) => {
            const baseTop = "rounded-lg px-2 py-1 text-sm transition border";
            const baseBottom =
              "flex-1 rounded-xl px-3 py-2 text-center text-sm transition border";

            const base = isBottom ? baseBottom : baseTop;

            const active = isActive
              ? "bg-zinc-900/50 text-zinc-100 border-zinc-800"
              : "text-zinc-300 border-transparent hover:bg-zinc-900/30 hover:text-zinc-100";

            return [base, active].join(" ");
          }}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}