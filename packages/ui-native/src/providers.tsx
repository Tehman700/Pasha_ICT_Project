import { createContext, useContext, useMemo, useState } from "react";
import { I18nManager } from "react-native";
import * as SecureStore from "expo-secure-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createHttpApi,
  dir,
  mockApi,
  t,
  type Locale,
  type PickupApi,
  type Strings,
  type TokenStore,
} from "@pickup/shared";

/**
 * Locale and API providers, shared by both mobile apps.
 *
 * NOTE on RTL: `I18nManager.forceRTL` needs a full reload to take effect on a
 * real device — RN cannot flip layout direction live. The apps mirror what
 * they can via `writingDirection` and explicit row direction, and expose
 * `isRTL` so screens can branch. A production build should set the direction
 * at launch from the stored preference, before the first render.
 */

const TOKEN_KEY = "rukhsat.token";

/**
 * Token storage backed by the device keychain / keystore.
 *
 * Not AsyncStorage: this token authorises collecting a child, and on a rooted
 * or shared phone AsyncStorage is a plaintext file. SecureStore is available
 * in Expo Go, so this costs nothing.
 *
 * Falls back to memory if the keychain is unavailable — a collector standing
 * at the gate should not be locked out because storage failed. They simply
 * have to log in again next launch.
 */
function secureTokenStore(): TokenStore {
  let memory: string | null = null;
  return {
    get: async () => {
      try {
        return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? memory;
      } catch {
        return memory;
      }
    },
    set: async (token) => {
      memory = token;
      try {
        if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
        else await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch {
        /* keep the in-memory copy so this session still works */
      }
    },
  };
}

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
 * On a physical phone `localhost` is the PHONE, not your laptop. Use the
 * production URL or your machine's LAN address.
 */
/**
 * One token store for the whole app, created once at module scope.
 *
 * It has to be a singleton so `signOut` below can clear the *same* store the
 * API client reads from — including its in-memory fallback. Creating a fresh
 * store per call would clear a copy and leave the live one holding the token,
 * which is how "sign out" ends up looking like it worked until the next
 * launch.
 */
const tokenStore = secureTokenStore();

/**
 * Clear the session. Both apps call this from their sign-out button.
 *
 * Navigation is the caller's job — this only forgets the credential. Before
 * this existed, sign-out merely navigated to /login and left the token in the
 * keychain, so relaunching the app walked straight back in.
 */
export async function signOut(): Promise<void> {
  await tokenStore.set(null);
}

function resolveApi(onUnauthorized?: () => void): PickupApi {
  const url = process.env.EXPO_PUBLIC_API_URL;
  const forceMock = process.env.EXPO_PUBLIC_USE_MOCK_API === "true";
  if (!url || forceMock) return mockApi;
  return createHttpApi({ baseUrl: url, tokens: tokenStore, onUnauthorized });
}

export function AppProviders({
  children,
  api,
  onUnauthorized,
}: {
  children: React.ReactNode;
  api?: PickupApi;
  /**
   * Called when the server rejects the stored token — normally because it
   * expired, since tokens last 24h and the keychain keeps them across
   * launches. Each app passes its own login route.
   *
   * Without this the app clears the dead token and then simply stays where
   * it was, with every screen failing and no route back to a login form. A
   * collector standing at the gate would have to know to hunt for Sign out
   * in the profile tab.
   */
  onUnauthorized?: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("en");

  // Built once, holding the callback. `api` still wins so tests and the
  // storybook-ish screens can inject a fake.
  const [resolved] = useState(() => resolveApi(onUnauthorized));
  const activeApi = api ?? resolved;

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
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
      <ApiContext.Provider value={activeApi}>
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

/** True when the apps are running against fixtures rather than the backend. */
export const USING_MOCK =
  !process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_USE_MOCK_API === "true";
