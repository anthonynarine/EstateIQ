// # Filename: src/auth/AuthProvider.tsx

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { configureAxiosAuth } from "../api/axios";
import { authApi } from "../api/authApi";
import type { RegisterPayload } from "../api/authApi";
import type { Membership, User } from "./types";
import { tokenStorage } from "./tokenStorage";

type AuthContextValue = {
  user: User | null;
  memberships: Membership[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<string>;
  hydrate: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAuthenticated = Boolean(user);

  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    tokenStorage.clearOrgSlug();
    setUser(null);
    setMemberships([]);
    navigate("/login", { replace: true });
  }, [navigate]);

  const refresh = useCallback(async (): Promise<string> => {
    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      throw new Error("No refresh token available.");
    }
    const data = await authApi.refresh(refreshToken);
    tokenStorage.setAccess(data.access);
    return data.access;
  }, []);

  const hydrate = useCallback(async () => {
    // Step 1: If no tokens, treat as logged out
    const access = tokenStorage.getAccess();
    const refreshToken = tokenStorage.getRefresh();

    if (!access || !refreshToken) {
      setIsLoading(false);
      return;
    }

    // Step 2: Fetch /me to hydrate user + memberships
    try {
      const me = await authApi.me();
      setUser(me.user);
      setMemberships(me.memberships);

      // Step 3: Auto-select org if exactly one membership
      if (me.memberships.length === 1) {
        tokenStorage.setOrgSlug(me.memberships[0].org_slug);
      }
    } catch {
      // Step 4: Invalid tokens -> clear + logged out
      tokenStorage.clearTokens();
      tokenStorage.clearOrgSlug();
      setUser(null);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const tokens = await authApi.login(email, password);
        tokenStorage.setTokens(tokens.access, tokens.refresh);

        const me = await authApi.me();
        setUser(me.user);
        setMemberships(me.memberships);

        if (me.memberships.length === 1) {
          tokenStorage.setOrgSlug(me.memberships[0].org_slug);
        } else {
          tokenStorage.clearOrgSlug();
        }

        navigate("/dashboard", { replace: true });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setIsLoading(true);
      try {
        await authApi.register(payload);
        navigate("/login", { replace: true });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  // Step 5: Wire axios refresh/logout hooks once
  useEffect(() => {
    configureAxiosAuth({
      refresh: async () => await refresh(),
      logout: () => logout(),
    });
  }, [refresh, logout]);

  // Step 6: Hydrate on app load
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      memberships,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      refresh,
      hydrate,
    }),
    [user, memberships, isAuthenticated, isLoading, login, register, logout, refresh, hydrate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
