import { createContext, useContext, useMemo, useState } from "react";
import { I18nManager } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createHttpApi,
  dir,
  mockApi,
  t,
  type Locale,
  type PickupApi,
  type Strings,
} from "@pickup/shared";

/**
 * Locale + API providers, shared by both mobile apps.
 *
 * NOTE on RTL: `I18nManager.forceRTL` requires a full app reload to take
 * effect on a real device — RN cannot flip layout direction live. The
 * skeleton mirrors what it can via `writingDirection` and `textAlign`, and
 * `isRTL` is exposed so screens can pick row direction explicitly. A
 * production build should set the direction at launch from the stored
 * preference, before the first render.
 */

type LocaleValue = {
  locale: Locale;
  strings: Strings;
  isRTL: boolean;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleValue | null>(null);
const ApiContext = createContext<PickupApi>(mockApi);

/**
 * Resolve the API client once.
 *
 * EXPO_PUBLIC_API_URL points at the live backend. When it is absent — or when
 * EXPO_PUBLIC_USE_MOCK_API is "true" — the apps fall back to fixtures, so the
 * UI is still workable with no network and no backend running.
 *
 * On a physical phone, localhost is the PHONE, not your laptop. Set
 * EXPO_PUBLIC_API_URL to the production URL or your machine's LAN address.
 */
function resolveApi(): PickupApi {
  const url = process.env.EXPO_PUBLIC_API_URL;
  const forceMock = process.env.EXPO_PUBLIC_USE_MOCK_API === "true";
  if (!url || forceMock) return mockApi;
  return createHttpApi({ baseUrl: url });
}

const defaultApi = resolveApi();

export function AppProviders({
  children,
  api = defaultApi,
}: {
  children: React.ReactNode;
  api?: PickupApi;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: false } },
      }),
  );

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      strings: t(locale),
      isRTL: dir(locale) === "rtl",
      toggle: () => {
        setLocale((prev) => {
          const next = prev === "en" ? "ur" : "en";
          I18nManager.allowRTL(next === "ur");
          return next;
        });
      },
    }),
    [locale],
  );

  return (
    <QueryClientProvider client={client}>
      <ApiContext.Provider value={api}>
        <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
      </ApiContext.Provider>
    </QueryClientProvider>
  );
}

export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <AppProviders>");
  return ctx;
}

export function useApi(): PickupApi {
  return useContext(ApiContext);
}
