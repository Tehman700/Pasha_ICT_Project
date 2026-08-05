import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  ChildChip,
  Empty,
  Label,
  Loading,
  Row,
  Screen,
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
import { ScreenHeader } from "../components/ScreenHeader";

/**
 * Your place in the queue.
 *
 * Position comes from live ETA among everyone currently EN_ROUTE or NEARBY —
 * not from booking time. Arriving late simply means a later position; there is
 * no penalty rule to explain to anyone.
 */
export default function QueueScreen() {
  const api = useApi();
  const { strings } = useLocale();

  const mine = useQuery({ queryKey: ["myQueueEntry"], queryFn: () => api.getMyQueueEntry() });
  const all = useQuery({ queryKey: ["queue"], queryFn: () => api.getQueue() });

  return (
    <Screen>
      <ScreenHeader title={strings.parent.queuePosition} />

      {mine.isLoading ? (
        <Loading />
      ) : !mine.data ? (
        <Empty message={strings.queue.noneInQueue} />
      ) : (
        <>
          <MotiView
            from={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: motion.duration.slow * 1000 }}
          >
            <T variant="bodySm" color={colors.muted} align="center">
              {strings.parent.youArePosition}
            </T>
            <Spacer h={spacing.xs} />
            <T variant="displayMega" color={colors.ink} align="center">
              {mine.data.position}
            </T>
            <Spacer h={spacing.xs} />
            <View style={{ alignItems: "center" }}>
              <StatusPill status={mine.data.status} />
            </View>
            <Spacer h={spacing.sm} />
            <T variant="bodyMd" color={colors.muted} align="center">
              {strings.parent.estimatedHandover} · {etaLabel(mine.data.eta_seconds)}
            </T>
          </MotiView>

          <Spacer h={spacing.lg} />

          <Label>{strings.parent.manifest}</Label>
          <Spacer h={spacing.sm} />
          <Row gap={6} style={{ flexWrap: "wrap" }}>
            {mine.data.sibling_group.map((s) => (
              <ChildChip key={s.student_id} name={s.student_name} sub={s.class_name} />
            ))}
          </Row>

          <Spacer h={spacing.lg} />
          <Label>{strings.queue.title}</Label>
          <Spacer h={spacing.sm} />

          {all.data?.map((e, i) => {
            const isMe = e.pickup_request_id === mine.data?.pickup_request_id;
            return (
              <MotiView
                key={e.pickup_request_id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: isMe ? 1 : 0.55, translateY: 0 }}
                transition={{
                  type: "timing",
                  duration: motion.duration.reorder * 1000,
                  delay: i * motion.stagger.list * 1000,
                }}
                style={{ marginBottom: spacing.xs }}
              >
                <Card accent={isMe ? "primary" : "none"}>
                  <Row>
                    <T variant="titleMd" color={colors.mutedSoft}>
                      {e.position}
                    </T>
                    <View style={{ flex: 1 }}>
                      <T variant="bodySm" color={colors.ink} numberOfLines={1}>
                        {isMe ? "You" : e.collector_name}
                      </T>
                    </View>
                    <T variant="caption" color={colors.muted}>
                      {etaLabel(e.eta_seconds)}
                    </T>
                  </Row>
                </Card>
              </MotiView>
            );
          })}
        </>
      )}
    </Screen>
  );
}
