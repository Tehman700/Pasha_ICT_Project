import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  ChildChip,
  Empty,
  Loading,
  Row,
  Screen,
  Section,
  Spacer,
  StatusPill,
  T,
  colors,
  etaLabel,
  motion,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { StaffHeader } from "../../components/StaffHeader";

const MY_CLASS = "cls-nur";

/**
 * Live queue for this teacher's class only.
 *
 * Scoped deliberately: a teacher browsing every parent's position all day is
 * both a privacy failure and a demo liability. Ordered by live ETA.
 */
export default function TeacherQueueScreen() {
  const api = useApi();
  const { strings } = useLocale();

  const queue = useQuery({
    queryKey: ["queue", MY_CLASS],
    queryFn: () => api.getQueue(MY_CLASS),
  });

  return (
    <Screen>
      <StaffHeader role="teacher" back />

      {queue.isLoading ? (
        <Loading />
      ) : !queue.data?.length ? (
        <Empty message={strings.queue.noneInQueue} />
      ) : (
        <Section title={strings.queue.title}>
          {queue.data.map((e, i) => {
          const isVan = e.collector_role === "driver";
          // A van's trip spans classes; this teacher only stages their own.
          const mine = e.sibling_group.filter((s) => s.class_name === "Nursery");
          return (
            <MotiView
              key={e.pickup_request_id}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: motion.duration.reorder * 1000,
                delay: i * motion.stagger.list * 1000,
              }}
              style={{
                padding: spacing.base,
                borderBottomWidth: i === queue.data!.length - 1 ? 0 : 1,
                borderBottomColor: colors.hairlineSoft,
              }}
            >
              <Row align="flex-start">
                  <T variant="displaySm" color={colors.mutedSoft}>
                    {e.position}
                  </T>
                  <View style={{ flex: 1 }}>
                    <Row>
                      <T variant="titleSm" color={colors.ink} numberOfLines={1}>
                        {e.collector_name}
                      </T>
                      {isVan ? <Badge tone="primary">{strings.role.driver}</Badge> : null}
                    </Row>
                    <Spacer h={6} />
                    <Row gap={6} style={{ flexWrap: "wrap" }}>
                      {mine.map((s) => (
                        <ChildChip key={s.student_id} name={s.student_name} />
                      ))}
                    </Row>
                    {isVan && e.sibling_group.length > mine.length ? (
                      <>
                        <Spacer h={6} />
                        <T variant="caption" color={colors.mutedSoft}>
                          +{e.sibling_group.length - mine.length}{" "}
                          {strings.staff.inOtherClasses}
                        </T>
                      </>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <T variant="titleMd" color={colors.ink}>
                      {etaLabel(e.eta_seconds)}
                    </T>
                    <Spacer h={6} />
                    <StatusPill status={e.status} />
                  </View>
              </Row>
            </MotiView>
          );
          })}
        </Section>
      )}
    </Screen>
  );
}
