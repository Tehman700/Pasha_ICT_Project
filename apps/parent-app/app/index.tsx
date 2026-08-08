import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  ChildChip,
  Divider,
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
import { fixtures } from "@pickup/shared";
import { AppHeader } from "../components/AppHeader";

/**
 * Today's pickup — the parent's home screen.
 *
 * The same screen serves a driver: a driver simply has a longer, cross-family
 * manifest instead of their own two children. Role comes from `/users/me`.
 */
export default function TodayScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();

  const requests = useQuery({
    queryKey: ["myPickupRequests"],
    queryFn: () => api.getMyPickupRequests(),
  });
  const trip = useQuery({ queryKey: ["myTrip"], queryFn: () => api.getMyTrip() });
  const collectors = useQuery({
    queryKey: ["myCollectors"],
    queryFn: () => api.getMyCollectors(),
  });

  const today = requests.data ?? [];
  const activeTrip = trip.data && !trip.data.arrived_at ? trip.data : null;

  // Who is actually collecting today — often the van, not the parent.
  const todaysCollector = today[0]?.collector_name;
  const isVanToday = today[0]?.collector_id === fixtures.currentDriver.id;

  return (
    <Screen>
      <AppHeader />

      <T variant="displaySm" color={colors.ink}>
        {strings.parent.todayTitle}
      </T>
      <Spacer h={spacing.lg} />

      {requests.isLoading ? (
        <Loading />
      ) : today.length === 0 ? (
        <Empty message={strings.parent.noPickupsToday} />
      ) : (
        <>
          {activeTrip ? (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: motion.duration.base * 1000 }}
            >
              <Card accent="primary">
                <Row>
                  <Badge tone="primary">{strings.parent.tripActive}</Badge>
                  <View style={{ flex: 1 }} />
                  <T variant="titleMd" color={colors.ink}>
                    {etaLabel(activeTrip.eta_seconds)}
                  </T>
                </Row>
                <Spacer h={spacing.sm} />
                <T variant="bodySm" color={colors.muted}>
                  {todaysCollector} · {strings.queue.eta}
                </T>
                <Spacer h={spacing.base} />
                <Row gap={spacing.xs}>
                  <Button
                    label={strings.parent.queuePosition}
                    onPress={() => router.push("/queue")}
                  />
                  <Button
                    label={strings.parent.showQr}
                    variant="primary"
                    onPress={() => router.push("/qr")}
                  />
                </Row>
              </Card>
              <Spacer h={spacing.lg} />
            </MotiView>
          ) : null}

          <Label>{strings.parent.manifest}</Label>
          <Spacer h={spacing.xs} />

          {today.map((r, i) => (
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
              <Card>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T variant="titleMd" color={colors.ink}>
                      {r.student_name}
                    </T>
                    <Spacer h={4} />
                    <T variant="caption" color={colors.muted}>
                      {r.scheduled_time} · {r.collector_name}
                    </T>
                  </View>
                  <StatusPill status={r.status} />
                </Row>
              </Card>
            </MotiView>
          ))}

          {isVanToday ? (
            <>
              <Spacer h={spacing.xs} />
              <T variant="caption" color={colors.muted}>
                Both children travel together on one trip — the van only
                completes when every child has been handed over.
              </T>
            </>
          ) : null}
        </>
      )}

      <Divider />

      <Label>{strings.parent.quickActions}</Label>
      <Spacer h={spacing.sm} />
      <Row gap={spacing.xs} style={{ flexWrap: "wrap" }}>
        <Button label={strings.parent.mySchedule} onPress={() => router.push("/schedule")} />
        <Button label={strings.parent.exception} onPress={() => router.push("/exception")} />
        <Button
          label={`${strings.parent.myCollectors} (${collectors.data?.filter((c) => !c.revoked_at).length ?? 0})`}
          onPress={() => router.push("/collectors")}
        />
        <Button label={strings.nav.announcements} onPress={() => router.push("/announcements")} />
        <Button label={strings.parent.profile} onPress={() => router.push("/profile")} />
      </Row>

      {!activeTrip ? (
        <>
          <Spacer h={spacing.lg} />
          <Button
            label={strings.parent.onMyWay}
            variant="primary"
            large
            full
            onPress={() => router.push("/trip")}
          />
        </>
      ) : null}
    </Screen>
  );
}
