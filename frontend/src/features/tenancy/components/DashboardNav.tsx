// # Filename: src/components/DashboardNav.tsx
import { Link, useLocation } from "react-router-dom";

type NavItem = {
  label: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/dashboard" },
  { label: "Tenants", to: "/dashboard/tenants" },
];

/**
 * DashboardNav
 *
 * Small reusable navigation for dashboard routes.
 * Keeps layout components lean and prevents hard-coded links spread across pages.
 */
export default function DashboardNav() {
  const location = useLocation();

  return (
    <nav className="flex items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive =
          location.pathname === item.to ||
          (item.to !== "/dashboard" && location.pathname.startsWith(item.to));

        return (
          <Link
            key={item.to}
            to={item.to}
            className={[
              "rounded-lg px-2 py-1 text-sm transition",
              isActive
                ? "bg-zinc-900/50 text-zinc-100 border border-zinc-800"
                : "text-zinc-300 hover:bg-zinc-900/30 hover:text-zinc-100",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
