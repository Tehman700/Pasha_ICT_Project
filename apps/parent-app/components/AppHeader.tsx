import { View } from "react-native";
import { Row, Spacer, T, colors, spacing, useLocale } from "@pickup/ui-native";
import { fixtures } from "@pickup/shared";

/** Wordmark + language toggle. Urdu is one tap away on every screen. */
export function AppHeader() {
  const { strings } = useLocale();

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
        {fixtures.currentParent.name} · {fixtures.school.name}
      </T>
      <Spacer h={spacing.lg} />
    </>
  );
}
