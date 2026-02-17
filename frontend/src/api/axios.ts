// # Filename: src/api/axios.ts


import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import { tokenStorage } from "../auth/tokenStorage";

/**
 * axios.ts
 *
 * Centralized Axios client with:
 *  - Authorization header injection (Bearer access token)
 *  - Multi-tenant header injection (X-Org-Slug)
 *  - Single-flight refresh token flow (prevents refresh storms)
 *  - Automatic request retry after successful refresh
 *
 * Security notes:
 *  - Never logs tokens
 *  - Refresh endpoint is called via a "raw" client to avoid interceptor recursion
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

// Step 1: Primary API client (uses interceptors)
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Step 2: Raw client (NO interceptors) used ONLY for refresh to avoid recursion
const raw: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Step 3: Optional logout hook (AuthProvider can set this)
let logoutFn: (() => void) | null = null;

export function setAxiosLogoutHandler(fn: (() => void) | null) {
  // Step 1: Allow AuthProvider to register logout behavior
  logoutFn = fn;
}

type RefreshResponse = {
  access: string;
  refresh?: string;
};

// Step 4: Single-flight refresh state
let isRefreshing = false;

type RefreshQueueItem = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let refreshQueue: RefreshQueueItem[] = [];

function flushRefreshQueue(error: unknown | null, newAccessToken: string | null) {
  // Step 1: Resolve/reject all queued requests
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !newAccessToken) reject(error);
    else resolve(newAccessToken);
  });

  // Step 2: Clear queue
  refreshQueue = [];
}

function isPublicAuthRequest(url?: string) {
  // Step 1: Identify endpoints that must NOT attempt refresh
  // IMPORTANT:
  //   /me/ is NOT public; it should refresh when access expires.
  if (!url) return false;

  const path = url.startsWith("http") ? new URL(url).pathname : url;

  return (
    path.endsWith("/api/v1/auth/token/") ||
    path.endsWith("/api/v1/auth/token/refresh/") ||
    path.endsWith("/api/v1/auth/register/")
  );
}

async function refreshAccessToken(): Promise<string> {
  // Step 1: Read refresh token
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    throw new Error("Missing refresh token.");
  }

  // Step 2: Call refresh endpoint using raw client (no interceptors)
  const res = await raw.post<RefreshResponse>("/api/v1/auth/token/refresh/", { refresh });

  // Step 3: Persist tokens (SimpleJWT may rotate refresh depending on config)
  const newAccess = res.data.access;
  const newRefresh = res.data.refresh;

  if (newRefresh) {
    tokenStorage.setTokens(newAccess, newRefresh);
  } else {
    tokenStorage.setAccess(newAccess);
  }

  return newAccess;
}

// Step 5: Request interceptor (auth + org headers)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Step 1: Attach Authorization token if present
    const access = tokenStorage.getAccess();
    if (access) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${access}`;
    }

    // Step 2: Attach tenant header if present
    // Only include this if we have a selected org.
    const orgSlug = tokenStorage.getOrgSlug();
    if (orgSlug) {
      config.headers = config.headers ?? {};
      config.headers["X-Org-Slug"] = orgSlug;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Step 6: Response interceptor (refresh on 401, single-flight)
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    // Step 1: If no response object, this is likely network/timeout
    const status = error.response?.status;
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Step 2: Optional: treat suspension as forced logout (backend returns 403)
    if (status === 403) {
      if (logoutFn) logoutFn();
      return Promise.reject(error);
    }

    // Step 3: Only handle 401 here
    if (status !== 401) {
      return Promise.reject(error);
    }

    // Step 4: Avoid refresh loops for token/refresh/register endpoints
    if (isPublicAuthRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Step 5: Avoid infinite retry loops
    if (originalRequest._retry) {
      if (logoutFn) logoutFn();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // Step 6: If refresh is already happening, queue this request
    if (isRefreshing) {
      try {
        const newAccess = await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });

        // Step 7: Retry original request with new access token
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (err) {
        if (logoutFn) logoutFn();
        return Promise.reject(err);
      }
    }

    // Step 8: Start refresh flow
    isRefreshing = true;

    try {
      const newAccess = await refreshAccessToken();

      // Step 9: Release queued requests
      flushRefreshQueue(null, newAccess);

      // Step 10: Retry original request
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (err) {
      // Step 11: Refresh failed → clear tokens + logout
      flushRefreshQueue(err, null);
      tokenStorage.clearTokens();
      if (logoutFn) logoutFn();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
