import { useRef, useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spacer, T } from "./components";
import { colors, radius, spacing } from "./theme";
import { useLocale } from "./providers";

/**
 * The first screen of an install: a swipeable set of cards explaining what the
 * app is for, with sign-in pinned to the bottom.
 *
 * Illustrations rather than photography. A photo of a Pakistani school gate
 * would be stronger, but we do not have one we own the rights to, and stock
 * imagery of the wrong country reads instantly as filler. The illustration set
 * in `illustrations.tsx` is already the visual language of the empty states,
 * so the onboarding introduces nothing the app will not show again.
 *
 * The sign-in button never scrolls. A carousel where the only way forward is
 * to swipe past every card is a carousel people get stuck in — a returning
 * user reinstalling the app should reach the phone field in one tap.
 */

export type OnboardingCard = {
  title: string;
  body: string;
  art: React.ReactNode;
};

export function Onboarding({
  cards,
  onSignIn,
  onRegister,
  onTour,
  registerLabel,
}: {
  cards: OnboardingCard[];
  onSignIn: () => void;
  onRegister?: () => void;
  onTour?: () => void;
  registerLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const { strings } = useLocale();
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView | null>(null);
  const [width, setWidth] = useState(Dimensions.get("window").width - spacing.lg * 2);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (next !== page) setPage(next);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <T variant="titleMd" color={colors.ink}>
          {strings.common.appName}
          <T variant="titleMd" color={colors.primary}>
            .
          </T>
        </T>
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {cards.map((card, i) => (
            <View key={i} style={{ width, justifyContent: "center" }}>
              <View
                style={{
                  backgroundColor: colors.canvasSoft,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  borderRadius: radius.xl,
                  paddingVertical: spacing.xl,
                  alignItems: "center",
                }}
              >
                {card.art}
              </View>

              <Spacer h={spacing.xl} />
              <T variant="displaySm" color={colors.ink} style={{ textAlign: "center" }}>
                {card.title}
              </T>
              <Spacer h={spacing.sm} />
              <T
                variant="bodyMd"
                color={colors.muted}
                style={{ textAlign: "center", paddingHorizontal: spacing.base }}
              >
                {card.body}
              </T>
            </View>
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            paddingVertical: spacing.base,
          }}
        >
          {cards.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === page ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === page ? colors.primary : colors.hairlineStrong,
              }}
            />
          ))}
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.base,
          gap: spacing.sm,
        }}
      >
        {onTour ? (
          <Button label={strings.walkthrough.takeTour} variant="secondary" large full onPress={onTour} />
        ) : null}

        <Button label={strings.auth.signIn} variant="ink" large full onPress={onSignIn} />

        {onRegister ? (
          <Pressable
            onPress={onRegister}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ alignItems: "center", paddingVertical: spacing.xs }}
          >
            <T variant="bodySm" color={colors.body}>
              {registerLabel ?? strings.register.createAccount}
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
