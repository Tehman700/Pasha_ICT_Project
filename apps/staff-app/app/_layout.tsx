import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProviders, colors } from "@pickup/ui-native";

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
        <AppProviders>
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
