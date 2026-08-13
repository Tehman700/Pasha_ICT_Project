import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  ChildChip,
  Empty,
  Loading,
  Row,
  Screen,
  Section,
  Spacer,
  T,
  colors,
  motion,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../../../components/ScreenHeader";

/**
 * Who can collect my children.
 *
 * The parent is the head of the account. Everyone listed here collects only
 * THIS parent's children — revoking a driver has no effect on any other
 * family's authorization of the same driver.
 */
export default function CollectorsScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();

  const collectors = useQuery({
    queryKey: ["myCollectors"],
    queryFn: () => api.getMyCollectors(),
  });

  const active = collectors.data?.filter((a) => !a.revoked_at) ?? [];

  // One block per person, listing every child they may collect.
  const byCollector = new Map<string, typeof active>();
  for (const a of active) {
    const list = byCollector.get(a.collector_user_id) ?? [];
    list.push(a);
    byCollector.set(a.collector_user_id, list);
  }

  const entries = [...byCollector.entries()];

  return (
    <Screen>
      <ScreenHeader title={strings.parent.myCollectors} />

      {collectors.isLoading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <Empty message={strings.common.empty} />
      ) : (
        <Section title={strings.parent.myCollectors}>
          {entries.map(([id, grants], i) => {
            const first = grants[0]!;
            const isDriver = first.collector_role === "driver";
            return (
              <MotiView
                key={id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "timing",
                  duration: motion.duration.base * 1000,
                  delay: i * motion.stagger.card * 1000,
                }}
                style={{
                  padding: spacing.base,
                  borderBottomWidth: i === entries.length - 1 ? 0 : 1,
                  borderBottomColor: colors.hairlineSoft,
                }}
              >
                <Row>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyMd" color={colors.ink}>
                      {first.collector_name}
                    </T>
                    <T variant="caption" color={colors.muted}>
                      {first.kind === "one_time"
                        ? strings.parent.oneTimePass
                        : strings.parent.standingAccess}
                    </T>
                  </View>
                  <Badge tone={isDriver ? "primary" : "neutral"}>
                    {isDriver ? strings.role.driver : strings.parent.relative}
                  </Badge>
                </Row>

                <Spacer h={spacing.sm} />
                <Row gap={6} style={{ flexWrap: "wrap" }}>
                  {grants.map((g) => (
                    <ChildChip key={g.id} name={g.student_name ?? ""} />
                  ))}
                </Row>

                <Spacer h={spacing.sm} />
                <Row gap={spacing.xs}>
                  <Button
                    label={strings.common.edit}
                    onPress={() => router.push(`/collectors/${id}`)}
                  />
                  <Button label={strings.parent.revokeAccess} variant="danger" />
                </Row>
              </MotiView>
            );
          })}
        </Section>
      )}

      <Spacer h={spacing.lg} />
      <Button
        label={strings.parent.addCollector}
        variant="primary"
        icon="plus"
        full
        onPress={() => router.push("/collectors/add")}
      />
      <Spacer h={spacing.xl} />
    </Screen>
  );
}
