import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { CameraView, useCameraPermissions } from "expo-camera";
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
import { StaffWalkthrough } from "../../components/StaffWalkthrough";

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
 * The paste field is kept below the camera rather than removed. A cracked
 * lens or a denied permission must not be the reason a child cannot go home,
 * and a guard reading six characters aloud is a worse day than a guard typing.
 */
export default function ScannerScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [code, setCode] = useState("");
  const [permission, requestPermission] = useCameraPermissions();

  /**
   * A barcode in frame fires this callback many times per second. Without the
   * latch, one QR held up at the gate becomes a burst of verify calls and a
   * stack of verdict screens the guard has to dismiss one by one.
   *
   * A ref, not state: `onBarcodeScanned` closes over the value at render time,
   * so a state flag would still let several frames through before React
   * re-rendered.
   */
  const busy = useRef(false);

  // Re-arm when the guard comes back from the verdict screen. Tokens rotate
  // about every 60s, so the next child's code is a genuinely new scan.
  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      return undefined;
    }, []),
  );

  const scan = useMutation({
    mutationFn: (token: string) => api.verifyQrToken(token, DEVICE_ID),
    onSuccess: (result) => {
      router.push({
        pathname: "/guard/verdict",
        params: { result: JSON.stringify(result) },
      });
    },
    onError: () => {
      // Let the guard try again rather than stranding them on a dead screen.
      busy.current = false;
    },
  });

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (busy.current || scan.isPending) return;
    const token = data.trim();
    if (token.length < 10) return;
    busy.current = true;
    setCode(token);
    scan.mutate(token);
  };

  const cameraReady = permission?.granted === true;

  return (
    <Screen inverted>
      <StaffWalkthrough role="guard" />
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
        {cameraReady ? (
          <CameraView
            style={{ position: "absolute", width: "100%", height: "100%" }}
            facing="back"
            // QR only. Letting it read every symbology means a barcode on a
            // lunchbox in frame triggers a verify call.
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcodeScanned}
          />
        ) : null}

        <View
          style={{
            width: "55%",
            aspectRatio: 1,
            borderWidth: 2,
            borderColor: colors.primary,
            borderRadius: radius.md,
          }}
        />

        {cameraReady ? (
          scan.isPending ? (
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 600, loop: true }}
              style={{ position: "absolute", bottom: spacing.sm }}
            >
              <T variant="caption" color={colors.inverted.text}>
                {strings.common.loading}
              </T>
            </MotiView>
          ) : null
        ) : (
          <View style={{ position: "absolute", bottom: spacing.sm, alignItems: "center" }}>
            <T variant="caption" color={colors.inverted.textMuted}>
              {permission?.canAskAgain === false
                ? strings.staff.cameraBlocked
                : strings.staff.cameraOff}
            </T>
            {permission?.canAskAgain !== false ? (
              <>
                <Spacer h={spacing.xs} />
                <Button label={strings.staff.enableCamera} onPress={() => void requestPermission()} />
              </>
            ) : null}
          </View>
        )}
      </View>

      <Spacer h={spacing.base} />

      <Input
        value={code}
        onChangeText={setCode}
        placeholder={strings.staff.pasteCode}
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
            {strings.staff.scanOfflineNote}
          </T>
        </>
      ) : null}

      <Spacer h={spacing.base} />
      <Row gap={spacing.xs}>
        <Badge tone="success">{strings.staff.offlineVerify}</Badge>
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
