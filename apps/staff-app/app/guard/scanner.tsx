import { useState } from "react";
import { useRouter } from "expo-router";
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
import { StaffHeader } from "../../components/StaffHeader";

/**
 * Guard scanner.
 *
 * Verification is FULLY OFFLINE — signature checked against a cached school
 * public key, then exp, then jti replay, then today's roster. The gate must
 * never block on the network, so this screen must never make a synchronous
 * server call to verify a scan.
 *
 * Direction is fixed: the collector displays, the guard scans. Never reversed.
 *
 * The manual fallback below is deliberately given equal visual weight. It is
 * mandatory, not an escape hatch — a dead phone must never stop a real
 * handover.
 *
 * The camera is stubbed here: expo-camera needs a dev build, and a skeleton
 * should not gate on that. Real implementation is module M7.3.
 */
export default function ScannerScreen() {
  const router = useRouter();
  const { strings } = useLocale();
  const [offline, setOffline] = useState(true);

  return (
    <Screen inverted>
      <StaffHeader role="guard" />

      <T variant="displaySm" color={colors.inverted.text}>
        {strings.staff.scanQr}
      </T>
      <Spacer h={spacing.xs} />
      <T variant="bodySm" color={colors.inverted.textMuted}>
        {strings.staff.pointAtCode}
      </T>

      <Spacer h={spacing.lg} />

      {/* Camera viewport stand-in */}
      <View
        style={{
          aspectRatio: 1,
          borderRadius: radius.lg,
          backgroundColor: colors.inverted.canvasSoft,
          borderWidth: 1,
          borderColor: colors.inverted.hairline,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Reticle */}
        <View
          style={{
            width: "62%",
            aspectRatio: 1,
            borderWidth: 2,
            borderColor: colors.primary,
            borderRadius: radius.md,
          }}
        />
        <MotiView
          from={{ opacity: 0.25 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 1100, loop: true }}
          style={{ position: "absolute", bottom: spacing.md }}
        >
          <T variant="caption" color={colors.inverted.textMuted}>
            Camera preview (needs a dev build)
          </T>
        </MotiView>
      </View>

      <Spacer h={spacing.base} />

      <Row gap={spacing.xs}>
        <Badge tone={offline ? "success" : "neutral"}>
          {offline ? "Offline verify" : "Online"}
        </Badge>
        <View style={{ flex: 1 }} />
        <T
          variant="caption"
          color={colors.inverted.textMuted}
          onPress={() => setOffline((v) => !v)}
        >
          toggle
        </T>
      </Row>

      <Spacer h={spacing.lg} />

      {/* Skeleton triggers for each verdict path. */}
      <Button
        label="Simulate valid scan"
        variant="primary"
        large
        full
        onPress={() => router.push("/guard/verdict?result=ok")}
      />
      <Spacer h={spacing.xs} />
      <Button
        label="Simulate van scan (6 children)"
        full
        onPress={() => router.push("/guard/van")}
      />
      <Spacer h={spacing.xs} />
      <Button
        label="Simulate expired code"
        full
        onPress={() => router.push("/guard/verdict?result=expired")}
      />

      <Spacer h={spacing.lg} />
      <View style={{ height: 1, backgroundColor: colors.inverted.hairline }} />
      <Spacer h={spacing.lg} />

      <T variant="titleMd" color={colors.inverted.text}>
        {strings.staff.manualFallback}
      </T>
      <Spacer h={6} />
      <T variant="caption" color={colors.inverted.textMuted}>
        {strings.staff.manualNote}
      </T>
      <Spacer h={spacing.sm} />
      <Button
        label={strings.staff.manualTitle}
        variant="ink"
        large
        full
        onPress={() => router.push("/guard/manual")}
      />
    </Screen>
  );
}
