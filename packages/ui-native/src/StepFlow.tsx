import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./icons";
import { Spacer, T } from "./components";
import { colors, motion, radius, spacing } from "./theme";
import { useLocale } from "./providers";

/**
 * One question per screen, with a progress bar and a circular next button.
 *
 * Why this shape rather than one long form: the parent flow asks for a CNIC, a
 * password and two camera captures. On one screen that is a wall a user
 * abandons, and — worse — a validation failure at the bottom scrolls away from
 * the field that caused it. A step can only fail for the one reason it is
 * asking about, so the error always sits under the input the user is looking
 * at.
 *
 * `useStepFlow` owns only the index and direction. Field state stays in the
 * screen, because a generic step machine that also owns values ends up
 * stringly-typed and loses every bit of type safety at the point it matters.
 */

export function useStepFlow(count: number) {
  const [index, setIndex] = useState(0);
  // Direction drives the enter animation: forward slides in from the right,
  // back from the left. Without it, going back feels like going forward.
  const [dir, setDir] = useState<1 | -1>(1);

  const next = useCallback(() => {
    setDir(1);
    setIndex((i) => Math.min(i + 1, count - 1));
  }, [count]);

  const back = useCallback(() => {
    setDir(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  return { index, dir, next, back, isFirst: index === 0, isLast: index === count - 1, setIndex };
}

/** Thin rule that fills as the user advances. */
export function StepProgress({ index, count }: { index: number; count: number }) {
  const pct = ((index + 1) / count) * 100;
  return (
    <View style={{ height: 3, backgroundColor: colors.hairline, borderRadius: 2, overflow: "hidden" }}>
      <MotiView
        animate={{ width: `${pct}%` }}
        transition={{ type: "timing", duration: motion.duration.base * 1000 }}
        style={{ height: 3, backgroundColor: colors.primary }}
      />
    </View>
  );
}

/**
 * The shell every step renders into: wordmark, progress, question, body, and a
 * back/next pair pinned to the bottom.
 *
 * `canAdvance` greys the next button but never removes it, and `error` renders
 * directly beneath the children. A disabled control with no explanation is the
 * dead end this flow exists to avoid.
 */
export function StepScreen({
  index,
  count,
  dir,
  question,
  hint,
  error,
  busy,
  canAdvance,
  nextLabel,
  onBack,
  onNext,
  children,
}: {
  index: number;
  count: number;
  dir: 1 | -1;
  question: string;
  hint?: string;
  error?: string | null;
  busy?: boolean;
  canAdvance: boolean;
  nextLabel?: string;
  onBack?: () => void;
  onNext: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { strings } = useLocale();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, paddingTop: insets.top + spacing.base, paddingHorizontal: spacing.lg }}>
        <View style={{ alignItems: "center", marginBottom: spacing.base }}>
          <T variant="titleMd" color={colors.ink}>
            {strings.common.appName}
            <T variant="titleMd" color={colors.primary}>
              .
            </T>
          </T>
        </View>

        <StepProgress index={index} count={count} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: spacing.xl, paddingBottom: spacing.xl }}
        >
          {/* Keyed on index so each step actually re-mounts and re-animates —
              without the key, Moti sees the same node and skips the entrance. */}
          <MotiView
            key={index}
            from={{ opacity: 0, translateX: 22 * dir }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: motion.duration.base * 1000 }}
          >
            <T variant="displaySm" color={colors.ink}>
              {question}
            </T>

            {hint ? (
              <>
                <Spacer h={spacing.xs} />
                <T variant="bodySm" color={colors.muted}>
                  {hint}
                </T>
              </>
            ) : null}

            <Spacer h={spacing.lg} />
            {children}

            {error ? (
              <>
                <Spacer h={spacing.sm} />
                <T variant="bodySm" color={colors.error}>
                  {error}
                </T>
              </>
            ) : null}
          </MotiView>
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingBottom: insets.bottom + spacing.base,
            gap: spacing.sm,
          }}
        >
          {onBack ? (
            <StepButton icon="chevron" flip onPress={onBack} variant="quiet" />
          ) : (
            <View style={{ width: 52 }} />
          )}

          <View style={{ flex: 1 }} />

          {nextLabel ? (
            <Pressable
              onPress={onNext}
              disabled={!canAdvance || busy}
              style={{
                height: 52,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canAdvance && !busy ? colors.primary : colors.hairlineStrong,
              }}
            >
              <T variant="bodyMd" color={colors.onPrimary}>
                {busy ? strings.common.loading : nextLabel}
              </T>
            </Pressable>
          ) : (
            <StepButton
              icon="chevron"
              onPress={onNext}
              disabled={!canAdvance || busy}
              variant="primary"
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function StepButton({
  icon,
  onPress,
  disabled,
  variant,
  flip = false,
}: {
  icon: "chevron";
  onPress: () => void;
  disabled?: boolean;
  variant: "primary" | "quiet";
  flip?: boolean;
}) {
  const bg =
    variant === "primary"
      ? disabled
        ? colors.hairlineStrong
        : colors.primary
      : colors.surfaceCard;
  const fg = variant === "primary" ? colors.onPrimary : colors.body;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{
        width: 52,
        height: 52,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        borderWidth: variant === "quiet" ? 1 : 0,
        borderColor: colors.hairlineStrong,
      }}
    >
      <View style={flip ? { transform: [{ rotate: "180deg" }] } : undefined}>
        <Icon name={icon} size={22} color={fg} />
      </View>
    </Pressable>
  );
}
