import { useRef } from "react";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProviders, colors, useApi, usePushTokenRotation } from "@pickup/ui-native";

/** Inside the providers, so it can reach the API client. */
function PushTokenWatcher() {
  usePushTokenRotation(useApi());
  return null;
}

/**
 * Screens reachable WITHOUT a token. A 401 fired while a guard is halfway
 * through typing a password is not a dead session — it is a background query
 * failing before anyone has signed in. Redirecting anyway remounts the screen
 * and wipes the form, which reads as "the button does nothing".
 */
const PUBLIC = ["/", "/login"];

/**
 * One app, two roles.
 *
 * Teacher and guard are different screen trees behind the same login, routed
 * by `user.role` from `/users/me`. A guard must never see teacher screens and
 * vice versa — but they share auth, the component kit, and the build pipeline.
 */
export default function RootLayout() {
  // A ref, not the value: `AppProviders` builds the API client once and keeps
  // the callback it was given, so a captured `pathname` would stay frozen at
  // whatever it was on first render.
  const pathname = usePathname();
  const here = useRef(pathname);
  here.current = pathname;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders
          onUnauthorized={() => {
            if (PUBLIC.includes(here.current)) return;
            router.replace("/");
          }}
        >
          <PushTokenWatcher />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
              animation: "slide_from_right",
            }}
          />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
