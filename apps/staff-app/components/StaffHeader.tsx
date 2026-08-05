import { useRouter } from "expo-router";
import { View } from "react-native";
import { Badge, Row, Spacer, T, colors, spacing, useLocale } from "@pickup/ui-native";
import { fixtures } from "@pickup/shared";

export function StaffHeader({
  role,
  back = false,
}: {
  role: "teacher" | "guard";
  back?: boolean;
}) {
  const router = useRouter();
  const { strings, locale, toggle, isRTL } = useLocale();
  const me = role === "teacher" ? fixtures.currentTeacher : fixtures.currentGuard;

  return (
    <>
      <Row>
        {back ? (
          <T variant="bodySm" color={colors.body} onPress={() => router.back()}>
            {isRTL ? "→" : "←"} {strings.common.back}
          </T>
        ) : (
          <T variant="titleMd" color={colors.ink}>
            {strings.common.appName}
            <T variant="titleMd" color={colors.primary}>
              .
            </T>
          </T>
        )}
        <View style={{ flex: 1 }} />
        <Badge tone="neutral">{strings.role[role]}</Badge>
        <T variant="bodySm" color={colors.body} onPress={toggle}>
          {locale === "en" ? "اردو" : "English"}
        </T>
      </Row>
      <Spacer h={spacing.xs} />
      <T variant="caption" color={colors.mutedSoft}>
        {me.name}
      </T>
      <Spacer h={spacing.lg} />
    </>
  );
}
