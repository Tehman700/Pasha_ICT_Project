"use client";

/**
 * API access for the admin surface.
 *
 * This is the single call site the whole skeleton was built around. Every one
 * of the 16 routes calls `useApi()`; none of them knows or cares whether it
 * gets the mock or the real client.
 *
 * Set NEXT_PUBLIC_USE_MOCK_API=true to fall back to fixtures — useful for
 * working on layout with the backend down.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { createHttpApi, mockApi, type PickupApi, type TokenStore } from "@pickup/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

const STORAGE_KEY = "rukhsat.token";

/** Browser-backed token store. Falls back to memory during SSR. */
function browserTokenStore(): TokenStore {
  let memory: string | null = null;
  return {
    get: () => {
      if (typeof window === "undefined") return memory;
      return window.localStorage.getItem(STORAGE_KEY);
    },
    set: (token) => {
      memory = token;
      if (typeof window === "undefined") return;
      if (token) window.localStorage.setItem(STORAGE_KEY, token);
      else window.localStorage.removeItem(STORAGE_KEY);
    },
  };
}

/**
 * Persist a token obtained outside the usual login call.
 *
 * Admin signup returns a token with the created records, so the browser can go
 * straight to the dashboard. `PickupApi` deliberately does not expose its
 * token store — the mock client has none — so this writes to the same key
 * `browserTokenStore` reads from.
 */
export function storeToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, token);
}

/** Forget the session. Callers navigate themselves. */
export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

let client: PickupApi | null = null;

function getClient(): PickupApi {
  if (client) return client;
  client = USE_MOCK
    ? mockApi
    : createHttpApi({
        baseUrl: API_URL,
        tokens: browserTokenStore(),
        onUnauthorized: () => {
          if (typeof window !== "undefined") window.location.href = "/login";
        },
      });
  return client;
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // A 401 or 403 will not resolve by asking again.
            retry: (count, error) => {
              const status = (error as { status?: number })?.status;
              if (status === 401 || status === 403) return false;
              return count < 2;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function useApi(): PickupApi {
  return useMemo(() => getClient(), []);
}

export { API_URL, USE_MOCK };
