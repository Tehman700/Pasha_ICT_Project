import { Tabs } from "expo-router/js-tabs";
import { TabBar } from "../../components/TabBar";

/**
 * The four tabs a collector lives in.
 *
 * Everything reachable from here that is a *task* rather than a place — the
 * live trip, the schedule editor, an exception — stays on the root Stack
 * instead, so it covers the bar. A trip screen with tabs underneath invites
 * someone to wander off mid-journey while their location is streaming.
 *
 * `collectors` is a folder with its own Stack, so adding or opening a
 * collector keeps the bar visible. That is the right call there: those are
 * navigation within a place, not a task that owns the screen.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "none" }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="qr" />
      <Tabs.Screen name="collectors" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
