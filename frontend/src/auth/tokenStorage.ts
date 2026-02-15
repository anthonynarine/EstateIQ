// # Filename: src/auth/tokenStorage.ts
// ✅ New Code

const ACCESS_KEY = "estateiq_access_token";
const REFRESH_KEY = "estateiq_refresh_token";
const ORG_KEY = "estateiq_org_slug";

export const tokenStorage = {
  // Step 1: Tokens
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  setTokens(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },

  setAccess(access: string) {
    localStorage.setItem(ACCESS_KEY, access);
  },

  clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  // Step 2: Org selection
  getOrgSlug(): string | null {
    return localStorage.getItem(ORG_KEY);
  },

  setOrgSlug(orgSlug: string) {
    localStorage.setItem(ORG_KEY, orgSlug);
  },

  clearOrgSlug() {
    localStorage.removeItem(ORG_KEY);
  },
};
