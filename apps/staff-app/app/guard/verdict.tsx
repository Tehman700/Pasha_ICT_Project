import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, View } from "react-native";
import { MotiView } from "moti";
import { useMutation } from "@tanstack/react-query";
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
  useApi,
  useLocale,
} from "@pickup/ui-native";
import type { ScanResult } from "@pickup/shared";

const DEVICE_ID = "GATE-TAB-01";

/**
 * Scan verdict.
 *
 * Ink-inverted at large type because this is read in direct afternoon sun at a
 * school gate, where the cream canvas is unreadable.
 *
 * A green tick is NOT the handover. The guard sees the child's photo beside
 * the collector's and confirms with his own eyes. Software proposes; a person
 * decides — and that ordering is what stops a valid code releasing a child to
 * whoever is holding the phone.
 */
export default function VerdictScreen() {
  const { result: raw } = useLocalSearchParams<{ result?: string }>();
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [done, setDone] = useState<string[]>([]);

  let result: ScanResult | null = null;
  try {
    result = raw ? (JSON.parse(raw) as ScanResult) : null;
  } catch {
    result = null;
  }

  const handover = useMutation({
    mutationFn: (pickupRequestId: string) =>
      api.submitHandover({
        pickup_request_id: pickupRequestId,
        method: "qr",
        device_id: DEVICE_ID,
      }),
    onSuccess: (_data, id) => setDone((prev) => [...prev, id]),
  });

  const ok = result?.valid === true;
  const accent = ok ? colors.inverted.successOnInk : colors.inverted.errorOnInk;

  const children = result?.children ?? [];
  const allowed = children.filter((c) => c.authorized);
  const remaining = allowed.filter((c) => !done.includes(c.pickup_request_id));
  const complete = allowed.length > 0 && remaining.length === 0;

  return (
    <Screen inverted>
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: motion.duration.base * 1000 }}
      >
        <View style={{ alignItems: "center", paddingTop: spacing.base }}>
          <View
            style={{
              width: 84,
              height: 84,
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
          <Spacer h={spacing.sm} />
          <T variant="displayMd" color={accent} align="center">
            {ok ? strings.staff.verified : strings.staff.denied}
          </T>
          {!ok && result?.message ? (
            <>
              <Spacer h={spacing.xs} />
              <T variant="bodyMd" color={colors.inverted.textMuted} align="center">
                {result.message}
              </T>
            </>
          ) : null}
        </View>
      </MotiView>

      <Spacer h={spacing.lg} />

      {ok ? (
        <>
          {result?.collector ? (
            <Row gap={spacing.sm}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.pill,
                  backgroundColor: colors.inverted.hairline,
                  overflow: "hidden",
                }}
              >
                {result.collector.photo_url ? (
                  <Image
                    source={{ uri: result.collector.photo_url }}
                    style={{ width: 64, height: 64 }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <T variant="titleMd" color={colors.inverted.text}>
                  {result.collector.name}
                </T>
                <T variant="caption" color={colors.inverted.textMuted}>
                  {strings.role[result.collector.role]}
                </T>
              </View>
            </Row>
          ) : null}

          <Spacer h={spacing.base} />
          <T variant="captionUppercase" color={colors.inverted.textMuted}>
            {result?.confirm_visually ?? strings.staff.confirmVisually}
          </T>
          <Spacer h={spacing.sm} />

          {children.map((c) => {
            const isDone = done.includes(c.pickup_request_id);
            return (
              <View key={c.pickup_request_id} style={{ marginBottom: spacing.xs }}>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: !c.authorized
                      ? colors.inverted.errorOnInk
                      : isDone
                        ? colors.inverted.successOnInk
                        : colors.inverted.hairline,
                    borderRadius: radius.lg,
                    padding: spacing.base,
                    backgroundColor: isDone ? colors.inverted.canvasSoft : "transparent",
                  }}
                >
                  <Row>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radius.pill,
                        backgroundColor: colors.inverted.hairline,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <T variant="titleSm" color={colors.inverted.text}>
                        {c.student_name}
                      </T>
                      {/* A valid signature is not authorization. A token minted
                          before a parent revoked access is still perfect. */}
                      {!c.authorized ? (
                        <T variant="caption" color={colors.inverted.errorOnInk}>
                          {strings.staff.notAuthorized}
                        </T>
                      ) : (
                        <T variant="caption" color={colors.inverted.textMuted}>
                          {c.status}
                        </T>
                      )}
                    </View>
                    {c.authorized ? (
                      <Button
                        label={isDone ? `✓ ${strings.staff.handoverComplete}` : strings.common.confirm}
                        variant={isDone ? "ghost" : "primary"}
                        disabled={isDone || handover.isPending}
                        onPress={() => handover.mutate(c.pickup_request_id)}
                      />
                    ) : (
                      <Badge tone="error">refused</Badge>
                    )}
                  </Row>
                </View>
              </View>
            );
          })}

          {children.length > 1 ? (
            <>
              <Spacer h={spacing.xs} />
              <T variant="caption" color={colors.inverted.textMuted}>
                {remaining.length > 0
                  ? `${remaining.length} ${strings.staff.remaining}`
                  : strings.staff.tripCompletesNote}
              </T>
            </>
          ) : null}

          <Spacer h={spacing.lg} />
          <Button
            label={complete ? strings.staff.handoverComplete : strings.common.back}
            variant={complete ? "primary" : "ghost"}
            large
            full
            onPress={() => router.replace("/guard/scanner")}
          />
        </>
      ) : (
        <>
          <T variant="bodyMd" color={colors.inverted.textMuted} align="center">
            {result?.code === "not_yet_valid"
              ? strings.staff.oldCodeNote
              : strings.staff.deniedNote}
          </T>
          <Spacer h={spacing.lg} />
          <Button
            label={strings.staff.manualTitle}
            variant="primary"
            large
            full
            onPress={() => router.replace("/guard/manual")}
          />
          <Spacer h={spacing.xs} />
          <Button
            label={strings.common.back}
            variant="ghost"
            full
            onPress={() => router.replace("/guard/scanner")}
          />
        </>
      )}
    </Screen>
  );
}
