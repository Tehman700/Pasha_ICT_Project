import { Stack, router } from "expo-router";
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
 * One app, two roles.
 *
 * Teacher and guard are different screen trees behind the same login, routed
 * by `user.role` from `/users/me`. A guard must never see teacher screens and
 * vice versa — but they share auth, the component kit, and the build pipeline.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders onUnauthorized={() => router.replace("/")}>
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
