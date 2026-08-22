import { View } from "react-native";
import { Row, Spacer, T, colors, spacing, useLocale, useMe, useMySchoolName } from "@pickup/ui-native";

/** Wordmark, and who is signed in. */
export function AppHeader() {
  const { strings } = useLocale();
  const me = useMe();
  const schoolName = useMySchoolName();

  return (
    <>
      <Row>
        <T variant="titleMd" color={colors.ink}>
          {strings.common.appName}
          <T variant="titleMd" color={colors.primary}>
            .
          </T>
        </T>
        <View style={{ flex: 1 }} />
      </Row>
      <Spacer h={spacing.xs} />
      <T variant="caption" color={colors.mutedSoft}>
        {[me.data?.name, schoolName].filter(Boolean).join(" · ")}
      </T>
      <Spacer h={spacing.lg} />
    </>
  );
}
