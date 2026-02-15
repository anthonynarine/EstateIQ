// # Filename: src/api/axios.ts

import axios from "axios";
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

import { tokenStorage } from "../auth/tokenStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

type RefreshFn = () => Promise<string>; // returns new access token
type LogoutFn = () => void;

let refreshFn: RefreshFn | null = null;
let logoutFn: LogoutFn | null = null;

// Step 1: Single-flight refresh control (prevents refresh storms)
let isRefreshing = false;
let refreshWaitQueue: Array<(token: string | null) => void> = [];

function enqueueWaiter(cb: (token: string | null) => void) {
  refreshWaitQueue.push(cb);
}

function flushWaiters(token: string | null) {
  refreshWaitQueue.forEach((cb) => cb(token));
  refreshWaitQueue = [];
}

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  // Normalize any baseURL differences
  const path = url.startsWith("http") ? new URL(url).pathname : url;

  // Step 2: These endpoints must NEVER require org header and must not cause refresh loops
  return (
    path.endsWith("/api/v1/auth/token/") ||
    path.endsWith("/api/v1/auth/token/refresh/") ||
    path.endsWith("/api/v1/auth/register/") ||
    path.endsWith("/api/v1/auth/me/")
  );
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Step 3: AuthProvider registers refresh/logout hooks here
export function configureAxiosAuth(opts: { refresh: RefreshFn; logout: LogoutFn }) {
  refreshFn = opts.refresh;
  logoutFn = opts.logout;
}

// Step 4: Request interceptor -> attach Authorization + X-Org-Slug (when selected)
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const access = tokenStorage.getAccess();
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }

    // Step 5: Attach org slug ONLY if selected; /auth/me/ must still work without it
    const orgSlug = tokenStorage.getOrgSlug();
    if (orgSlug) {
      config.headers["X-Org-Slug"] = orgSlug;
    }

    return config;
  }
);

// Step 6: Response interceptor -> on 401 refresh once -> retry -> logout on failure
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest =
      error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;

    // Step 7: Never attempt refresh logic for "public auth endpoints" (prevents loops)
    if (isPublicAuthRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshFn || !logoutFn) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Step 8: Wait for in-flight refresh, then retry
        const token = await new Promise<string | null>((resolve) => enqueueWaiter(resolve));
        if (!token) {
          logoutFn();
          return Promise.reject(error);
        }

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }

      // Step 9: Perform refresh
      isRefreshing = true;
      try {
        const newAccess = await refreshFn();
        tokenStorage.setAccess(newAccess);
        flushWaiters(newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        flushWaiters(null);
        logoutFn();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
