/**
 * Who are you? — the fork between the two registration paths.
 *
 * The paths are asymmetric on purpose, and the copy on this screen has to
 * carry that. A parent is matched to children the school already enrolled. A
 * driver is matched to nobody: he registers, and then waits for a parent to
 * choose him. Saying "the school is not involved" here sets the expectation
 * before he fills anything in, rather than leaving him to wonder on the
 * results screen why no children appeared.
 */

import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { MotiView } from "moti";
import {
  Card,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  motion,
  spacing,
  useLocale,
} from "@pickup/ui-native";

export default function ChooseRoleScreen() {
  const router = useRouter();
  const { strings } = useLocale();

  return (
    <Screen>
      <Row>
        <T variant="titleMd" color={colors.ink}>
          {strings.common.appName}
          <T variant="titleMd" color={colors.primary}>
            .
          </T>
        </T>
        <View style={{ flex: 1 }} />
      </Row>

      <Spacer h={spacing.xxl} />

      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: motion.duration.base * 1000 }}
      >
        <T variant="displaySm" color={colors.ink}>
          {strings.register.chooseRole}
        </T>
        <Spacer h={spacing.lg} />

        {/* Whole card is the target, not a small link inside it — these are
            the only two actions on the screen, and a driver reading this in
            sunlight at a school gate should not have to aim. */}
        <Pressable onPress={() => router.push("/register/parent")}>
          <Card>
            <T variant="titleSm" color={colors.ink}>
              {strings.register.iAmParent}
            </T>
            <Spacer h={spacing.xxs} />
            <T variant="bodySm" color={colors.muted}>
              {strings.register.iAmParentHint}
            </T>
          </Card>
        </Pressable>

        <Spacer h={spacing.sm} />

        <Pressable onPress={() => router.push("/register/driver")}>
          <Card>
            <T variant="titleSm" color={colors.ink}>
              {strings.register.iAmDriver}
            </T>
            <Spacer h={spacing.xxs} />
            <T variant="bodySm" color={colors.muted}>
              {strings.register.iAmDriverHint}
            </T>
          </Card>
        </Pressable>

        <Spacer h={spacing.lg} />

        <Row>
          <View style={{ flex: 1 }} />
          <T variant="bodySm" color={colors.muted}>
            {strings.register.haveAccount}{" "}
          </T>
          <T
            variant="bodySm"
            color={colors.primary}
            onPress={() => router.replace("/login")}
          >
            {strings.auth.signIn}
          </T>
          <View style={{ flex: 1 }} />
        </Row>
      </MotiView>
    </Screen>
  );
}
