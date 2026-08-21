import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Loading,
  PageTitle,
  Row,
  Screen,
  Section,
  Spacer,
  T,
  WEEKDAYS,
  WEEKDAYS_UR,
  colors,
  radius,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../components/ScreenHeader";

/**
 * Weekly recurring schedule.
 *
 * Set once — a nightly job generates each day's pickup request. Parents only
 * open the app to make an exception. Requiring a booking every evening is the
 * friction that kills adoption.
 *
 * The per-weekday collector column gives "van Monday–Thursday, father Friday"
 * with no extra structure.
 */
export default function ScheduleScreen() {
  const api = useApi();
  const { strings, locale } = useLocale();

  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });
  const schedules = useQuery({ queryKey: ["mySchedules"], queryFn: () => api.getMySchedules() });
  const collectors = useQuery({
    queryKey: ["myCollectors"],
    queryFn: () => api.getMyCollectors(),
  });

  const days = WEEKDAYS;

  function collectorName(id: string): string {
    const auth = collectors.data?.find((a) => a.collector_user_id === id);
    if (auth?.collector_name) return auth.collector_name;
    return strings.queue.you;
  }

  return (
    <Screen>
      <ScreenHeader title={strings.parent.mySchedule} />
      <PageTitle title={strings.parent.mySchedule} subtitle={strings.parent.scheduleNote} />

      {children.isLoading || schedules.isLoading ? (
        <Loading />
      ) : (
        children.data?.map((child) => {
          const mine = schedules.data?.filter((s) => s.student_id === child.id) ?? [];
          return (
            <View key={child.id} style={{ marginBottom: spacing.lg }}>
              <Row>
                <T variant="titleMd" color={colors.ink}>
                  {child.name}
                </T>
                <View style={{ flex: 1 }} />
                <Badge tone="neutral">{child.class_name}</Badge>
              </Row>
              <Spacer h={spacing.sm} />

              {/* class_name is optional on the wire; the child's name is
                  already shown above, so an absent class just drops the
                  qualifier rather than rendering "undefined". */}
              <Section title={child.class_name ?? child.name}>
                {mine.map((s, i) => (
                  <View key={s.id}>
                    <Row>
                      <View
                        style={{
                          width: 52,
                          paddingVertical: 6,
                          borderRadius: radius.sm,
                          backgroundColor: colors.surfaceStrong,
                          alignItems: "center",
                        }}
                      >
                        <T variant="caption" color={colors.ink}>
                          {days[s.weekday]}
                        </T>
                      </View>
                      <T variant="bodySm" color={colors.ink}>
                        {s.pickup_time}
                      </T>
                      <View style={{ flex: 1 }} />
                      <T variant="caption" color={colors.muted} numberOfLines={1}>
                        {collectorName(s.collector_id)}
                      </T>
                    </Row>
                    {i < mine.length - 1 ? <Spacer h={spacing.sm} /> : null}
                  </View>
                ))}
              </Section>
            </View>
          );
        })
      )}

      <Section title={strings.parent.scheduleNoteTitle}>
        <View style={{ padding: spacing.base }}>
          <T variant="caption" color={colors.muted}>
            {strings.parent.scheduleNoteBody}
          </T>
        </View>
      </Section>
      <Spacer h={spacing.xl} />
    </Screen>
  );
}
