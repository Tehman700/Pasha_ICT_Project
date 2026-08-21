import { useRouter } from "expo-router";
import { View } from "react-native";
import { Row, Spacer, T, colors, spacing, useLocale } from "@pickup/ui-native";

/** Back affordance + language toggle for pushed screens. */
export function ScreenHeader({ title }: { title?: string }) {
  const router = useRouter();
  const { strings, isRTL } = useLocale();

  return (
    <>
      <Row>
        <T variant="bodySm" color={colors.body} onPress={() => router.back()}>
          {isRTL ? "→" : "←"} {strings.common.back}
        </T>
        <View style={{ flex: 1 }} />
        {title ? (
          <T variant="caption" color={colors.mutedSoft} numberOfLines={1}>
            {title}
          </T>
        ) : null}
        <View style={{ flex: 1 }} />
      </Row>
      <Spacer h={spacing.lg} />
    </>
  );
}
