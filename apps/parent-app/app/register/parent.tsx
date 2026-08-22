/**
 * Parent self-registration, one question per screen.
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
 *
 * Stepping matters most here. On one form, a rejected CNIC scrolls away from
 * the field that caused it while four other filled fields stay on screen —
 * the parent re-reads all five trying to find the problem. One question per
 * screen means the error can only ever belong to the field being looked at.
 */

import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { MotiView } from "moti";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cnicDigits, isValidCnic, isValidPhone, type ParentRegistrationResult } from "@pickup/shared";
import {
  Button,
  Card,
  CnicInput,
  Empty,
  Input,
  Loading,
  PhoneInput,
  Screen,
  Spacer,
  StepScreen,
  T,
  colors,
  motion,
  radius,
  spacing,
  useApi,
  useLocale,
  useStepFlow,
} from "@pickup/ui-native";

export default function ParentRegisterScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings, locale } = useLocale();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParentRegistrationResult | null>(null);

  const { index, dir, next, back, isFirst, setIndex } = useStepFlow(5);

  // The PUBLIC list: this screen runs before any token exists, and the
  // authenticated `/schools` would 401 in a way that reads as a network fault.
  //
  // This used to take schools[0] on the assumption of a single-school
  // deployment. With more than one school that silently registered every
  // parent against whichever happened to be first, and since the CNIC match is
  // scoped by school, they matched zero children with nothing on screen to
  // explain why.
  //
  // Showing the list leaks nothing: /schools/public needs no token, so anyone
  // can already read it. What protects a child is the CNIC match in
  // backend/app/routers/registration.py - picking the wrong school here
  // matches nobody and is flagged in the audit log for a human to look at.
  const schools = useQuery({
    queryKey: ["schools", "public"],
    queryFn: () => api.listSchoolsPublic(),
  });
  const school = schools.data?.find((s) => s.id === schoolId) ?? null;

  const submit = useMutation({
    mutationFn: () =>
      api.registerParent({
        name: name.trim(),
        phone,
        password,
        cnic: cnicDigits(cnic),
        school_id: schoolId!,
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
      // A taken phone number is fixable only on the phone step, so put the
      // parent back on it rather than leaving them on the password screen
      // reading an error about a field they cannot see.
      if (status === 409) setIndex(1);
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
            {found ? strings.register.foundChildren : strings.register.noMatchTitle}
          </T>
          <Spacer h={spacing.xs} />
          <T variant="bodyMd" color={colors.muted}>
            {found ? strings.register.foundChildrenBody : strings.register.noMatchBody}
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

  // ── Steps ───────────────────────────────────────────────────────────
  const steps = [
    {
      question: strings.register.schoolQuestion,
      hint: strings.register.schoolHint,
      valid: () => (schoolId ? null : strings.register.schoolRequired),
      canAdvance: schoolId !== null,
      field: (
        <>
          {schools.isPending ? <Loading /> : null}
          {schools.isError ? <Empty message={strings.register.schoolsUnavailable} /> : null}
          {schools.data?.length === 0 ? (
            <Empty message={strings.register.schoolsUnavailable} />
          ) : null}

          {schools.data?.map((s) => {
            const selected = s.id === schoolId;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSchoolId(s.id);
                  setError(null);
                }}
                style={{
                  borderWidth: 1,
                  // Selection is carried by the border and the tick, not by a
                  // fill: a filled row on a cream canvas reads as disabled.
                  borderColor: selected ? colors.primary : colors.hairlineStrong,
                  backgroundColor: colors.surfaceCard,
                  borderRadius: radius.lg,
                  paddingVertical: spacing.base,
                  paddingHorizontal: spacing.base,
                  marginBottom: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <T variant="bodyMd" color={colors.ink}>
                    {s.name}
                  </T>
                </View>
                {selected ? (
                  <T variant="bodyMd" color={colors.primary}>
                    ✓
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </>
      ),
    },
    {
      question: strings.register.nameQuestion,
      hint: undefined,
      valid: () => (name.trim().length < 2 ? strings.register.nameShort : null),
      canAdvance: name.trim().length > 0,
      field: (
        <Input
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          placeholder="Tariq Raza"
          autoCapitalize="words"
          autoFocus
          returnKeyType="next"
        />
      ),
    },
    {
      question: strings.auth.phoneQuestion,
      hint: strings.register.phoneQuestionHint,
      valid: () => (isValidPhone(phone) ? null : strings.auth.phoneFormat),
      canAdvance: phone.length > 0,
      field: (
        <PhoneInput
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setError(null);
          }}
          autoFocus
          returnKeyType="next"
        />
      ),
    },
    {
      question: strings.register.cnicQuestion,
      hint: strings.register.parentIntro,
      valid: () => (isValidCnic(cnic) ? null : strings.register.cnicInvalid),
      canAdvance: cnic.length > 0,
      field: (
        <CnicInput
          value={cnic}
          onChangeText={(v) => {
            setCnic(v);
            setError(null);
          }}
          autoFocus
          returnKeyType="next"
        />
      ),
    },
    {
      question: strings.register.passwordQuestion,
      hint: strings.register.passwordHint,
      valid: () => {
        if (password.length < 8) return strings.register.passwordShort;
        if (password !== confirm) return strings.register.passwordMismatch;
        if (!school) return strings.register.schoolRequired;
        return null;
      },
      canAdvance: password.length > 0 && confirm.length > 0,
      field: (
        <>
          <Input
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
            placeholder="••••••••"
            secureTextEntry
            autoFocus
          />
          <Spacer h={spacing.sm} />
          <Input
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              setError(null);
            }}
            placeholder={strings.register.confirmPassword}
            secureTextEntry
          />
        </>
      ),
    },
  ];

  const step = steps[index];
  const isLast = index === steps.length - 1;

  function advance() {
    const problem = step.valid();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (isLast) submit.mutate();
    else next();
  }

  return (
    <StepScreen
      index={index}
      count={steps.length}
      dir={dir}
      question={step.question}
      hint={step.hint}
      error={error}
      busy={submit.isPending}
      canAdvance={step.canAdvance}
      nextLabel={isLast ? strings.register.submit : undefined}
      onBack={isFirst ? () => router.back() : back}
      onNext={advance}
    >
      {step.field}
    </StepScreen>
  );
}
