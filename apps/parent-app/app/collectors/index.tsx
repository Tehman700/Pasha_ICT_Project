import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  ChildChip,
  Empty,
  Loading,
  PageTitle,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  motion,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../../components/ScreenHeader";

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

  // One card per person, listing every child they may collect.
  const byCollector = new Map<string, typeof active>();
  for (const a of active) {
    const list = byCollector.get(a.collector_user_id) ?? [];
    list.push(a);
    byCollector.set(a.collector_user_id, list);
  }

  return (
    <Screen>
      <ScreenHeader title={strings.parent.myCollectors} />
      <PageTitle
        title={strings.parent.myCollectors}
        subtitle={strings.parent.collectorsNote}
      />

      {collectors.isLoading ? (
        <Loading />
      ) : byCollector.size === 0 ? (
        <Empty message={strings.common.empty} />
      ) : (
        [...byCollector.entries()].map(([id, grants], i) => {
          const first = grants[0]!;
          const isDriver = first.collector_role === "driver";
          return (
            <MotiView
              key={id}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: motion.duration.base * 1000,
                delay: i * motion.stagger.card * 1000,
              }}
              style={{ marginBottom: spacing.sm }}
            >
              <Card>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T variant="titleMd" color={colors.ink}>
                      {first.collector_name}
                    </T>
                    <Spacer h={4} />
                    <T variant="caption" color={colors.muted}>
                      {first.kind === "one_time" ? "One-time pass" : "Standing access"}
                    </T>
                  </View>
                  <Badge tone={isDriver ? "primary" : "neutral"}>
                    {isDriver ? strings.role.driver : "Relative"}
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
              </Card>
            </MotiView>
          );
        })
      )}

      <Spacer h={spacing.base} />
      <Button
        label={strings.parent.addCollector}
        variant="primary"
        full
        onPress={() => router.push("/collectors/add")}
      />
    </Screen>
  );
}
