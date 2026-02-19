// # Filename: src/app/QueryProvider.tsx


import React, { useState } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

type Props = {
  children: React.ReactNode;
};

function getStatus(error: unknown): number | undefined {
  const anyErr = error as any;
  return anyErr?.response?.status;
}

export default function QueryProvider({ children }: Props) {
  const [queryClient] = useState(() => {
    return new QueryClient({
      queryCache: new QueryCache({
        onError: (error) => {
          // Centralized logging (avoid sensitive data)
          // eslint-disable-next-line no-console
          console.error("ReactQuery query error:", error);
        },
      }),
      mutationCache: new MutationCache({
        onError: (error) => {
          // eslint-disable-next-line no-console
          console.error("ReactQuery mutation error:", error);
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          retry: (failureCount, error) => {
            const status = getStatus(error);

            // Do NOT retry auth/permission/validation failures
            if (status && status >= 400 && status < 500 && status !== 429) return false;

            // Retry network/5xx a couple times
            return failureCount < 2;
          },
        },
        mutations: {
          retry: (failureCount, error) => {
            const status = getStatus(error);

            if (status && status >= 400 && status < 500 && status !== 429) return false;
            return failureCount < 1;
          },
        },
      },
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
