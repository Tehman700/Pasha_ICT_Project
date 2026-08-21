import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
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
  timeLabel,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../components/ScreenHeader";

/**
 * School announcements.
 *
 * Each record carries both languages, so the parent sees whichever they read.
 * There is no "translate later" path — that would show a parent who reads only
 * Urdu an empty message.
 *
 * These stay as full-width bodies rather than ListRows: an announcement is
 * something to read, not a row to tap through to somewhere else.
 */
export default function AnnouncementsScreen() {
  const api = useApi();
  const { strings, locale } = useLocale();

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.listAnnouncements(),
  });

  const sent = list.data?.filter((a) => a.sent_at) ?? [];

  return (
    <Screen>
      <ScreenHeader title={strings.nav.announcements} />

      {list.isLoading ? (
        <Loading />
      ) : sent.length === 0 ? (
        <Empty message={strings.common.empty} />
      ) : (
        <Section title={strings.nav.announcements}>
          {sent.map((a, i) => (
            <MotiView
              key={a.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: motion.duration.base * 1000,
                delay: i * motion.stagger.card * 1000,
              }}
              style={{
                padding: spacing.base,
                borderBottomWidth: i === sent.length - 1 ? 0 : 1,
                borderBottomColor: colors.hairlineSoft,
              }}
            >
              <Row>
                <Badge tone="neutral">{a.audience}</Badge>
                <View style={{ flex: 1 }} />
                <T variant="caption" color={colors.mutedSoft}>
                  {timeLabel(a.sent_at)}
                </T>
              </Row>
              <Spacer h={spacing.sm} />
              <T variant="titleMd" color={colors.ink}>
                {a.title_en}
              </T>
              <Spacer h={6} />
              <T variant="bodySm" color={colors.body}>
                {a.body_en}
              </T>
            </MotiView>
          ))}
        </Section>
      )}

      <Spacer h={spacing.xl} />
    </Screen>
  );
}
