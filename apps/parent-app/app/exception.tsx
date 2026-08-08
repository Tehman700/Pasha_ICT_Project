import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
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
import { ScreenHeader } from "../components/ScreenHeader";

type Choice = "absent" | "time" | "collector" | null;

/**
 * Today's exception.
 *
 * The only reason a parent needs to open the app on an ordinary day — the
 * recurring schedule covers everything else.
 */
export default function ExceptionScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const [childId, setChildId] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice>(null);

  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });
  const collectors = useQuery({
    queryKey: ["myCollectors"],
    queryFn: () => api.getMyCollectors(),
  });

  const selected = childId ?? children.data?.[0]?.id ?? null;

  return (
    <Screen>
      <ScreenHeader title={strings.parent.exception} />
      <PageTitle
        title={strings.parent.exception}
        subtitle={strings.parent.todayOnlyNote}
      />

      {children.isLoading ? (
        <Loading />
      ) : (
        <>
          <Row gap={spacing.xs} style={{ flexWrap: "wrap" }}>
            {children.data?.map((c) => (
              <Button
                key={c.id}
                label={c.name}
                variant={selected === c.id ? "ink" : "secondary"}
                onPress={() => setChildId(c.id)}
              />
            ))}
          </Row>

          <Spacer h={spacing.lg} />

          <Card>
            {(
              [
                ["absent", strings.parent.absentToday],
                ["time", strings.parent.changeTime],
                ["collector", strings.parent.differentCollector],
              ] as const
            ).map(([key, label], i) => (
              <View key={key}>
                <Row>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: choice === key ? 6 : 1,
                      borderColor: choice === key ? colors.primary : colors.hairlineStrong,
                    }}
                  />
                  <T
                    variant="bodyMd"
                    color={colors.ink}
                    onPress={() => setChoice(key as Choice)}
                  >
                    {label}
                  </T>
                </Row>
                {i < 2 ? <Spacer h={spacing.base} /> : null}
              </View>
            ))}
          </Card>

          {choice === "collector" ? (
            <>
              <Spacer h={spacing.base} />
              <Card>
                <T variant="caption" color={colors.muted}>
                  {strings.parent.whoIsCollecting}
                </T>
                <Spacer h={spacing.sm} />
                <Row gap={spacing.xs} style={{ flexWrap: "wrap" }}>
                  {collectors.data
                    ?.filter((a) => !a.revoked_at)
                    .map((a) => (
                      <Button key={a.id} label={a.collector_name ?? ""} />
                    ))}
                </Row>
                <Spacer h={spacing.sm} />
                <T variant="caption" color={colors.mutedSoft}>
                  Only people you have already authorized appear here.
                </T>
              </Card>
            </>
          ) : null}

          <Spacer h={spacing.lg} />
          <Button
            label={strings.common.save}
            variant="primary"
            full
            disabled={!choice}
            onPress={() => router.back()}
          />
        </>
      )}
    </Screen>
  );
}
