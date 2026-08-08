import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
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
  T,
  colors,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../../components/ScreenHeader";

/**
 * One collector's per-child access.
 *
 * Toggling a child off revokes that single authorization. It does not touch
 * this collector's access to any other family's children.
 */
export default function CollectorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();

  const collectors = useQuery({
    queryKey: ["myCollectors"],
    queryFn: () => api.getMyCollectors(),
  });
  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });

  const grants = collectors.data?.filter((a) => a.collector_user_id === id) ?? [];
  const first = grants[0];
  const [granted, setGranted] = useState<string[] | null>(null);

  const current =
    granted ?? grants.filter((g) => !g.revoked_at).map((g) => g.student_id);

  function toggle(studentId: string) {
    setGranted(
      current.includes(studentId)
        ? current.filter((s) => s !== studentId)
        : [...current, studentId],
    );
  }

  if (collectors.isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={first?.collector_name} />
      <PageTitle
        title={first?.collector_name ?? "—"}
        subtitle={
          first?.collector_role === "driver"
            ? strings.parent.vettedDriver
            : strings.parent.addedByYou
        }
      />

      <Row>
        <Badge tone={first?.collector_role === "driver" ? "primary" : "neutral"}>
          {first?.collector_role === "driver" ? strings.role.driver : "Relative"}
        </Badge>
        <Badge tone="neutral">
          {first?.kind === "one_time" ? "One-time" : "Standing"}
        </Badge>
      </Row>

      <Divider />

      <Label>{strings.parent.whichChildren}</Label>
      <Spacer h={spacing.sm} />

      {children.data?.map((c) => {
        const on = current.includes(c.id);
        return (
          <View key={c.id} style={{ marginBottom: spacing.xs }}>
            <Card accent={on ? "none" : "none"}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T variant="bodyMd" color={on ? colors.ink : colors.mutedSoft}>
                    {c.name}
                  </T>
                  <Spacer h={2} />
                  <T variant="caption" color={colors.muted}>
                    {c.class_name}
                  </T>
                </View>
                <Button
                  label={on ? strings.parent.revokeAccess : strings.common.add}
                  variant={on ? "danger" : "secondary"}
                  onPress={() => toggle(c.id)}
                />
              </Row>
            </Card>
          </View>
        );
      })}

      <Spacer h={spacing.base} />
      <T variant="caption" color={colors.mutedSoft}>
        Changes take effect from the next pickup. Every change is recorded in
        the school&apos;s audit log.
      </T>

      <Spacer h={spacing.lg} />
      <Button label={strings.common.save} variant="primary" full onPress={() => router.back()} />
    </Screen>
  );
}
