import { useCallback, useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { MotiView } from "moti";
import * as SecureStore from "expo-secure-store";
import { Button, Row, Spacer, T } from "./components";
import { colors, motion, radius, spacing } from "./theme";
import { useLocale } from "./providers";

/**
 * First-run walkthrough for the mobile apps.
 *
 * Full-screen cards rather than coach marks pinned to real controls. On the
 * web the tour points at live DOM nodes because it can measure them cheaply
 * and they hold still; on a phone the same approach needs `measureInWindow`
 * on every target, re-measures on scroll and rotation, and still breaks when
 * a list is one row shorter than expected. A sequence of cards cannot drift
 * out of alignment with the screen behind it, because it is not aligned to it.
 *
 * Shown once per role, then reachable again from the profile / header. The
 * flag is per-role, not per-app: a phone used by a guard and later a teacher
 * should introduce the teacher screens too.
 */

export type WalkthroughStep = {
  title: string;
  body: string;
  art: React.ReactNode;
};

const KEY_PREFIX = "rukhsat.walkthrough.";

export async function hasSeenWalkthrough(role: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY_PREFIX + role)) === "1";
  } catch {
    // A locked keychain must not block the app; worst case the walkthrough
    // shows twice, which is far better than a first-run crash.
    return true;
  }
}

export async function markWalkthroughSeen(role: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_PREFIX + role, "1");
  } catch {
    /* ignore */
  }
}

export async function resetWalkthrough(role: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY_PREFIX + role);
  } catch {
    /* ignore */
  }
}

export function Walkthrough({
  visible,
  steps,
  onDone,
}: {
  visible: boolean;
  steps: WalkthroughStep[];
  onDone: () => void;
}) {
  const { strings } = useLocale();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const next = useCallback(() => {
    if (index >= steps.length - 1) onDone();
    else setIndex((i) => i + 1);
  }, [index, steps.length, onDone]);

  if (!visible || steps.length === 0) return null;
  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.canvas,
          padding: spacing.lg,
          justifyContent: "center",
        }}
      >
        {/* Keyed on index so each step re-runs the entrance rather than
            cross-fading into the previous one's final position. */}
        <MotiView
          key={index}
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: motion.duration.base * 1000 }}
          style={{ alignItems: "center" }}
        >
          <View
            style={{
              backgroundColor: colors.surfaceCard,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.hairline,
              padding: spacing.lg,
              alignItems: "center",
              alignSelf: "stretch",
            }}
          >
            {step.art}
            <Spacer h={spacing.lg} />
            <T variant="displaySm" color={colors.ink} align="center">
              {step.title}
            </T>
            <Spacer h={spacing.sm} />
            <T variant="bodyMd" color={colors.muted} align="center">
              {step.body}
            </T>
          </View>
        </MotiView>

        <Spacer h={spacing.lg} />

        {/* Progress dots — the only reliable signal of how much is left. */}
        <Row gap={6} style={{ justifyContent: "center" }}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 20 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === index ? colors.primary : colors.hairlineStrong,
              }}
            />
          ))}
        </Row>

        <Spacer h={spacing.lg} />

        <Button
          label={last ? strings.walkthrough.start : strings.walkthrough.next}
          variant="primary"
          large
          full
          onPress={next}
        />
        <Spacer h={spacing.xs} />
        {!last ? (
          <T
            variant="bodySm"
            color={colors.mutedSoft}
            align="center"
            onPress={onDone}
          >
            {strings.walkthrough.skip}
          </T>
        ) : null}
      </View>
    </Modal>
  );
}
