"use client";

/**
 * API access for the admin surface.
 *
 * Every screen calls `useApi()` and gets a `PickupApi`. Today that is
 * `mockApi` returning fixtures; module M1.4b swaps in the HTTP client behind
 * the identical interface. No screen changes when that happens — which is the
 * entire point of building the skeleton against a typed contract rather than
 * inlining sample data per page.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { mockApi, type PickupApi } from "@pickup/shared";

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function useApi(): PickupApi {
  return mockApi;
}
