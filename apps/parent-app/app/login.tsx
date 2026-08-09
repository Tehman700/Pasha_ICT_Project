import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { MotiView } from "moti";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Field,
  Input,
  Row,
  Screen,
  Spacer,
  T,
  USING_MOCK,
  colors,
  motion,
  register as registerForPush,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";

export default function LoginScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings, locale, toggle } = useLocale();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => api.login({ phone: phone.trim(), password }),
    onSuccess: (res) => {
      // A teacher or guard signing in here would see a parent's screens. Role
      // comes from the account, never from a toggle on this screen. The mock
      // client has no real accounts, so the gate only applies to the live API.
      if (!USING_MOCK && res.user.role !== "parent" && res.user.role !== "driver") {
        setError(strings.errors.wrongAppParent);
        return;
      }
      // Ask for notification permission here, not at launch: Android only lets
      // you ask once, and a stranger on the login screen has no reason to say
      // yes. Fire and forget — a refusal must not hold up the sign-in.
      void registerForPush(api);
      router.replace("/");
    },
    onError: (err) => {
      const status = (err as { status?: number })?.status;
      setError(
        status === 401
          ? strings.errors.badCredentials
          : strings.errors.network,
      );
    },
  });

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
          {strings.auth.parentSubtitle}
        </T>
        <Spacer h={spacing.lg} />

        <Card>
          <Field label={strings.auth.phone}>
            <Input
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setError(null);
              }}
              placeholder="+92 333 1000001"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
          <Field label={strings.auth.password}>
            <Input
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              placeholder="••••••••"
              secureTextEntry
            />
          </Field>

          {error ? (
            <>
              <T variant="bodySm" color={colors.error}>
                {error}
              </T>
              <Spacer h={spacing.sm} />
            </>
          ) : null}

          <Button
            label={login.isPending ? strings.common.loading : strings.auth.signInCta}
            variant="primary"
            full
            // Only disabled while a sign-in is actually in flight. A button
            // that greys itself out because a field is empty gives the user
            // nothing to react to — the tap does nothing and no message
            // appears, which reads as a broken app rather than a missing
            // field. The registration screens validate on press for exactly
            // this reason; this one now matches them.
            disabled={login.isPending}
            onPress={() => {
              if (phone.trim() === "") {
                setError(strings.auth.phoneRequired);
                return;
              }
              if (password === "") {
                setError(strings.auth.passwordRequired);
                return;
              }
              setError(null);
              login.mutate();
            }}
          />
        </Card>

        <Spacer h={spacing.base} />
        <Row>
          <View style={{ flex: 1 }} />
          <T variant="bodySm" color={colors.muted}>
            {strings.register.noAccount}{" "}
          </T>
          <T
            variant="bodySm"
            color={colors.primary}
            onPress={() => router.push("/register")}
          >
            {strings.register.createAccount}
          </T>
          <View style={{ flex: 1 }} />
        </Row>

        <Spacer h={spacing.base} />
        <T variant="caption" color={colors.mutedSoft} align="center">
          {USING_MOCK
            ? strings.errors.usingSampleData
            : strings.errors.usingLiveSystem}
        </T>
      </MotiView>
    </Screen>
  );
}
