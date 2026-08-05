import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import {
  Button,
  Card,
  Field,
  Input,
  Label,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  motion,
  spacing,
  useLocale,
} from "@pickup/ui-native";

/**
 * Staff login.
 *
 * In production the role comes from `/users/me` after authentication and the
 * app routes accordingly — the user never picks. The role switch below exists
 * only so the skeleton can demonstrate both trees without a backend.
 */
export default function StaffLoginScreen() {
  const router = useRouter();
  const { strings, locale, toggle } = useLocale();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

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
        <T variant="bodySm" color={colors.body} onPress={toggle}>
          {locale === "en" ? "اردو" : "English"}
        </T>
      </Row>

      <Spacer h={spacing.xxl} />

      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: motion.duration.base * 1000 }}
      >
        <T variant="displaySm" color={colors.ink}>
          {strings.auth.signIn}
        </T>
        <Spacer h={spacing.xs} />
        <T variant="bodyMd" color={colors.muted}>
          Teachers and gate guards sign in here.
        </T>
        <Spacer h={spacing.lg} />

        <Card>
          <Field label={strings.auth.phone}>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="+92 300 4445566"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </Field>
          <Field label={strings.auth.password}>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </Field>
        </Card>

        <Spacer h={spacing.lg} />
        <Label>Skeleton only — pick a role to continue</Label>
        <Spacer h={spacing.sm} />
        <Row gap={spacing.xs}>
          <Button
            label={strings.role.teacher}
            variant="primary"
            onPress={() => router.replace("/teacher")}
          />
          <Button
            label={strings.role.guard}
            variant="ink"
            onPress={() => router.replace("/guard/scanner")}
          />
        </Row>
        <Spacer h={spacing.sm} />
        <T variant="caption" color={colors.mutedSoft}>
          In the real app the role comes from your account — a guard never sees
          teacher screens and a teacher never sees the scanner.
        </T>
      </MotiView>
    </Screen>
  );
}
