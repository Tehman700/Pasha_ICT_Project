import { useRouter } from "expo-router";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  DashboardHeader,
  EmptyQueueScene,
  HeroCard,
  ListRow,
  Loading,
  Screen,
  Section,
  SetupRow,
  Spacer,
  StatusPill,
  T,
  Tile,
  TileGrid,
  colors,
  etaLabel,
  spacing,
  useApi,
  useLocale,
  useMe,
  useMySchoolName,
} from "@pickup/ui-native";
import { ParentWalkthrough } from "../../components/ParentWalkthrough";

/**
 * Today's pickup — the collector's home screen.
 *
 * The same screen serves a driver: a driver simply has a longer, cross-family
 * manifest instead of their own two children. Role comes from `/users/me`.
 *
 * The hero answers one question — what is happening today — and answers it
 * differently depending on state, rather than showing an empty shell plus a
 * separate banner. A live trip turns it orange, which is the only place on
 * this screen that colour is spent.
 */
export default function TodayScreen() {
  const me = useMe();
  const schoolName = useMySchoolName();
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const p = strings.parent;

  const requests = useQuery({
    queryKey: ["myPickupRequests"],
    queryFn: () => api.getMyChildrenPickups(),
  });
  const trip = useQuery({ queryKey: ["myTrip"], queryFn: () => api.getMyTrip() });
  const collectors = useQuery({
    queryKey: ["myCollectors"],
    queryFn: () => api.getMyCollectors(),
  });

  // PickupRequest carries IDs and nothing else - that is what the contract
  // says and what the API sends. This screen used to read r.student_name and
  // r.collector_name, which have never existed on the wire, so every row
  // rendered an em dash and the hero card read "Collected by: undefined".
  //
  // The names are resolved here from two lists the screen already loads, so
  // this costs no extra request.
  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });

  const childName = (id: string) =>
    children.data?.find((c) => c.id === id)?.name ?? "";
  const collectorName = (id: string) =>
    collectors.data?.find((a) => a.collector_user_id === id)?.collector_name ??
    // Not in the authorization list means the parent is collecting their own
    // child, which is the common case and needs no grant.
    (id === me.data?.id ? strings.queue.you : "");

  const today = requests.data ?? [];
  const activeTrip = trip.data && !trip.data.arrived_at ? trip.data : null;
  const first = today[0];
  const activeCollectors = collectors.data?.filter((c) => !c.revoked_at).length ?? 0;

  // Four things a new account needs before the system can actually work for
  // them. Counted rather than stored: a flag would drift out of sync with the
  // data it claims to describe.
  const setupDone =
    (today.length > 0 ? 1 : 0) +
    (activeCollectors > 0 ? 1 : 0) +
    (requests.data?.some((r) => r.scheduled_time) ? 1 : 0) +
    1; // account exists

  return (
    <Screen>
      <ParentWalkthrough />

      <DashboardHeader
        name={me.data?.name ?? ""}
        sub={schoolName}
        onProfile={() => router.push("/profile")}
      />
      <Spacer h={spacing.lg} />

      {requests.isLoading ? (
        <Loading />
      ) : (
        <>
          {activeTrip ? (
            <HeroCard
              tone="primary"
              eyebrow={p.tripActive}
              value={etaLabel(activeTrip.eta_seconds)}
              caption={[collectorName(first?.collector_id ?? ""), strings.queue.eta].filter(Boolean).join(" · ")}
              action={{ label: p.queuePosition, onPress: () => router.push("/queue") }}
            />
          ) : first ? (
            <HeroCard
              eyebrow={p.todayTitle}
              value={first.scheduled_time}
              caption={`${p.heroCollector}: ${collectorName(first.collector_id)}`}
              action={{ label: p.quickException, onPress: () => router.push("/exception") }}
            />
          ) : (
            <HeroCard
              eyebrow={p.todayTitle}
              value={p.heroNoPickup}
              caption={p.heroNoPickupCaption}
              action={{ label: p.quickSchedule, onPress: () => router.push("/schedule") }}
            />
          )}

          <Spacer h={spacing.lg} />

          <TileGrid>
            <Tile
              icon="qr"
              label={p.tabCode}
              value={activeTrip ? p.tripActive : undefined}
              accent={Boolean(activeTrip)}
              onPress={() => router.push("/qr")}
            />
            <Tile
              icon="car"
              label={p.quickTrip}
              value={activeTrip ? etaLabel(activeTrip.eta_seconds) : undefined}
              onPress={() => router.push("/trip")}
            />
            <Tile
              icon="people"
              label={p.tabPeople}
              value={String(activeCollectors)}
              onPress={() => router.push("/collectors")}
            />
            <Tile icon="calendar" label={p.quickSchedule} onPress={() => router.push("/schedule")} />
          </TileGrid>

          <SetupRow
            title={p.setupTitle}
            done={setupDone}
            total={4}
            onPress={() => router.push("/schedule")}
          />

          <Spacer h={spacing.lg} />

          {today.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.base }}>
              <EmptyQueueScene width={190} />
              <Spacer h={spacing.base} />
              <T variant="bodySm" color={colors.muted}>
                {p.noPickupsToday}
              </T>
            </View>
          ) : (
            <Section title={p.manifest}>
              {today.map((r, i) => (
                <ListRow
                  key={r.id}
                  title={childName(r.student_id) || "—"}
                  subtitle={[r.scheduled_time, collectorName(r.collector_id)]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={<StatusPill status={r.status} />}
                  last={i === today.length - 1}
                />
              ))}
            </Section>
          )}

          <Spacer h={spacing.lg} />

          <Section title={p.quickActions}>
            <ListRow
              icon="bell"
              title={strings.nav.announcements}
              onPress={() => router.push("/announcements")}
            />
            <ListRow
              icon="clock"
              title={p.exception}
              onPress={() => router.push("/exception")}
              last
            />
          </Section>

          <Spacer h={spacing.xl} />
        </>
      )}
    </Screen>
  );
}
