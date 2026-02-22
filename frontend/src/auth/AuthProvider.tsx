// # Filename: src/auth/AuthProvider.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api, { setAxiosLogoutHandler } from "../api/axios";
import { authApi } from "../api/authApi";
import { tokenStorage } from "./tokenStorage";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue, AuthState, MeResponse } from "./types";

type Props = {
  children: React.ReactNode;
};

const getInitialAuthState = (): AuthState => {
  // Step 1: Decide initial state from persisted access token.
  // - If access exists, we need to hydrate /me (isHydrating: true).
  // - If no access exists, we are immediately logged out (isHydrating: false).
  const access = tokenStorage.getAccess();

  if (!access) {
    return {
      user: null,
      memberships: [],
      isAuthenticated: false,
      isHydrating: false,
    };
  }

  return {
    user: null,
    memberships: [],
    isAuthenticated: false,
    isHydrating: true,
  };
};

export default function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>(getInitialAuthState);

  // Step 1: prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setSafeState = useCallback((updater: AuthState | ((prev: AuthState) => AuthState)) => {
    if (!isMountedRef.current) return;
    setState(updater);
  }, []);

  const clearAuth = useCallback(() => {
    // Step 1: Clear tokens AND org selection to avoid stale tenant scoping
    tokenStorage.clearAll();

    // Step 2: Remove default Authorization header (request interceptor also uses tokenStorage)
    delete api.defaults.headers.common.Authorization;

    // Step 3: Reset auth state
    setSafeState({
      user: null,
      memberships: [],
      isAuthenticated: false,
      isHydrating: false,
    });
  }, [setSafeState]);

  const logout = useCallback(() => {
    // Step 1: Single logout entrypoint
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    // Step 2: Wire logout handler into axios (refresh failure / auth-forbidden handling)
    setAxiosLogoutHandler(logout);
    return () => setAxiosLogoutHandler(null);
  }, [logout]);

  const applyMe = useCallback(
    (me: MeResponse) => {
      // Step 1: Normalize memberships
      const memberships = me.memberships ?? [];

      // Step 2: If user has exactly one org, we can auto-select it
      if (memberships.length === 1) {
        tokenStorage.setOrgSlug(memberships[0].org_slug);
      }

      // Step 3: Commit authenticated state
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
    // Step 1: Only hydrate if we are in hydrating state
    const access = tokenStorage.getAccess();
    if (!access) return;

    try {
      // Step 2: Set default header for consistency (interceptor also sets)
      api.defaults.headers.common.Authorization = `Bearer ${access}`;

      // Step 3: Call /me. If access expired, axios should refresh + retry.
      const me = await authApi.me();
      applyMe(me);
    } catch (err) {
      // Step 4: Hydration failure means session is not recoverable client-side
      clearAuth();
    }
  }, [applyMe, clearAuth]);

  useEffect(() => {
    // Step 1: Kick off hydration only when needed
    if (!state.isHydrating) return;
    void hydrate();
  }, [hydrate, state.isHydrating]);

  const login = useCallback(
    async (email: string, password: string) => {
      // Step 1: Exchange credentials for tokens
      const tokens = await authApi.login({ email, password });

      // Step 2: Persist tokens
      tokenStorage.setTokens(tokens.access, tokens.refresh);

      // Step 3: Set default header
      api.defaults.headers.common.Authorization = `Bearer ${tokens.access}`;

      // Step 4: Load /me to populate user + memberships
      const me = await authApi.me();
      applyMe(me);

      return me;
    },
    [applyMe]
  );

  const register = useCallback(
    async (payload: { email: string; password: string; first_name?: string; last_name?: string }) => {
      // Step 1: Register user
      await authApi.register(payload);

      // Step 2: Auto-login for smooth onboarding
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