import { Pressable, View, type ViewStyle } from "react-native";
import { MotiView } from "moti";
import { Icon, type IconName } from "./icons";
import { Label, Spacer, T } from "./components";
import { colors, motion, radius, spacing } from "./theme";
import { useLocale } from "./providers";

/**
 * Dashboard building blocks — the card language of the home screens.
 *
 * The layout follows a well-worn consumer-finance pattern: one filled hero
 * card carrying the single number that matters, a grid of equal tiles beneath
 * it, a setup-progress row, then list sections. It reads instantly because
 * people have used it a hundred times in other apps.
 *
 * What we did NOT take from that pattern is its depth model. Those apps stack
 * drop shadows to separate cards; design.md carries depth with a hairline on
 * white over cream, and `theme.ts` says so explicitly. Every surface here is
 * hairline-bounded. The hero card separates by being filled ink, not by
 * floating.
 *
 * Colour stays scarce: ink for the hero, white for tiles, and orange reserved
 * for the one live thing on the screen. A grid where every tile is coloured is
 * a grid where nothing is emphasised.
 */

// ── Hero ───────────────────────────────────────────────────────────────

/**
 * The filled card at the top. One per screen — it is the answer to "what is
 * happening right now", and a second one would mean there were two answers.
 */
export function HeroCard({
  eyebrow,
  value,
  caption,
  tone = "ink",
  action,
  children,
}: {
  eyebrow: string;
  value: string;
  caption?: string;
  /** `primary` is for a live trip only — the state that means "act now". */
  tone?: "ink" | "primary";
  action?: { label: string; onPress: () => void };
  children?: React.ReactNode;
}) {
  const bg = tone === "primary" ? colors.primary : colors.ink;
  const onBg = tone === "primary" ? colors.onPrimary : colors.inverted.text;
  const dim = tone === "primary" ? "rgba(255,255,255,0.72)" : colors.inverted.textMuted;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: motion.duration.base * 1000 }}
      style={{ backgroundColor: bg, borderRadius: radius.lg, padding: spacing.lg }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Label color={dim}>{eyebrow}</Label>
          <Spacer h={spacing.xs} />
          <T variant="displayMd" color={onBg}>
            {value}
          </T>
        </View>

        {action ? (
          <Pressable
            onPress={action.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              borderWidth: 1,
              borderColor: tone === "primary" ? "rgba(255,255,255,0.45)" : colors.inverted.hairline,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.base,
              paddingVertical: 7,
            }}
          >
            <T variant="caption" color={onBg}>
              {action.label}
            </T>
          </Pressable>
        ) : null}
      </View>

      {caption ? (
        <>
          <Spacer h={spacing.sm} />
          <T variant="bodySm" color={dim}>
            {caption}
          </T>
        </>
      ) : null}

      {children}
    </MotiView>
  );
}

// ── Tile grid ──────────────────────────────────────────────────────────

/** Two-column grid. Rows fill left-to-right; an odd tile sits half-width. */
export function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -spacing.xs,
      }}
    >
      {children}
    </View>
  );
}

/**
 * One square-ish tile. `accent` paints the value orange — for the single tile
 * that is live, never as decoration.
 */
export function Tile({
  icon,
  label,
  value,
  accent = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  accent?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ width: "50%", paddingHorizontal: spacing.xs, marginBottom: spacing.sm }}>
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.canvasSoft : colors.surfaceCard,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radius.lg,
          padding: spacing.base,
          minHeight: 96,
          justifyContent: "space-between",
        })}
      >
        <Icon name={icon} size={20} color={accent ? colors.primary : colors.muted} />
        <View>
          <T variant="bodySm" color={colors.ink}>
            {label}
          </T>
          {value ? (
            <T variant="caption" color={accent ? colors.primary : colors.mutedSoft}>
              {value}
            </T>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

// ── Setup progress ─────────────────────────────────────────────────────

/**
 * "Get set up — 2 of 4". Disappears entirely at 100%: a permanent checklist
 * reading "4 of 4" is a row that can never be actioned again.
 */
export function SetupRow({
  title,
  done,
  total,
  onPress,
}: {
  title: string;
  done: number;
  total: number;
  onPress: () => void;
}) {
  const { strings } = useLocale();
  if (done >= total) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.base,
        backgroundColor: pressed ? colors.canvasSoft : colors.canvasSoft,
        borderWidth: 1,
        borderColor: colors.hairline,
        borderRadius: radius.lg,
        padding: spacing.base,
      })}
    >
      <ProgressRing done={done} total={total} />
      <View style={{ flex: 1 }}>
        <T variant="bodyMd" color={colors.ink}>
          {title}
        </T>
        <T variant="caption" color={colors.muted}>
          {/* "2 of 4" — `of` is already a shared word, so this needs no new key
              and reads correctly in both scripts without a template. */}
          {done} {strings.common.of} {total}
        </T>
      </View>
      <Icon name="chevron" size={18} color={colors.mutedSoft} />
    </Pressable>
  );
}

/**
 * Progress as a ring of segments rather than an arc.
 *
 * An SVG arc would need react-native-svg imported here purely for one shape;
 * discrete segments say "2 of 4" more literally anyway, and read at 28px where
 * a thin arc does not.
 */
function ProgressRing({ done, total }: { done: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 22,
            borderRadius: 3,
            backgroundColor: i < done ? colors.primary : colors.hairlineStrong,
          }}
        />
      ))}
    </View>
  );
}

// ── List rows ──────────────────────────────────────────────────────────

/** A titled section with a hairline-bounded white body. */
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
        <Label>{title}</Label>
        <View style={{ flex: 1 }} />
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <T variant="caption" color={colors.primary}>
              {action.label}
            </T>
          </Pressable>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radius.lg,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** One row inside a `Section`. `last` drops the divider. */
export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  last = false,
  onPress,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.base,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.hairlineSoft,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.pill,
            backgroundColor: colors.canvasSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={17} color={colors.muted} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <T variant="bodyMd" color={colors.ink}>
          {title}
        </T>
        {subtitle ? (
          <T variant="caption" color={colors.muted}>
            {subtitle}
          </T>
        ) : null}
      </View>

      {trailing}
      {onPress ? <Icon name="chevron" size={16} color={colors.mutedSoft} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.canvasSoft : "transparent" })}
    >
      {body}
    </Pressable>
  );
}

// ── Screen furniture ───────────────────────────────────────────────────

/** Avatar + greeting + language toggle. The dashboard's top bar. */
export function DashboardHeader({
  name,
  sub,
  onProfile,
  right,
}: {
  name: string;
  sub?: string;
  onProfile?: () => void;
  right?: React.ReactNode;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Pressable
        onPress={onProfile}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.pill,
          backgroundColor: colors.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <T variant="bodyMd" color={colors.inverted.text}>
          {initial}
        </T>
      </Pressable>

      <View style={{ flex: 1 }}>
        <T variant="bodyMd" color={colors.ink}>
          {name}
        </T>
        {sub ? (
          <T variant="caption" color={colors.mutedSoft}>
            {sub}
          </T>
        ) : null}
      </View>

      {right}
    </View>
  );
}

export const dashboardGap: ViewStyle = { marginBottom: spacing.lg };
