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

/**
 * getInitialAuthState
 *
 * Determines the initial authentication state from persisted tokens.
 *
 * Behavior:
 * - If an access token exists, we enter a "hydrating" state and will call /auth/me/
 *   to restore the user session.
 * - If no access token exists, the user is considered logged out immediately.
 */
const getInitialAuthState = (): AuthState => {
  // Step 1: Decide initial state from persisted access token.
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

/**
 * AuthProvider
 *
 * Production-grade session manager for PortfolioOS.
 *
 * Responsibilities:
 * - Bootstrap an existing session on hard refresh (hydrate via /auth/me/).
 * - Provide login/register/logout actions.
 * - Coordinate with axios interceptors for refresh + forced logout on refresh failure.
 * - Maintain a single source of truth for:
 *   - current user
 *   - memberships (org access)
 *   - hydration state (prevents redirect loops)
 *
 * IMPORTANT:
 * Your backend /api/v1/auth/me/ returns top-level user fields (email, first_name, ...)
 * plus memberships. Some codebases return { user: {...}, memberships: [...] }.
 * This provider supports BOTH shapes via normalization in applyMe().
 */
export default function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>(getInitialAuthState);

  // Step 1: Prevent setState calls after unmount (guards async calls)
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setSafeState = useCallback(
    (updater: AuthState | ((prev: AuthState) => AuthState)) => {
      if (!isMountedRef.current) return;
      setState(updater);
    },
    []
  );

  /**
   * clearAuth
   *
   * Hard-resets client-side auth state:
   * - clears tokens + org slug
   * - removes axios default Authorization header
   * - sets state to logged out
   */
  const clearAuth = useCallback(() => {
    // Step 1: Clear tokens AND org selection to avoid stale tenant scoping
    tokenStorage.clearAll();

    // Step 2: Remove default Authorization header
    delete api.defaults.headers.common.Authorization;

    // Step 3: Reset auth state
    setSafeState({
      user: null,
      memberships: [],
      isAuthenticated: false,
      isHydrating: false,
    });
  }, [setSafeState]);

  /**
   * logout
   *
   * Single logout entrypoint.
   * Kept as a callback so axios can call it via setAxiosLogoutHandler().
   */
  const logout = useCallback(() => {
    // Step 1: Single logout entrypoint
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    // Step 2: Wire logout handler into axios (refresh failure / forbidden handling)
    setAxiosLogoutHandler(logout);
    return () => setAxiosLogoutHandler(null);
  }, [logout]);

  /**
   * applyMe
   *
   * Normalizes the /auth/me/ response into our internal AuthState shape.
   *
   * Supports both server response shapes:
   * 1) { user: {...}, memberships: [...] }
   * 2) { email, first_name, last_name, account_status, memberships: [...] }
   */
  const applyMe = useCallback(
    (me: MeResponse) => {
      // Step 1: Normalize memberships
      const memberships = me.memberships ?? [];

      // Step 2: If user has exactly one org, auto-select it
      if (memberships.length === 1) {
        tokenStorage.setOrgSlug(memberships[0].org_slug);
      }

      // Step 3: Normalize user shape
      // Some backends return { user: {...} }, yours returns top-level fields.
      const meAny = me as unknown as Record<string, unknown>;

      const normalizedUser =
        // Shape #1
        (meAny.user as AuthState["user"]) ??
        // Shape #2
        ({
          // Step 3a: Keep these aligned with your /me response payload
          id: (meAny.id as number | null | undefined) ?? null,
          email: (meAny.email as string | undefined) ?? "",
          first_name: (meAny.first_name as string | undefined) ?? "",
          last_name: (meAny.last_name as string | undefined) ?? "",
          account_status: (meAny.account_status as string | undefined) ?? "active",
        } as AuthState["user"]);

      // Step 4: Commit authenticated state
      setSafeState({
        user: normalizedUser,
        memberships,
        isAuthenticated: true,
        isHydrating: false,
      });
    },
    [setSafeState]
  );

  /**
   * hydrate
   *
   * Bootstraps an existing session on app load.
   * - If an access token exists, calls /auth/me/
   * - Axios interceptor will refresh + retry if access is expired
   * - On unrecoverable failure, clears auth state
   */
  const hydrate = useCallback(async () => {
    // Step 1: Only hydrate if we have an access token
    const access = tokenStorage.getAccess();
    if (!access) return;

    try {
      // Step 2: Set default header for consistency
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

  /**
   * login
   *
   * Exchanges credentials for tokens, persists them, then hydrates user via /me.
   */
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

  /**
   * register
   *
   * Registers a user, then logs them in for a smooth onboarding experience.
   */
   const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      password2: string;
      first_name?: string;
      last_name?: string;
    }) => {
      // Step 1: Forward payload exactly as backend expects
      await authApi.register({
        email: payload.email,
        password: payload.password,
        password2: payload.password2,
        first_name: payload.first_name,
        last_name: payload.last_name,
      });
  
      // Step 2: Do nothing else (no tokens set, no login)
      return true;
    },
    []
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