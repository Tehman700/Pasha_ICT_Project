import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useMutation } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Input,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  motion,
  radius,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { StaffHeader } from "../../components/StaffHeader";

const DEVICE_ID = "GATE-TAB-01";

/**
 * Guard scanner.
 *
 * Verification is cryptographic: an ES256 signature checked against the
 * school's public key. The guard's device holds only that public key — enough
 * to verify, useless for minting. A stolen guard phone cannot forge a code for
 * any child.
 *
 * The manual fallback below is given equal visual weight on purpose. It is
 * mandatory, not an escape hatch: a dead phone must never stop a real handover.
 *
 * CAMERA: expo-camera needs a dev build, so until then the code is pasted
 * rather than scanned. Everything after that point — signature, expiry,
 * replay, authorization — is the real path, not a simulation.
 */
export default function ScannerScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [code, setCode] = useState("");

  const scan = useMutation({
    mutationFn: (token: string) => api.verifyQrToken(token, DEVICE_ID),
    onSuccess: (result) => {
      router.push({
        pathname: "/guard/verdict",
        params: { result: JSON.stringify(result) },
      });
    },
  });

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

      <View
        style={{
          aspectRatio: 1.4,
          borderRadius: radius.lg,
          backgroundColor: colors.inverted.canvasSoft,
          borderWidth: 1,
          borderColor: colors.inverted.hairline,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: "55%",
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
          style={{ position: "absolute", bottom: spacing.sm }}
        >
          <T variant="caption" color={colors.inverted.textMuted}>
            Camera needs a dev build — paste the code below
          </T>
        </MotiView>
      </View>

      <Spacer h={spacing.base} />

      <Input
        value={code}
        onChangeText={setCode}
        placeholder="Paste pickup code"
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={{
          backgroundColor: colors.inverted.canvasSoft,
          borderColor: colors.inverted.hairline,
          color: colors.inverted.text,
          height: 72,
          paddingTop: spacing.sm,
        }}
      />

      <Spacer h={spacing.sm} />
      <Button
        label={scan.isPending ? strings.common.loading : strings.staff.scanQr}
        variant="primary"
        large
        full
        disabled={code.trim().length < 10 || scan.isPending}
        onPress={() => scan.mutate(code.trim())}
      />

      {scan.isError ? (
        <>
          <Spacer h={spacing.sm} />
          <T variant="caption" color={colors.inverted.errorOnInk}>
            Could not reach the server. Use the manual handover below — never
            turn a family away because the software could not check.
          </T>
        </>
      ) : null}

      <Spacer h={spacing.base} />
      <Row gap={spacing.xs}>
        <Badge tone="success">Offline verify</Badge>
        <View style={{ flex: 1 }} />
      </Row>

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
