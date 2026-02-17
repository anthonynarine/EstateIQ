// # Filename: src/auth/AuthProvider.tsx
// ✅ New Code
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { authApi } from "../api/authApi";
import api, { setAxiosLogoutHandler } from "../api/axios";
import { tokenStorage } from "./tokenStorage";
import type { AuthContextValue, AuthState, MeResponse } from "./types";

/**
 * AuthProvider
 *
 * Owns authenticated identity state:
 *  - login/register/logout
 *  - hydrate on boot via /api/v1/auth/me/
 *  - wires logout hook into axios interceptor
 *
 * Tenant scoping:
 *  - Org boundary is enforced by X-Org-Slug on domain endpoints.
 *  - /auth/me is identity-only (safe: returns user's memberships).
 */

export const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  user: null,
  memberships: [],
  isAuthenticated: false,
  isHydrating: true,
};

type Props = {
  children: React.ReactNode;
};

export default function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>(initialState);

  // Step 1: prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setSafeState = useCallback((next: AuthState) => {
    if (!isMountedRef.current) return;
    setState(next);
  }, []);

  const clearAuth = useCallback(() => {
    tokenStorage.clearTokens();
    delete api.defaults.headers.common.Authorization;

    setSafeState({
      user: null,
      memberships: [],
      isAuthenticated: false,
      isHydrating: false,
    });
  }, [setSafeState]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // Step 2: allow axios interceptor to force logout (refresh failure, 403, etc.)
  useEffect(() => {
    setAxiosLogoutHandler(() => logout);
    return () => setAxiosLogoutHandler(null);
  }, [logout]);

  const applyMe = useCallback(
    (me: MeResponse) => {
      // Step 1: persist memberships + auth state
      const memberships = me.memberships ?? [];

      // Step 2: Optional: if only 1 org, auto-select it
      if (memberships.length === 1) {
        tokenStorage.setOrgSlug(memberships[0].org_slug);
      }

      setSafeState({
        user: me.user,
        memberships,
        isAuthenticated: true,
        isHydrating: false,
      });
    },
    [setSafeState]
  );

  const hydrate = useCallback(async () => {
    try {
      // Step 1: if no access token, finish hydration logged-out
      const access = tokenStorage.getAccess();
      if (!access) {
        setSafeState({ ...initialState, isHydrating: false });
        return;
      }

      // Step 2: set default header (request interceptor also sets it)
      api.defaults.headers.common.Authorization = `Bearer ${access}`;

      // Step 3: load identity (axios will refresh access if expired)
      const me = await authApi.me();
      applyMe(me);
    } catch (err) {
      clearAuth();
    }
  }, [applyMe, clearAuth, setSafeState]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = useCallback(
    async (email: string, password: string) => {
      // Step 1: get tokens (IMPORTANT: payload must be { email, password })
      const tokens = await authApi.login({ email, password });

      // Step 2: store tokens
      tokenStorage.setTokens(tokens.access, tokens.refresh);

      // Step 3: set default header
      api.defaults.headers.common.Authorization = `Bearer ${tokens.access}`;

      // Step 4: fetch /me
      const me = await authApi.me();
      applyMe(me);

      return me;
    },
    [applyMe]
  );

  const register = useCallback(
    async (payload: { email: string; password: string; first_name?: string; last_name?: string }) => {
      // Step 1: register
      await authApi.register(payload);

      // Step 2: auto-login for smoother UX
      return await login(payload.email, payload.password);
    },
    [login]
  );

  const value: AuthContextValue = useMemo(
    () => ({
      user: state.user,
      memberships: state.memberships,
      isAuthenticated: state.isAuthenticated,
      isHydrating: state.isHydrating,
      login,
      register,
      logout,
      hydrate,
    }),
    [state, login, register, logout, hydrate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
