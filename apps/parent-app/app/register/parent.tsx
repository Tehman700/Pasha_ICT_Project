/**
 * Parent self-registration.
 *
 * The CNIC is the whole design. The school already enrolled the children and
 * recorded a guardian's CNIC against each; typing the same number here is what
 * links the account. Name matching was rejected deliberately — two "Muhammad
 * Ali" guardians in a 300-student school is a false positive that hands one
 * man another man's children. See `backend/app/routers/registration.py`.
 *
 * The screen's hardest job is the ZERO-MATCH case, which is normal rather than
 * exceptional: the school may hold the other parent's number. The account is
 * created either way and the copy says so, because a screen that reads like a
 * failure sends a parent back to re-type a CNIC that was correct all along.
 */

import { useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { MotiView } from "moti";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ParentRegistrationResult } from "@pickup/shared";
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
  useApi,
  useLocale,
} from "@pickup/ui-native";

/** Digits only — people type 42101-1234567-1 exactly as printed on the card. */
const digits = (v: string) => v.replace(/\D/g, "");

export default function ParentRegisterScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings, locale, toggle } = useLocale();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParentRegistrationResult | null>(null);

  // One school in this deployment, so it is chosen rather than asked about.
  // A multi-school build turns this into a picker; nothing else changes.
  // The PUBLIC list: this screen runs before any token exists, and the
  // authenticated `/schools` would 401 in a way that reads as a network fault.
  const schools = useQuery({
    queryKey: ["schools", "public"],
    queryFn: () => api.listSchoolsPublic(),
  });
  const school = schools.data?.[0];

  function validate(): string | null {
    if (name.trim().length < 2) return strings.register.nameShort;
    if (digits(cnic).length !== 13) return strings.register.cnicInvalid;
    if (password.length < 8) return strings.register.passwordShort;
    if (password !== confirm) return strings.register.passwordMismatch;
    if (!school) return strings.register.schoolRequired;
    return null;
  }

  const submit = useMutation({
    mutationFn: () =>
      api.registerParent({
        name: name.trim(),
        phone: phone.trim(),
        password,
        cnic: digits(cnic),
        school_id: school!.id,
        locale,
      }),
    onSuccess: setResult,
    onError: (err) => {
      const status = (err as { status?: number })?.status;
      setError(
        status === 409
          ? strings.register.phoneTaken
          : status === undefined
            ? strings.errors.network
            : strings.register.failed,
      );
    },
  });

  // ── Result ──────────────────────────────────────────────────────────
  if (result) {
    const matched = result.matched_children;
    const found = matched.length > 0;

    return (
      <Screen>
        <Spacer h={spacing.xxl} />
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: motion.duration.base * 1000 }}
        >
          <T variant="displaySm" color={colors.ink}>
            {found
              ? strings.register.foundChildren
              : strings.register.noMatchTitle}
          </T>
          <Spacer h={spacing.xs} />
          <T variant="bodyMd" color={colors.muted}>
            {found
              ? strings.register.foundChildrenBody
              : strings.register.noMatchBody}
          </T>
          <Spacer h={spacing.lg} />

          {found ? (
            <Card accent="success">
              {matched.map((child, i) => (
                <View key={child.id}>
                  {i > 0 ? <Spacer h={spacing.sm} /> : null}
                  <T variant="titleSm" color={colors.ink}>
                    {child.name}
                  </T>
                </View>
              ))}
            </Card>
          ) : null}

          <Spacer h={spacing.lg} />
          <Button
            label={strings.auth.signIn}
            variant="primary"
            full
            onPress={() => router.replace("/login")}
          />
        </MotiView>
      </Screen>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────
  return (
    <Screen>
      <Row>
        <T variant="bodySm" color={colors.body} onPress={() => router.back()}>
          ← {strings.common.back}
        </T>
        <View style={{ flex: 1 }} />
        <T variant="bodySm" color={colors.body} onPress={toggle}>
          {locale === "en" ? "اردو" : "English"}
        </T>
      </Row>

      <Spacer h={spacing.lg} />

      <ScrollView keyboardShouldPersistTaps="handled">
        <T variant="displaySm" color={colors.ink}>
          {strings.register.parentTitle}
        </T>
        <Spacer h={spacing.xs} />
        <T variant="bodySm" color={colors.muted}>
          {strings.register.parentIntro}
        </T>
        <Spacer h={spacing.lg} />

        <Card>
          <Field label={strings.register.fullName}>
            <Input
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError(null);
              }}
              placeholder="Tariq Raza"
              autoCapitalize="words"
            />
          </Field>

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

          <Field label={strings.register.cnic} hint={strings.register.cnicHint}>
            <Input
              value={cnic}
              onChangeText={(v) => {
                setCnic(v);
                setError(null);
              }}
              placeholder="42101-1234567-1"
              keyboardType="number-pad"
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

          <Field label={strings.register.confirmPassword}>
            <Input
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
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
            label={
              submit.isPending
                ? strings.register.submitting
                : strings.register.submit
            }
            variant="primary"
            full
            disabled={submit.isPending || !school}
            onPress={() => {
              const invalid = validate();
              if (invalid) {
                setError(invalid);
                return;
              }
              setError(null);
              submit.mutate();
            }}
          />
        </Card>

        <Spacer h={spacing.xxl} />
      </ScrollView>
    </Screen>
  );
}
