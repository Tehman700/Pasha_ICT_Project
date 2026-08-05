import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  ChildChip,
  Label,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  etaLabel,
  motion,
  radius,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../components/ScreenHeader";

/**
 * "On my way" — the live trip.
 *
 * Location is FOREGROUND ONLY. Tracking starts on this explicit tap, streams
 * while this screen is open, and stops on handover or after 90 minutes.
 *
 * Do NOT add `expo-task-manager`, a background service, or
 * ACCESS_BACKGROUND_LOCATION here. Server-side geofencing exists precisely so
 * this app never needs that permission — it is the single biggest Play Store
 * review risk in the project, and `app.json` blocks it explicitly.
 *
 * The map is a placeholder: react-native-maps needs a Google Maps API key and
 * a dev build, neither of which belongs in a skeleton.
 */
export default function TripScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [elapsed, setElapsed] = useState(0);

  const trip = useQuery({ queryKey: ["myTrip"], queryFn: () => api.getMyTrip() });
  const entry = useQuery({ queryKey: ["myQueueEntry"], queryFn: () => api.getMyQueueEntry() });

  // Stand-in for the 15-second location stream.
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const eta = trip.data?.eta_seconds ?? null;
  const nearby = eta !== null && eta < 120;

  return (
    <Screen>
      <ScreenHeader title={strings.parent.tripActive} />

      <Row>
        <MotiView
          from={{ opacity: 0.35 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 900, loop: true }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.primary,
            }}
          />
        </MotiView>
        <T variant="captionUppercase" color={colors.primary}>
          {strings.parent.tripActive}
        </T>
        <View style={{ flex: 1 }} />
        <T variant="caption" color={colors.mutedSoft}>
          {Math.floor(elapsed / 60)}m {elapsed % 60}s
        </T>
      </Row>

      <Spacer h={spacing.lg} />

      <T variant="displayMd" color={colors.ink}>
        {etaLabel(eta)}
      </T>
      <Spacer h={4} />
      <T variant="bodySm" color={colors.muted}>
        {strings.parent.estimatedHandover}
      </T>

      <Spacer h={spacing.lg} />

      {/* Map placeholder — real map needs a dev build + Maps key. */}
      <View
        style={{
          height: 180,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: colors.canvasSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <T variant="caption" color={colors.mutedSoft} align="center">
          Map view{"\n"}(needs a dev build + Maps SDK key)
        </T>
      </View>

      <Spacer h={spacing.base} />

      {nearby ? (
        <Card accent="primary">
          <Badge tone="primary">{strings.status.NEARBY}</Badge>
          <Spacer h={spacing.xs} />
          <T variant="bodySm" color={colors.body}>
            The classrooms have been told. Children are being brought to the gate.
          </T>
        </Card>
      ) : null}

      <Spacer h={spacing.lg} />
      <Label>{strings.parent.manifest}</Label>
      <Spacer h={spacing.sm} />
      <Row gap={6} style={{ flexWrap: "wrap" }}>
        {entry.data?.sibling_group.map((s) => (
          <ChildChip key={s.student_id} name={s.student_name} sub={s.class_name} />
        ))}
      </Row>

      <Spacer h={spacing.lg} />
      <T variant="caption" color={colors.mutedSoft}>
        {strings.parent.trackingNote}
      </T>

      <Spacer h={spacing.lg} />
      <Button
        label={strings.parent.showQr}
        variant="primary"
        large
        full
        onPress={() => router.push("/qr")}
      />
      <Spacer h={spacing.xs} />
      <Button label={strings.parent.endTrip} full onPress={() => router.replace("/")} />
    </Screen>
  );
}
