import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import { fixtures } from "@pickup/shared";
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
import { OsmMap } from "../components/OsmMap";

/**
 * "On my way" — the live trip.
 *
 * Location is FOREGROUND ONLY. Tracking starts on this explicit tap, streams
 * while this screen is open, and stops on handover or after 90 minutes.
 *
 * Do NOT add `expo-task-manager`, a background service, or
 * ACCESS_BACKGROUND_LOCATION here without the Play declaration — server-side
 * geofencing exists so this app does not need that permission, and `app.json`
 * blocks it explicitly.
 *
 * The map is OpenStreetMap via Leaflet in a WebView, NOT react-native-maps.
 * That would need a Google Maps key, a billing account, and an international
 * credit card — the riskiest non-technical dependency in the project — plus a
 * dev build. This has none of those and runs in Expo Go today.
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

      {/* OpenStreetMap via Leaflet — no API key, no billing, runs in Expo Go. */}
      <OsmMap
        lat={trip.data?.last_lat ?? null}
        lng={trip.data?.last_lng ?? null}
        schoolLat={fixtures.school.lat}
        schoolLng={fixtures.school.lng}
        height={200}
        label="You"
      />

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
