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
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { TripMap } from "../components/TripMap";
import { useLiveTrip } from "../hooks/useLiveTrip";

/**
 * "On my way" — the live trip.
 *
 * Location is FOREGROUND ONLY. Tracking starts when this screen opens, streams
 * while it is open, and stops on unmount or after 90 minutes — see
 * `hooks/useLiveTrip.ts`, which owns all of that.
 *
 * Do NOT add `expo-task-manager`, a background service, or
 * ACCESS_BACKGROUND_LOCATION here without the Play declaration — server-side
 * geofencing exists so this app does not need that permission, and `app.json`
 * blocks it explicitly.
 *
 * The map is OpenStreetMap via Leaflet in a WebView, NOT react-native-maps.
 * That would need a Google Maps key, a billing account, and an international
 * credit card — the riskiest non-technical dependency in the project.
 */
export default function TripScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [elapsed, setElapsed] = useState(0);

  const live = useLiveTrip(true);

  const entry = useQuery({ queryKey: ["myQueueEntry"], queryFn: () => api.getMyQueueEntry() });
  // The school's real coordinates, not fixtures — the map previously pinned a
  // fixture school, so the "you vs school" picture was wrong for every real
  // deployment.
  const schools = useQuery({ queryKey: ["schools"], queryFn: () => api.listSchools() });
  const school = schools.data?.[0];

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Prefer the value the server just computed from our own fix; fall back to
  // whatever the trip record last held.
  const eta = live.status?.eta_seconds ?? live.trip?.eta_seconds ?? null;
  const nearby = eta !== null && eta <= 120;

  async function endTrip() {
    live.stop();
    if (live.trip) {
      try {
        await api.endTrip(live.trip.id);
      } catch {
        // Ending is best-effort — the server also auto-ends after 90 minutes,
        // and a failed call must not trap the parent on this screen.
      }
    }
    router.replace("/");
  }

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
              backgroundColor:
                live.permission === "granted" ? colors.primary : colors.mutedSoft,
            }}
          />
        </MotiView>
        <T variant="captionUppercase" color={colors.primary}>
          {live.starting
            ? strings.parent.startingTrip
            : live.permission === "granted"
              ? strings.parent.locationSharing
              : strings.parent.tripActive}
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
        {live.status
          ? `${(live.status.distance_m / 1000).toFixed(1)} km ${strings.parent.distanceAway}`
          : strings.parent.estimatedHandover}
      </T>

      {/* A refused permission is not a dead end — the schedule still stands.
          Say so, and leave the door open, rather than blocking the screen. */}
      {live.permission === "denied" ? (
        <>
          <Spacer h={spacing.base} />
          <Card>
            <T variant="titleSm" color={colors.ink}>
              {strings.parent.locationNeeded}
            </T>
            <Spacer h={6} />
            <T variant="bodySm" color={colors.body}>
              {strings.parent.locationDenied}
            </T>
            <Spacer h={spacing.sm} />
            <Button
              label={strings.parent.allowLocation}
              variant="primary"
              full
              onPress={live.retryPermission}
            />
          </Card>
        </>
      ) : null}

      {live.error ? (
        <>
          <Spacer h={spacing.base} />
          <T variant="bodySm" color={colors.error}>
            {strings.parent.tripFailed}
          </T>
        </>
      ) : null}

      <Spacer h={spacing.lg} />

      {/* The map needs the school's real position to mean anything, so it
          waits for it rather than pinning a placeholder. */}
      {school ? (
        <TripMap
          lat={live.coords?.lat ?? live.trip?.last_lat ?? null}
          lng={live.coords?.lng ?? live.trip?.last_lng ?? null}
          schoolLat={school.lat}
          schoolLng={school.lng}
          height={200}
          label="You"
        />
      ) : null}

      <Spacer h={spacing.base} />

      {nearby ? (
        <Card accent="primary">
          <Badge tone="primary">{strings.status.NEARBY}</Badge>
          <Spacer h={spacing.xs} />
          <T variant="bodySm" color={colors.body}>
            {strings.parent.classroomsTold}
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
        disabled={!live.trip}
        onPress={() => router.push("/qr")}
      />
      <Spacer h={spacing.xs} />
      <Button label={strings.parent.endTrip} full onPress={endTrip} />
    </Screen>
  );
}
