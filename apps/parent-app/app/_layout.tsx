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
 * Screens reachable WITHOUT a token. A 401 fired while the user is standing on
 * one of these is not a dead session — it is the home screen's queries failing
 * in the background before anyone has signed in. Redirecting anyway remounts
 * the screen and wipes whatever the user was halfway through typing, which
 * reads as "the button does nothing".
 */
const PUBLIC = ["/welcome", "/login", "/register"];

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
            if (PUBLIC.some((p) => here.current.startsWith(p))) return;
            // The carousel, not the phone field. A cold launch with no token
            // should explain what the app is before asking for anything.
            router.replace("/welcome");
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
