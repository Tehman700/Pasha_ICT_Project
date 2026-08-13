import { Stack } from "expo-router";
import { colors } from "@pickup/ui-native";

/**
 * The People tab's own stack, so adding or opening a collector keeps the tab
 * bar visible — these are moves within a place, not tasks that own the screen.
 */
export default function CollectorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: "slide_from_right",
      }}
    />
  );
}
