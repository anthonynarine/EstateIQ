// # Filename: src/app/RootProviders.tsx


import React from "react";
import { Outlet } from "react-router-dom";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import AuthProvider from "../auth/AuthProvider";
import { OrgProvider } from "../org/OrgProvider";

/**
 * RootProviders
 *
 * Wraps the app with global providers in the correct order:
 * - TanStack Query: server-state cache + request lifecycle (loading/error/retry/caching)
 * - AuthProvider: authentication context (tokens, current user)
 * - OrgProvider: multi-tenant org context (X-Org-Slug selection)
 *
 * Uses a module-level QueryClient singleton to avoid cache resets on re-render.
 * In dev, also keeps the QueryClient stable across HMR by storing it on globalThis.
 */
declare global {
  // Step 1: Preserve QueryClient across HMR in dev without leaking to production builds
  // eslint-disable-next-line no-var
  var __ESTATEIQ_QUERY_CLIENT__: QueryClient | undefined;
}

const IS_PROD = import.meta.env.PROD;
const IS_DEV = import.meta.env.DEV;

function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error: any, query) => {
        // Step 2: Centralized query error logging (minimal, avoids sensitive payloads)
        const status = error?.response?.status;
        const key = query?.queryKey ? JSON.stringify(query.queryKey) : "unknown";
        // eslint-disable-next-line no-console
        console.warn("[QueryError]", { status, key });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: any, _variables, _context, mutation) => {
        // Step 3: Centralized mutation error logging
        const status = error?.response?.status;
        const key = mutation?.options?.mutationKey
          ? JSON.stringify(mutation.options.mutationKey)
          : "unknown";
        // eslint-disable-next-line no-console
        console.warn("[MutationError]", { status, key });
      },
    }),
    defaultOptions: {
      queries: {
        // Step 4: Dashboard-friendly defaults
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Step 5: Never retry auth/permission errors
          const status = error?.response?.status;
          if (status === 401 || status === 403) return false;

          // Step 6: Small retry budget for flaky networks
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Step 7: Stable singleton across renders + dev HMR
const queryClient: QueryClient =
  (IS_DEV ? globalThis.__ESTATEIQ_QUERY_CLIENT__ : undefined) ?? createQueryClient();

if (IS_DEV) {
  globalThis.__ESTATEIQ_QUERY_CLIENT__ = queryClient;
}

export default function RootProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrgProvider>
          <Outlet />
        </OrgProvider>
      </AuthProvider>

      {!IS_PROD ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
