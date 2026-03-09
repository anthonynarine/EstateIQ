// # Filename: src/features/leases/forms/TenantSection/useTenantModeActions.ts


import { useCallback } from "react";
import type { TenantMode } from "./tenantTypes";

type Props = {
  enterCreateTenantMode: () => void;
  enterSelectTenantMode: () => void;
};

/**
 * useTenantModeActions
 *
 * Keeps tenant mode transitions explicit and out of the parent form.
 *
 * Responsibilities:
 * - Route "create" mode into create-tenant workflow state
 * - Route "select" mode into existing-tenant workflow state
 *
 * This keeps CreateLeaseForm.tsx smaller and easier to read.
 */
export function useTenantModeActions({
  enterCreateTenantMode,
  enterSelectTenantMode,
}: Props) {
  const handleTenantModeChange = useCallback(
    (mode: TenantMode) => {
      // Step 1: Route tenant workflow by explicit mode
      if (mode === "create") {
        enterCreateTenantMode();
        return;
      }

      enterSelectTenantMode();
    },
    [enterCreateTenantMode, enterSelectTenantMode],
  );

  return {
    handleTenantModeChange,
  };
}