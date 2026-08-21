import { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CNIC_LENGTH,
  CNIC_PLACEHOLDER,
  PHONE_PLACEHOLDER,
  formatCnic,
  formatPhoneInput,
  type PickupStatus,
} from "@pickup/shared";
import { Icon, type IconName } from "./icons";
import { colors, radius, spacing, surface, text, textUr } from "./theme";
import { useLocale } from "./providers";

/**
 * RN component kit.
 *
 * Mirrors `apps/admin-web/components/ui/` so the two stacks look like one
 * product: hairline depth, no shadows, one scarce orange CTA, display weight
 * held at 400.
 */

// ── Typography ─────────────────────────────────────────────────────────

type TypeKey = keyof typeof text;

export function T({
  variant = "bodyMd",
  color = colors.body,
  align,
  style,
  children,
  numberOfLines,
  onPress,
}: {
  variant?: TypeKey;
  color?: string;
  align?: "left" | "center" | "right" | "auto";
  style?: object;
  children: React.ReactNode;
  numberOfLines?: number;
  /** Inline text action (design.md `button-tertiary-text`). */
  onPress?: () => void;
}) {
  const { locale, isRTL } = useLocale();
  // Urdu resolves to its own ramp: zero tracking (negative tracking severs
  // Nastaliq) and a much taller line-height.
  const ramp = locale === "ur" && variant in textUr ? textUr : text;
  const step = ramp[variant as keyof typeof ramp] ?? text[variant];

  const node = (
    <Text
      numberOfLines={numberOfLines}
      style={[
        step,
        {
          color,
          textAlign: align ?? (isRTL ? "right" : "left"),
          writingDirection: isRTL ? "rtl" : "ltr",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );

  // Inline text actions need a real hit target, not just glyph bounds — RN's
  // `Text` has no hitSlop, so wrap rather than relying on the text box.
  if (!onPress) return node;
  return (
    <Pressable onPress={onPress} hitSlop={12}>
      {node}
    </Pressable>
  );
}

/** Uppercase section label. Urdu does not uppercase. */
export function Label({ children, color = colors.muted }: { children: React.ReactNode; color?: string }) {
  const { locale } = useLocale();
  return (
    <T
      variant="captionUppercase"
      color={color}
      style={locale === "ur" ? undefined : { textTransform: "uppercase" }}
    >
      {children}
    </T>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────

export function Screen({
  children,
  scroll = true,
  inverted = false,
  padded = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  inverted?: boolean;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const bg = inverted ? colors.inverted.canvas : colors.canvas;
  const pad: ViewStyle = {
    paddingTop: insets.top + (padded ? spacing.base : 0),
    paddingBottom: insets.bottom + spacing.xl,
    paddingHorizontal: padded ? spacing.md : 0,
  };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: bg }, pad]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: "none" | "primary" | "error" | "success";
}) {
  const borderColor =
    accent === "primary"
      ? colors.primary
      : accent === "error"
        ? colors.error
        : accent === "success"
          ? colors.success
          : colors.hairline;

  return (
    <View style={[surface.card, { padding: spacing.md, borderColor }, style]}>
      {children}
    </View>
  );
}

export function Row({
  children,
  gap = spacing.sm,
  align = "center",
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  align?: ViewStyle["alignItems"];
  style?: ViewStyle;
}) {
  const { isRTL } = useLocale();
  return (
    <View
      style={[
        { flexDirection: isRTL ? "row-reverse" : "row", alignItems: align, gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.hairlineSoft, marginVertical: spacing.base }} />;
}

export function Spacer({ h = spacing.base }: { h?: number }) {
  return <View style={{ height: h }} />;
}

// ── Button ─────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ink" | "danger" | "ghost";

export function Button({
  label,
  onPress,
  variant = "secondary",
  disabled,
  loading,
  full,
  large,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  large?: boolean;
  /** Optional leading glyph. Inherits the button's foreground colour. */
  icon?: IconName;
}) {
  const styles: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surfaceCard, fg: colors.ink, border: colors.hairlineStrong },
    ink: { bg: colors.ink, fg: colors.canvas, border: colors.ink },
    danger: { bg: colors.surfaceCard, fg: colors.error, border: colors.error },
    ghost: { bg: "transparent", fg: colors.ink, border: "transparent" },
  };
  const s = styles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      // Without this the touch target is exactly the painted box, and on a
      // 48px control that reads as "only the middle works" — a thumb lands
      // a few pixels outside the border and nothing happens. 8px of slop on
      // every side costs nothing visually and makes the edges live.
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      // Android needs this explicitly; without it a Pressable inside an
      // animated (transformed) parent can keep its pre-animation hit area.
      pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => ({
        backgroundColor: pressed && variant === "primary" ? colors.primaryActive : s.bg,
        borderColor: s.border,
        borderWidth: 1,
        borderRadius: radius.md,
        // 48px is above the 44px AAA touch target — these are one-handed,
        // outdoors, often in a hurry.
        height: large ? 56 : 48,
        paddingHorizontal: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: full ? "stretch" : "flex-start",
        opacity: disabled ? 0.4 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon ? <Icon name={icon} size={large ? 20 : 18} color={s.fg} /> : null}
          <T variant={large ? "titleMd" : "button"} color={s.fg} align="center">
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

// ── Badge + status ─────────────────────────────────────────────────────

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "error" | "ink";
}) {
  const tones = {
    neutral: { bg: colors.surfaceStrong, fg: colors.ink },
    primary: { bg: "#fde9e0", fg: colors.primary },
    success: { bg: "#dff0e9", fg: colors.success },
    error: { bg: "#fadfe6", fg: colors.error },
    ink: { bg: colors.ink, fg: colors.canvas },
  } as const;
  const s = tones[tone];
  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <T variant="captionUppercase" color={s.fg}>
        {children}
      </T>
    </View>
  );
}

/**
 * Queue status.
 *
 * Same rule as the web surface: state is carried by weight and fill, not hue.
 * Only NEARBY (act now), AT_GATE (ink inversion), HANDED_OVER and LAPSED
 * spend colour — three of seven, which is what keeps a long list readable.
 */
export function StatusPill({ status }: { status: PickupStatus }) {
  const { strings } = useLocale();
  const map = colors.status[status];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: map.border,
        backgroundColor: map.fill === "transparent" ? "transparent" : map.fill,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <T variant="captionUppercase" color={map.fg}>
        {strings.status[status]}
      </T>
    </View>
  );
}

/** Small chip naming one child. Used wherever a trip carries several. */
export function ChildChip({ name, sub }: { name: string; sub?: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceStrong,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
      }}
    >
      <T variant="caption" color={colors.ink}>
        {name}
        {sub ? <T variant="caption" color={colors.muted}>{`  ${sub}`}</T> : null}
      </T>
    </View>
  );
}

// ── Form ───────────────────────────────────────────────────────────────

export const Input = forwardRef<TextInput, TextInputProps>(function Input(props, ref) {
  const { isRTL } = useLocale();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.mutedSoft}
      {...props}
      style={[
        {
          height: 48,
          borderWidth: 1,
          borderColor: colors.hairlineStrong,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceCard,
          paddingHorizontal: spacing.base,
          color: colors.ink,
          textAlign: isRTL ? "right" : "left",
          ...text.bodyMd,
        },
        props.style as object,
      ]}
    />
  );
});

/**
 * Phone field. 11 digits, `03xxxxxxxxx`, and nothing else can be typed into it.
 *
 * Every phone entry point in both apps goes through this rather than a bare
 * `Input` with a `maxLength` prop, because "the cap is a prop" is how four of
 * six call sites ended up without one.
 *
 * `dir="ltr"` is forced: a phone number is left-to-right even in Urdu, and the
 * shared `Input` flips `textAlign` with the locale. A number that renders
 * right-aligned reads as though it starts with the last digit.
 */
export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(function PhoneInput(
  { value, onChangeText, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      value={value}
      onChangeText={(raw) => onChangeText(formatPhoneInput(raw))}
      placeholder={PHONE_PLACEHOLDER}
      keyboardType="number-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      autoCorrect={false}
      // Deliberately NO maxLength. formatPhoneInput already caps the value at
      // 11, and maxLength actively breaks paste: pasting "+92 321 5000011"
      // gets truncated to 11 *characters* by the field before the formatter
      // ever sees it, leaving "+92 321 500" - which normalises to a different,
      // wrong number rather than failing loudly.
      style={{ textAlign: "left" }}
      {...rest}
    />
  );
});

type PhoneInputProps = Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (next: string) => void;
};

/**
 * CNIC field. Dashes appear as you pass each boundary — `38515-1952462-5`.
 *
 * Holds the formatted string; callers send `cnicDigits(value)`. The 15-char
 * `maxLength` counts the two dashes on top of 13 digits.
 */
export const CnicInput = forwardRef<TextInput, PhoneInputProps>(function CnicInput(
  { value, onChangeText, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      value={value}
      onChangeText={(raw) => onChangeText(formatCnic(raw))}
      placeholder={CNIC_PLACEHOLDER}
      keyboardType="number-pad"
      autoCorrect={false}
      maxLength={CNIC_LENGTH + 2}
      style={{ textAlign: "left" }}
      {...rest}
    />
  );
});

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: spacing.base }}>
      <View style={{ marginBottom: spacing.xs }}>
        <Label>{label}</Label>
      </View>
      {children}
      {hint ? (
        <View style={{ marginTop: 6 }}>
          <T variant="caption" color={colors.muted}>
            {hint}
          </T>
        </View>
      ) : null}
    </View>
  );
}

// ── States ─────────────────────────────────────────────────────────────

export function Loading() {
  return (
    <View style={{ paddingVertical: spacing.xxl, alignItems: "center" }}>
      <ActivityIndicator color={colors.muted} />
    </View>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.hairlineStrong,
        borderRadius: radius.lg,
        paddingVertical: spacing.xxl,
        alignItems: "center",
      }}
    >
      <T variant="bodyMd" color={colors.muted} align="center">
        {message}
      </T>
    </View>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <T variant="displaySm" color={colors.ink}>
        {title}
      </T>
      {subtitle ? (
        <View style={{ marginTop: 6 }}>
          <T variant="bodySm" color={colors.muted}>
            {subtitle}
          </T>
        </View>
      ) : null}
    </View>
  );
}
