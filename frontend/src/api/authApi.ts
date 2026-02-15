// # Filename: src/api/authApi.ts

import { apiClient } from "./axios";
import type { MeResponse } from "../auth/types";

export type RegisterPayload = {
  email: string;
  password: string;
  password2?: string;
  first_name?: string;
  last_name?: string;
};

export type TokenResponse = {
  access: string;
  refresh: string;
};

export const authApi = {
  // Step 1: Register
  async register(payload: RegisterPayload): Promise<void> {
    await apiClient.post("/api/v1/auth/register/", payload);
  },

  // Step 2: Login
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await apiClient.post<TokenResponse>("/api/v1/auth/token/", {
      email,
      password,
    });
    return res.data;
  },

  // Step 3: Refresh
  async refresh(refreshToken: string): Promise<{ access: string }> {
    const res = await apiClient.post<{ access: string }>(
      "/api/v1/auth/token/refresh/",
      { refresh: refreshToken }
    );
    return res.data;
  },

  // Step 4: /me
  async me(): Promise<MeResponse> {
    const res = await apiClient.get<MeResponse>("/api/v1/auth/me/");
    return res.data;
  },
};
