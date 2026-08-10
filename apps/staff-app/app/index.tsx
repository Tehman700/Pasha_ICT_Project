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
import { PHONE_PLACEHOLDER, normalisePhone } from "@pickup/shared";

/**
 * Staff login.
 *
 * One app, two roles — and the role comes from `/users/me`, never from a
 * toggle on this screen. A device flag would mean a guard's phone could be
 * flipped to teacher mode and read every class roster.
 */
export default function StaffLoginScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings, locale, toggle } = useLocale();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => api.login({ phone: normalisePhone(phone), password }),
    onSuccess: (res) => {
      const role = res.user.role;
      // Staff get no pickup notifications — voice replaces the teacher push
      // entirely. This registers the device anyway so an admin broadcast has
      // somewhere to land, and so the token is fresh if that ever ships.
      void registerForPush(api);
      if (USING_MOCK) return router.replace("/teacher");
      if (role === "teacher") return router.replace("/teacher");
      if (role === "guard" || role === "admin") return router.replace("/guard/scanner");
      setError(strings.errors.wrongAppStaff);
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
          {strings.auth.staffSubtitle}
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
              placeholder={PHONE_PLACEHOLDER}
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
            // See the note in the parent app's login screen: a button that
            // disables itself on an empty field gives a guard at the gate a
            // dead tap and no explanation.
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

        {USING_MOCK ? (
          <>
            <Spacer h={spacing.lg} />
            <T variant="caption" color={colors.mutedSoft}>
              {strings.errors.usingSampleData}
            </T>
            <Spacer h={spacing.sm} />
            <Row gap={spacing.xs}>
              <Button
                label={strings.role.teacher}
                onPress={() => router.replace("/teacher")}
              />
              <Button
                label={strings.role.guard}
                onPress={() => router.replace("/guard/scanner")}
              />
            </Row>
          </>
        ) : null}
      </MotiView>
    </Screen>
  );
}
