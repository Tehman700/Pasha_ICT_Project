import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Field,
  Input,
  Loading,
  PageTitle,
  Row,
  Screen,
  Section,
  Spacer,
  T,
  WEEKDAYS,
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
  const qc = useQueryClient();
  const { strings } = useLocale();

  // One editor at a time, keyed by child. Seven inline editors open at once
  // would be a wall of controls on a phone.
  const [editing, setEditing] = useState<string | null>(null);
  const [collectorId, setCollectorId] = useState<string | null>(null);
  const [time, setTime] = useState("13:15");
  const [days, setDays] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);

  /**
   * One call per selected weekday. The endpoint upserts on
   * (student, weekday), so re-saving Tuesday edits it rather than colliding.
   *
   * Sequential rather than Promise.all: these write to one table on one row
   * per day, and a parent setting five days is not worth the risk of five
   * concurrent upserts racing the same unique constraint.
   */
  const save = useMutation({
    mutationFn: async (studentId: string) => {
      for (const weekday of days) {
        await api.setSchedule({
          student_id: studentId,
          collector_id: collectorId!,
          weekday,
          pickup_time: time,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mySchedules"] });
      setEditing(null);
      setDays([]);
      setNote(strings.parent.scheduleSaved);
    },
    onError: (err) =>
      setNote((err as { message?: string })?.message ?? strings.errors.network),
  });

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function openEditor(childId: string) {
    setEditing(childId);
    setNote(null);
    setDays([]);
    // Default to the parent themselves: the common case is a parent who
    // collects their own child, and it means one fewer decision.
    setCollectorId(collectors.data?.[0]?.collector_user_id ?? null);
  }

  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });
  const schedules = useQuery({ queryKey: ["mySchedules"], queryFn: () => api.getMySchedules() });
  const collectors = useQuery({
    queryKey: ["myCollectors"],
    queryFn: () => api.getMyCollectors(),
  });

  const dayNames = WEEKDAYS;

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
                          {dayNames[s.weekday]}
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

              <Spacer h={spacing.sm} />

              {editing === child.id ? (
                <Section title={strings.parent.setSchedule}>
                  <View style={{ padding: spacing.base }}>
                    <Field label={strings.parent.scheduleWho}>
                      <Row gap={spacing.xs} style={{ flexWrap: "wrap" }}>
                        {collectors.data?.map((a) => (
                          <Button
                            key={a.collector_user_id}
                            label={a.collector_name ?? strings.queue.you}
                            variant={
                              collectorId === a.collector_user_id ? "ink" : "secondary"
                            }
                            onPress={() => setCollectorId(a.collector_user_id)}
                          />
                        ))}
                      </Row>
                    </Field>

                    <Spacer h={spacing.sm} />
                    <Field label={strings.parent.scheduleWhen}>
                      <Input
                        value={time}
                        onChangeText={setTime}
                        placeholder="13:15"
                        keyboardType="numbers-and-punctuation"
                      />
                    </Field>

                    <Spacer h={spacing.sm} />
                    <Field label={strings.parent.scheduleDays}>
                      <Row gap={spacing.xs} style={{ flexWrap: "wrap" }}>
                        {dayNames.map((d, i) => (
                          <Button
                            key={d}
                            label={days.includes(i) ? `✓ ${d}` : d}
                            variant={days.includes(i) ? "ink" : "secondary"}
                            onPress={() => toggleDay(i)}
                          />
                        ))}
                      </Row>
                    </Field>

                    <Spacer h={spacing.sm} />
                    <T variant="caption" color={colors.mutedSoft}>
                      {strings.parent.scheduleTomorrow}
                    </T>

                    <Spacer h={spacing.base} />
                    <Button
                      label={save.isPending ? strings.common.loading : strings.common.save}
                      variant="primary"
                      full
                      disabled={!collectorId || days.length === 0 || save.isPending}
                      onPress={() => save.mutate(child.id)}
                    />
                  </View>
                </Section>
              ) : (
                <Button
                  label={strings.parent.setSchedule}
                  variant="secondary"
                  full
                  onPress={() => openEditor(child.id)}
                />
              )}
            </View>
          );
        })
      )}

      {note ? (
        <>
          <T variant="bodySm" color={colors.body}>
            {note}
          </T>
          <Spacer h={spacing.base} />
        </>
      ) : null}

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
