import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import {
  Input,
  PhoneInput,
  StepScreen,
  USING_MOCK,
  register as registerForPush,
  useApi,
  useLocale,
  useStepFlow,
} from "@pickup/ui-native";
import { isValidPhone } from "@pickup/shared";

/**
 * Staff sign-in: phone, then password.
 *
 * One app, two roles — and the role comes from `/users/me`, never from a
 * toggle on this screen. A device flag would mean a guard's phone could be
 * flipped to teacher mode and read every class roster.
 */
export default function StaffLoginScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();
  const { index, dir, next, back, isFirst } = useStepFlow(2);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => api.login({ phone, password }),
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
      setError(status === 401 ? strings.errors.badCredentials : strings.errors.network);
      if (status === 401) back();
    },
  });

  function advance() {
    if (index === 0) {
      if (!isValidPhone(phone)) {
        setError(strings.auth.phoneFormat);
        return;
      }
      setError(null);
      next();
      return;
    }

    if (password === "") {
      setError(strings.auth.passwordRequired);
      return;
    }
    setError(null);
    login.mutate();
  }

  const steps = [
    {
      question: strings.auth.phoneQuestion,
      hint: strings.auth.staffSubtitle,
      canAdvance: phone.length > 0,
      field: (
        <PhoneInput
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setError(null);
          }}
          autoFocus
          onSubmitEditing={advance}
          returnKeyType="next"
        />
      ),
    },
    {
      question: strings.auth.passwordQuestion,
      hint: undefined,
      canAdvance: password.length > 0,
      field: (
        <Input
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoFocus
          onSubmitEditing={advance}
          returnKeyType="go"
        />
      ),
    },
  ];

  const step = steps[index];

  return (
    <StepScreen
      index={index}
      count={steps.length}
      dir={dir}
      question={step.question}
      hint={step.hint}
      error={error}
      busy={login.isPending}
      canAdvance={step.canAdvance}
      nextLabel={index === steps.length - 1 ? strings.auth.signInCta : undefined}
      onBack={isFirst ? () => router.back() : back}
      onNext={advance}
    >
      {step.field}
    </StepScreen>
  );
}
