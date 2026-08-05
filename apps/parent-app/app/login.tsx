import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import {
  Button,
  Card,
  Field,
  Input,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  motion,
  spacing,
  useLocale,
} from "@pickup/ui-native";

export default function LoginScreen() {
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
          Parents, relatives and drivers all sign in here.
        </T>
        <Spacer h={spacing.lg} />

        <Card>
          <Field label={strings.auth.phone}>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="+92 333 1000001"
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
          <Spacer h={spacing.xs} />
          <Button
            label={strings.auth.signInCta}
            variant="primary"
            full
            onPress={() => router.replace("/")}
          />
        </Card>

        <Spacer h={spacing.base} />
        <T variant="caption" color={colors.mutedSoft} align="center">
          Skeleton build — any credentials continue.
        </T>
      </MotiView>
    </Screen>
  );
}
