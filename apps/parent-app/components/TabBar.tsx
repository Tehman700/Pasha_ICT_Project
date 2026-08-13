import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Icon, T, colors, spacing, useLocale, type IconName } from "@pickup/ui-native";

/**
 * The bottom bar.
 *
 * Written rather than configured because react-navigation's default bar brings
 * its own visual language — a translucent blur, a platform tint, and an
 * elevation shadow on Android. design.md's depth model is a single hairline,
 * so the default would be the only shadowed surface in either app.
 *
 * Labels are always visible. Icon-only bars test well with people who already
 * know the app and badly with everyone else, and half this audience is
 * installing their first school app. The Urdu labels are also why: اردو at
 * caption size under an icon is legible, as a tooltip it does not exist.
 */

const TABS: { name: string; icon: IconName; label: (s: Strings) => string }[] = [
  { name: "index", icon: "clock", label: (s) => s.parent.tabToday },
  { name: "qr", icon: "qr", label: (s) => s.parent.tabCode },
  { name: "collectors", icon: "people", label: (s) => s.parent.tabPeople },
  { name: "profile", icon: "user", label: (s) => s.parent.tabProfile },
];

type Strings = ReturnType<typeof useLocale>["strings"];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { strings } = useLocale();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceCard,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
        paddingTop: spacing.xs,
        paddingBottom: insets.bottom + spacing.xs,
      }}
    >
      {state.routes.map((route, i) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;

        const focused = state.index === i;

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              // Respect preventDefault, and re-tapping the active tab should
              // pop that tab's stack rather than push another copy of it.
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}
          >
            <Icon
              name={tab.icon}
              size={22}
              color={focused ? colors.primary : colors.mutedSoft}
            />
            <T variant="caption" color={focused ? colors.ink : colors.mutedSoft}>
              {tab.label(strings)}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
