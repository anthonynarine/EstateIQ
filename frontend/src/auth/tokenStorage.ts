// # Filename: src/auth/tokenStorage.ts


/**
 * Token + org storage utilities (frontend).
 *
 * Security posture (MVP-safe):
 * - Access token: localStorage (persist across refresh)
 * - Refresh token: sessionStorage (reduces persistence risk vs localStorage)
 *
 * Production posture (recommended later):
 * - Refresh token should move to an HttpOnly Secure cookie (set by backend),
 *   and this module would stop storing refresh tokens entirely.
 */

 const ACCESS_KEY = "estateiq_access_token";
 const REFRESH_KEY = "estateiq_refresh_token";
 const ORG_KEY = "estateiq_org_slug";
 
 export const tokenStorage = {
   // Step 1: Access token helpers
   getAccess(): string | null {
     return localStorage.getItem(ACCESS_KEY);
   },
 
   setAccess(access: string): void {
     localStorage.setItem(ACCESS_KEY, access);
   },
 
   clearAccess(): void {
     localStorage.removeItem(ACCESS_KEY);
   },
 
   // Step 2: Refresh token helpers (session-scoped)
   getRefresh(): string | null {
     return sessionStorage.getItem(REFRESH_KEY);
   },
 
   setRefresh(refresh: string): void {
     sessionStorage.setItem(REFRESH_KEY, refresh);
   },
 
   clearRefresh(): void {
     sessionStorage.removeItem(REFRESH_KEY);
   },
 
   // Step 3: Set/clear both tokens together
   setTokens(access: string, refresh: string): void {
     localStorage.setItem(ACCESS_KEY, access);
     sessionStorage.setItem(REFRESH_KEY, refresh);
   },
 
   clearTokens(): void {
     localStorage.removeItem(ACCESS_KEY);
     sessionStorage.removeItem(REFRESH_KEY);
   },
 
   // Step 4: Org selection helpers
   getOrgSlug(): string | null {
     return localStorage.getItem(ORG_KEY);
   },
 
   setOrgSlug(orgSlug: string): void {
     localStorage.setItem(ORG_KEY, orgSlug);
   },
 
   clearOrgSlug(): void {
     localStorage.removeItem(ORG_KEY);
   },
 
   // Step 5: One-call logout cleanup
   clearAll(): void {
     localStorage.removeItem(ACCESS_KEY);
     sessionStorage.removeItem(REFRESH_KEY);
     localStorage.removeItem(ORG_KEY);
   },
 };
 