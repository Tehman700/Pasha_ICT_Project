import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Empty,
  Label,
  Loading,
  Row,
  Screen,
  Spacer,
  StatusPill,
  T,
  colors,
  motion,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { fixtures } from "@pickup/shared";
import { StaffHeader } from "../../components/StaffHeader";

const MY_CLASS = "cls-nur";

/**
 * Teacher prep list.
 *
 * Built from today's BOOKINGS, so the teacher knows in advance who to expect.
 * This is not the queue — queue order comes from live ETA and is on the queue
 * screen. Confusing the two is the mistake the whole design avoids.
 *
 * Arrival alerts now come from the classroom display speaking aloud, not from
 * a push notification.
 */
export default function TeacherPrepScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [staged, setStaged] = useState<string[]>([]);

  const prep = useQuery({
    queryKey: ["prepList", MY_CLASS],
    queryFn: () => api.getPrepList(MY_CLASS),
  });

  const cls = fixtures.classes.find((c) => c.id === MY_CLASS);
  const device = fixtures.devices.find((d) => d.class_id === MY_CLASS);

  return (
    <Screen>
      <StaffHeader role="teacher" />

      <Row>
        <View style={{ flex: 1 }}>
          <T variant="displaySm" color={colors.ink}>
            {cls?.name}
          </T>
        </View>
        <Badge tone={device?.online ? "success" : "error"}>
          {device?.online ? strings.common.online : strings.common.offline}
        </Badge>
      </Row>

      {!device?.online ? (
        <>
          <Spacer h={spacing.sm} />
          <Card accent="error">
            <T variant="bodySm" color={colors.body}>
              {strings.devices.offlineWarning}. Watch this screen — no voice
              announcement will play in your room.
            </T>
          </Card>
        </>
      ) : null}

      <Spacer h={spacing.lg} />
      <Label>{strings.staff.prepList}</Label>
      <Spacer h={6} />
      <T variant="caption" color={colors.muted}>
        {strings.staff.prepListNote}
      </T>
      <Spacer h={spacing.base} />

      {prep.isLoading ? (
        <Loading />
      ) : !prep.data?.length ? (
        <Empty message={strings.common.empty} />
      ) : (
        prep.data.map((r, i) => {
          const isStaged = staged.includes(r.id) || r.status === "AT_GATE";
          return (
            <MotiView
              key={r.id}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: motion.duration.base * 1000,
                delay: i * motion.stagger.list * 1000,
              }}
              style={{ marginBottom: spacing.sm }}
            >
              <Card accent={r.status === "NEARBY" ? "primary" : "none"}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T variant="titleMd" color={colors.ink}>
                      {r.student_name}
                    </T>
                    <Spacer h={4} />
                    <T variant="caption" color={colors.muted} numberOfLines={1}>
                      {r.scheduled_time} · {r.collector_name}
                    </T>
                  </View>
                  <StatusPill status={r.status} />
                </Row>

                <Spacer h={spacing.sm} />
                <Button
                  label={isStaged ? `✓ ${strings.staff.staged}` : strings.staff.markStaged}
                  variant={isStaged ? "ink" : "secondary"}
                  full
                  onPress={() =>
                    setStaged((prev) =>
                      prev.includes(r.id)
                        ? prev.filter((x) => x !== r.id)
                        : [...prev, r.id],
                    )
                  }
                />
              </Card>
            </MotiView>
          );
        })
      )}

      <Spacer h={spacing.base} />
      <Button
        label={strings.queue.title}
        variant="primary"
        full
        onPress={() => router.push("/teacher/queue")}
      />
    </Screen>
  );
}
