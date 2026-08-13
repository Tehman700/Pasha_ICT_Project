import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  ChildChip,
  Empty,
  HeroCard,
  ListRow,
  Loading,
  Row,
  Screen,
  Section,
  Spacer,
  StatusPill,
  T,
  colors,
  etaLabel,
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
          <HeroCard
            tone="primary"
            eyebrow={strings.parent.youArePosition}
            value={String(mine.data.position)}
            caption={`${strings.parent.estimatedHandover} · ${etaLabel(mine.data.eta_seconds)}`}
          />

          <Spacer h={spacing.lg} />

          <Section title={strings.parent.manifest}>
            <View style={{ padding: spacing.base }}>
              <Row gap={6} style={{ flexWrap: "wrap" }}>
                {mine.data.sibling_group.map((s) => (
                  <ChildChip key={s.student_id} name={s.student_name} sub={s.class_name} />
                ))}
              </Row>
            </View>
          </Section>

          <Spacer h={spacing.lg} />

          <Section title={strings.queue.title}>
            {(all.data ?? []).map((e, i, arr) => {
              const isMe = e.pickup_request_id === mine.data?.pickup_request_id;
              return (
                <ListRow
                  key={e.pickup_request_id}
                  title={isMe ? strings.queue.you : (e.collector_name ?? "—")}
                  subtitle={`#${e.position}`}
                  last={i === arr.length - 1}
                  trailing={
                    <Row gap={spacing.xs}>
                      {isMe ? <StatusPill status={e.status} /> : null}
                      <T
                        variant="caption"
                        color={isMe ? colors.primary : colors.muted}
                      >
                        {etaLabel(e.eta_seconds)}
                      </T>
                    </Row>
                  }
                />
              );
            })}
          </Section>

          <Spacer h={spacing.xl} />
        </>
      )}
    </Screen>
  );
}
