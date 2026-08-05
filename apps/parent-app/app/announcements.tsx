import { View } from "react-native";
import { MotiView } from "moti";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Card,
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
      <PageTitle title={strings.nav.announcements} />

      {list.isLoading ? (
        <Loading />
      ) : sent.length === 0 ? (
        <Empty message={strings.common.empty} />
      ) : (
        sent.map((a, i) => (
          <MotiView
            key={a.id}
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
                <Badge tone="neutral">{a.audience}</Badge>
                <View style={{ flex: 1 }} />
                <T variant="caption" color={colors.mutedSoft}>
                  {timeLabel(a.sent_at)}
                </T>
              </Row>
              <Spacer h={spacing.sm} />
              <T variant="titleMd" color={colors.ink}>
                {locale === "ur" ? a.title_ur : a.title_en}
              </T>
              <Spacer h={6} />
              <T variant="bodySm" color={colors.body}>
                {locale === "ur" ? a.body_ur : a.body_en}
              </T>
            </Card>
          </MotiView>
        ))
      )}
    </Screen>
  );
}
