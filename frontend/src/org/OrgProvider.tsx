// # Filename: src/org/OrgProvider.tsx

import React, { createContext, useCallback, useMemo, useState } from "react";
import { tokenStorage } from "../auth/tokenStorage";

type OrgContextValue = {
  orgSlug: string | null;
  setOrgSlug: (slug: string) => void;
  clearOrgSlug: () => void;
};

export const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgSlug, setOrgSlugState] = useState<string | null>(() => tokenStorage.getOrgSlug());

  const setOrgSlug = useCallback((slug: string) => {
    tokenStorage.setOrgSlug(slug);
    setOrgSlugState(slug);
  }, []);

  const clearOrgSlug = useCallback(() => {
    tokenStorage.clearOrgSlug();
    setOrgSlugState(null);
  }, []);

  const value = useMemo(
    () => ({ orgSlug, setOrgSlug, clearOrgSlug }),
    [orgSlug, setOrgSlug, clearOrgSlug]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
