// # Filename: src/auth/authApi.ts

import api from "../api/axios";
import type { MeResponse, RegisterPayload, TokenPair } from "./types";

/**
 * authApi.ts
 *
 * Auth API wrapper for PortfolioOS / EstateIQ.
 *
 * Endpoints (Django + SimpleJWT):
 *  - POST /api/v1/auth/register/
 *  - POST /api/v1/auth/token/
 *  - POST /api/v1/auth/token/refresh/
 *  - GET  /api/v1/auth/me/
 *
 * Notes:
 *  - Token refresh is handled automatically by axios interceptor (src/api/axios.ts)
 *    for authenticated endpoints (including /me/).
 *  - This module is intentionally thin: it just calls endpoints and returns typed data.
 */

// Step 1: Payload + response types
export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterResponse = {
  id: number | string;
  email: string;
};

// Step 2: API functions
export const authApi = {
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    // Step 1: Create a new user (no org membership created here)
    const res = await api.post<RegisterResponse>("/api/v1/auth/register/", payload);
    return res.data;
  },

  async login(payload: LoginPayload): Promise<TokenPair> {
    // Step 1: Get access + refresh tokens
    // SimpleJWT expects: { email, password } because USERNAME_FIELD=email
    const res = await api.post<TokenPair>("/api/v1/auth/token/", payload);
    return res.data;
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    // Step 1: Refresh access token (and possibly rotate refresh, depending on backend)
    const res = await api.post<TokenPair>("/api/v1/auth/token/refresh/", {
      refresh: refreshToken,
    });
    return res.data;
  },

  async me(): Promise<MeResponse> {
    // Step 1: Fetch identity + memberships
    // IMPORTANT: /me/ is authenticated and should be allowed to trigger refresh.
    const res = await api.get<MeResponse>("/api/v1/auth/me/");
    return res.data;
  },
};

export default authApi;
