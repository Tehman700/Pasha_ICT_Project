import { useEffect, useState } from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import QRCode from "react-native-qrcode-svg";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  ChildChip,
  Loading,
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
import { ScreenHeader } from "../components/ScreenHeader";

const ROTATE_SECONDS = 60;

/**
 * The rotating pickup code.
 *
 * A batch of ES256-signed tokens is pre-fetched when the trip starts, so this
 * screen keeps working with no signal at the gate. The guard verifies fully
 * offline against a cached public key — never a synchronous server call.
 *
 * Direction is fixed: the collector DISPLAYS, the guard SCANS. Never reversed.
 *
 * A static code could be screenshotted and forwarded to anyone, which would
 * defeat the entire premise — hence rotation.
 *
 * KNOWN GAP (module M7.1): 20 tokens x 60s is ~20 minutes of cover, but a trip
 * can run 90. A collector waiting longer runs out of valid codes in exactly the
 * offline scenario this was designed for. Size the batch to the trip window.
 */
export default function QrScreen() {
  const api = useApi();
  const { strings } = useLocale();
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROTATE_SECONDS);

  const trip = useQuery({ queryKey: ["myTrip"], queryFn: () => api.getMyTrip() });
  const tokens = useQuery({
    queryKey: ["qrTokens", trip.data?.id],
    queryFn: () => api.getQrTokens(trip.data!.id),
    enabled: !!trip.data?.id,
  });
  const entry = useQuery({ queryKey: ["myQueueEntry"], queryFn: () => api.getMyQueueEntry() });

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setIndex((i) => i + 1);
          return ROTATE_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const batch = tokens.data ?? [];
  const token = batch.length ? batch[index % batch.length]! : null;
  const exhausted = batch.length > 0 && index >= batch.length;

  return (
    <Screen>
      <ScreenHeader title={strings.parent.qrTitle} />

      <T variant="displaySm" color={colors.ink} align="center">
        {strings.parent.qrTitle}
      </T>
      <Spacer h={spacing.lg} />

      {tokens.isLoading || !token ? (
        <Loading />
      ) : (
        <>
          <View style={{ alignItems: "center" }}>
            <MotiView
              key={index}
              from={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: motion.duration.base * 1000 }}
              style={{
                padding: spacing.md,
                backgroundColor: colors.surfaceCard,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.hairline,
              }}
            >
              <QRCode
                value={token.token}
                size={220}
                color={colors.ink}
                backgroundColor={colors.surfaceCard}
              />
            </MotiView>
          </View>

          <Spacer h={spacing.base} />

          {/* Rotation countdown — a code that looks frozen reads as broken. */}
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                height: 3,
                width: 220,
                backgroundColor: colors.hairlineSoft,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <MotiView
                key={`bar-${index}`}
                from={{ width: 220 }}
                animate={{ width: 0 }}
                transition={{ type: "timing", duration: ROTATE_SECONDS * 1000 }}
                style={{ height: 3, backgroundColor: colors.primary }}
              />
            </View>
            <Spacer h={spacing.xs} />
            <T variant="caption" color={colors.muted}>
              {strings.parent.qrRotates} · {secondsLeft}s
            </T>
          </View>

          <Spacer h={spacing.base} />
          <Row gap={spacing.xs} style={{ justifyContent: "center" }}>
            <Badge tone="success">{strings.parent.qrOffline}</Badge>
            <Badge tone="neutral">
              {Math.max(0, batch.length - index)} / {batch.length}
            </Badge>
          </Row>

          {exhausted ? (
            <>
              <Spacer h={spacing.base} />
              <T variant="caption" color={colors.error} align="center">
                Token batch exhausted — reconnect to fetch more. (M7.1)
              </T>
            </>
          ) : null}

          <Spacer h={spacing.lg} />
          <T variant="caption" color={colors.mutedSoft} align="center">
            {strings.parent.manifest}
          </T>
          <Spacer h={spacing.xs} />
          <Row gap={6} style={{ flexWrap: "wrap", justifyContent: "center" }}>
            {entry.data?.sibling_group.map((s) => (
              <ChildChip key={s.student_id} name={s.student_name} sub={s.class_name} />
            ))}
          </Row>
        </>
      )}
    </Screen>
  );
}
