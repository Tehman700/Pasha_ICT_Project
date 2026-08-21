import { useRef, useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spacer, T } from "./components";
import { colors, radius, spacing } from "./theme";
import { useLocale } from "./providers";

/**
 * The optional pitch, reached from the welcome screen's "Take a quick tour".
 *
 * This was the entry screen itself until 21 Aug 2026, with sign-in pinned
 * underneath it. Splitting the two matches the flow the user picked: the
 * welcome hero asks for a decision, and this explains the product only to
 * someone who asked to be told.
 *
 * Illustrations rather than photography. A photo of a Pakistani school gate
 * would be stronger, but we do not have one we own the rights to, and stock
 * imagery of the wrong country reads instantly as filler. The illustration set
 * in `illustrations.tsx` is already the visual language of the empty states,
 * so the tour introduces nothing the app will not show again.
 *
 * Skip is always available. A carousel whose only exit is swiping past every
 * card is a carousel people get stuck in.
 */

export type TourCard = {
  title: string;
  body: string;
  art: React.ReactNode;
};

export function Tour({ cards, onDone }: { cards: TourCard[]; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { strings } = useLocale();
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView | null>(null);

  // Measured off the ScrollView itself, never its padded parent. Measuring the
  // parent is what made the React Native carousel overflow its viewport: the
  // page width came out wider than the scroller by exactly the padding, so
  // every card sat a little further right than the last.
  const [width, setWidth] = useState(Dimensions.get("window").width - spacing.lg * 2);

  const last = page >= cards.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (next !== page) setPage(next);
  }

  function advance() {
    if (last) return onDone();
    const next = page + 1;
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
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
        <Pressable onPress={onDone} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <T variant="bodySm" color={colors.body}>
            {strings.walkthrough.skip}
          </T>
        </Pressable>
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
              <T variant="displaySm" color={colors.ink} align="center">
                {card.title}
              </T>
              <Spacer h={spacing.sm} />
              <T
                variant="bodyMd"
                color={colors.muted}
                align="center"
                style={{ paddingHorizontal: spacing.base }}
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

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.base }}>
        <Button
          label={last ? strings.walkthrough.start : strings.walkthrough.next}
          variant="ink"
          large
          full
          onPress={advance}
        />
      </View>
    </View>
  );
}
