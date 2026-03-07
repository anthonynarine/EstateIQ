// # Filename: src/features/tenants/components/directory/TenantDirectoryGrid.tsx

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * TenantDirectoryGrid
 *
 * Responsive grid wrapper for tenant directory cards.
 *
 * Responsibilities:
 * - Provide a mobile-first card grid layout.
 * - Centralize responsive column behavior for the directory.
 *
 * Important:
 * - This component is layout-only.
 * - It should not know anything about loading, empty, or card internals.
 */
export default function TenantDirectoryGrid({ children }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}