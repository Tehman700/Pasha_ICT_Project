import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import {
  Badge,
  Button,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  motion,
  radius,
  spacing,
  useLocale,
} from "@pickup/ui-native";
import { fixtures } from "@pickup/shared";

/**
 * Scan verdict.
 *
 * Ink-inverted at large type because this is read in direct afternoon sun at
 * a school gate — the cream canvas is unreadable there. The verdict colour is
 * the lightened on-ink semantic, which the light-surface values cannot match
 * for luminance.
 *
 * A green verdict is NOT the handover. The guard still checks the child photo
 * against the collector photo and confirms visually. Software proposes; a
 * person decides.
 */
export default function VerdictScreen() {
  const { result } = useLocalSearchParams<{ result?: string }>();
  const router = useRouter();
  const { strings } = useLocale();

  const ok = result !== "expired";
  const child = fixtures.students[0]!;
  const collector = fixtures.currentDriver;

  const accent = ok ? colors.inverted.successOnInk : colors.inverted.errorOnInk;

  return (
    <Screen inverted>
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: motion.duration.base * 1000 }}
      >
        <View style={{ alignItems: "center", paddingTop: spacing.xl }}>
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: radius.pill,
              borderWidth: 3,
              borderColor: accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <T variant="displayMd" color={accent}>
              {ok ? "✓" : "✕"}
            </T>
          </View>

          <Spacer h={spacing.base} />
          <T variant="displayMd" color={accent} align="center">
            {ok ? strings.staff.verified : strings.staff.denied}
          </T>
          {!ok ? (
            <>
              <Spacer h={spacing.xs} />
              <T variant="bodyMd" color={colors.inverted.textMuted} align="center">
                {strings.staff.expired}
              </T>
            </>
          ) : null}
        </View>
      </MotiView>

      <Spacer h={spacing.xl} />

      {ok ? (
        <>
          <T variant="captionUppercase" color={colors.inverted.textMuted}>
            {strings.staff.confirmVisually}
          </T>
          <Spacer h={spacing.sm} />

          <Row gap={spacing.sm}>
            {[
              { label: strings.queue.child, name: child.name, sub: child.class_name },
              { label: strings.queue.collector, name: collector.name, sub: "ICT-2291" },
            ].map((p) => (
              <View
                key={p.label}
                style={{
                  flex: 1,
                  backgroundColor: colors.inverted.canvasSoft,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.inverted.hairline,
                  padding: spacing.base,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: radius.pill,
                    backgroundColor: colors.inverted.hairline,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <T variant="caption" color={colors.inverted.textMuted}>
                    photo
                  </T>
                </View>
                <Spacer h={spacing.sm} />
                <T variant="captionUppercase" color={colors.inverted.textMuted}>
                  {p.label}
                </T>
                <Spacer h={4} />
                <T variant="titleMd" color={colors.inverted.text} align="center">
                  {p.name}
                </T>
                <T variant="caption" color={colors.inverted.textMuted}>
                  {p.sub}
                </T>
              </View>
            ))}
          </Row>

          <Spacer h={spacing.lg} />
          <Button
            label={strings.staff.confirmHandover}
            variant="primary"
            large
            full
            onPress={() => router.replace("/guard/scanner")}
          />
          <Spacer h={spacing.xs} />
          <View style={{ alignItems: "center" }}>
            <Badge tone="success">{strings.staff.offlineQueued}</Badge>
          </View>
        </>
      ) : (
        <>
          <T variant="bodyMd" color={colors.inverted.textMuted} align="center">
            Ask them to refresh their code, or complete this handover manually.
            Never turn a family away because the software said no.
          </T>
          <Spacer h={spacing.lg} />
          <Button
            label={strings.staff.manualTitle}
            variant="primary"
            large
            full
            onPress={() => router.replace("/guard/manual")}
          />
        </>
      )}

      <Spacer h={spacing.xs} />
      <Button
        label={strings.common.back}
        variant="ghost"
        full
        onPress={() => router.replace("/guard/scanner")}
      />
    </Screen>
  );
}
