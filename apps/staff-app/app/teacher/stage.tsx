import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Divider,
  Label,
  Loading,
  PageTitle,
  Row,
  Screen,
  Spacer,
  StatusPill,
  T,
  colors,
  etaLabel,
  motion,
  radius,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { StaffHeader } from "../../components/StaffHeader";

const MY_CLASS = "cls-nur";

/**
 * Staging — bring the named children to the gate.
 *
 * A van arriving stages several children at once, often across classes. This
 * screen shows only this teacher's share, but names the trip so the teacher
 * understands why three children are called together.
 */
export default function StageScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [done, setDone] = useState<string[]>([]);

  const queue = useQuery({
    queryKey: ["queue", MY_CLASS],
    queryFn: () => api.getQueue(MY_CLASS),
  });

  // The trip closest to arriving is the one that needs staging now.
  const next = queue.data
    ?.filter((e) => e.status === "NEARBY" || e.status === "AT_GATE")
    .sort((a, b) => (a.eta_seconds ?? 0) - (b.eta_seconds ?? 0))[0];

  const mine = next?.sibling_group.filter((s) => s.class_name === "Nursery") ?? [];
  const allDone = mine.length > 0 && mine.every((s) => done.includes(s.student_id));

  return (
    <Screen>
      <StaffHeader role="teacher" back />

      {queue.isLoading ? (
        <Loading />
      ) : !next ? (
        <PageTitle title={strings.display.waiting} subtitle={strings.queue.noneInQueue} />
      ) : (
        <>
          <PageTitle
            title={strings.staff.prepList}
            subtitle={`${next.collector_name} · ${etaLabel(next.eta_seconds)}`}
          />

          <Row>
            <StatusPill status={next.status} />
            {next.collector_role === "driver" ? (
              <Badge tone="primary">{strings.role.driver}</Badge>
            ) : null}
          </Row>

          <Divider />

          {mine.map((s, i) => {
            const isDone = done.includes(s.student_id);
            return (
              <MotiView
                key={s.student_id}
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: "timing",
                  duration: motion.duration.base * 1000,
                  delay: i * motion.stagger.list * 1000,
                }}
                style={{ marginBottom: spacing.sm }}
              >
                <Card accent={isDone ? "success" : "none"}>
                  <Row>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: radius.pill,
                        borderWidth: isDone ? 0 : 1,
                        borderColor: colors.hairlineStrong,
                        backgroundColor: isDone ? colors.success : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isDone ? (
                        <T variant="caption" color={colors.onPrimary}>
                          ✓
                        </T>
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <T variant="titleMd" color={isDone ? colors.muted : colors.ink}>
                        {s.student_name}
                      </T>
                    </View>
                    <Button
                      label={isDone ? strings.staff.staged : strings.staff.markStaged}
                      variant={isDone ? "ghost" : "primary"}
                      onPress={() =>
                        setDone((prev) =>
                          prev.includes(s.student_id)
                            ? prev.filter((x) => x !== s.student_id)
                            : [...prev, s.student_id],
                        )
                      }
                    />
                  </Row>
                </Card>
              </MotiView>
            );
          })}

          {next.sibling_group.length > mine.length ? (
            <>
              <Spacer h={spacing.xs} />
              <T variant="caption" color={colors.mutedSoft}>
                {next.sibling_group.length - mine.length} more children on this
                trip are being brought by other classes.
              </T>
            </>
          ) : null}

          <Spacer h={spacing.lg} />
          <Button
            label={allDone ? strings.common.confirm : `${mine.length - done.length} ${strings.staff.remaining}`}
            variant={allDone ? "primary" : "secondary"}
            large
            full
            disabled={!allDone}
            onPress={() => router.back()}
          />
        </>
      )}
    </Screen>
  );
}
