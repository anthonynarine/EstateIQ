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
 * Keeps tenant mode workflow transitions explicit and isolated from the
 * parent lease form component.
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