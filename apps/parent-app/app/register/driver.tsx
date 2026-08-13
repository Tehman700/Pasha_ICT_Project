/**
 * Driver self-registration, one question per screen.
 *
 * He registers and is attached to nothing. No admin queue, no school approval
 * — the school vets nobody, so a driver is invisible until a parent chooses
 * him by phone number. That inversion is the design (`docs/SECURITY.md`), and
 * the result screen has to say it plainly or he will wait for a call that is
 * never coming.
 *
 * `expected_arrival` is the field that looks least important and matters most.
 * Geofences fire late or not at all on the phones this market uses — Xiaomi,
 * Oppo, Vivo and Infinix battery managers kill background work as a feature.
 * The time he types here is what makes the system work on those days, so the
 * hint explains why rather than just labelling the box.
 *
 * Both photos are **camera-only and required**. A gallery upload can be any
 * face off the internet, and the parent linking him is the one who has to
 * recognise it — so `CameraView` with no library option, and the server
 * refuses a registration without them.
 */

import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MotiView } from "moti";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cnicDigits, isValidCnic, isValidPhone } from "@pickup/shared";
import {
  Button,
  Card,
  CnicInput,
  Field,
  Input,
  PhoneInput,
  Row,
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

/** `HH:MM`, or null when the field is left empty — it is optional. */
function normaliseTime(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const m = /^(\d{1,2})[:.\s]?(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export default function DriverRegisterScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [seats, setSeats] = useState("");
  const [arrival, setArrival] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Two photos, each a local file:// URI until the form is submitted. They
  // upload on submit rather than on capture so an abandoned registration
  // leaves nothing in the bucket.
  const [selfie, setSelfie] = useState<string | null>(null);
  const [idCard, setIdCard] = useState<string | null>(null);
  const [shooting, setShooting] = useState<"selfie" | "id" | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const { index, dir, next, back, isFirst, setIndex } = useStepFlow(6);

  async function capture() {
    const shot = await camera.current?.takePictureAsync({ quality: 0.6 });
    if (!shot?.uri) return;
    if (shooting === "selfie") setSelfie(shot.uri);
    else setIdCard(shot.uri);
    setShooting(null);
    setError(null);
  }

  // Public list — no token exists yet. See the note in `register/parent.tsx`.
  const schools = useQuery({
    queryKey: ["schools", "public"],
    queryFn: () => api.listSchoolsPublic(),
  });
  const school = schools.data?.[0];

  const submit = useMutation({
    mutationFn: async () => {
      // Photos first: the registration call requires both keys, so uploading
      // here means a failed upload aborts before an account exists rather
      // than leaving a driver registered with no face against his name.
      const [shot, card] = await Promise.all([
        api.uploadPhoto(selfie!, "drivers"),
        api.uploadPhoto(idCard!, "drivers"),
      ]);
      return api.registerDriver({
        name: name.trim(),
        phone,
        password,
        cnic: cnicDigits(cnic),
        selfie_url: shot.key,
        id_photo_url: card.key,
        registration_no: vehicle.trim().toUpperCase(),
        capacity: seats.trim() ? Number(seats.replace(/\D/g, "")) : null,
        expected_arrival: normaliseTime(arrival),
        school_id: school!.id,
      });
    },
    onSuccess: () => setDone(true),
    onError: (err) => {
      const status = (err as { status?: number })?.status;
      setError(
        status === 409
          ? strings.register.phoneTaken
          : status === undefined
            ? strings.errors.network
            : strings.register.failed,
      );
      // Only the phone step can fix a duplicate, so send him back to it.
      if (status === 409) setIndex(1);
    },
  });

  // ── Result ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <Screen>
        <Spacer h={spacing.xxl} />
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: motion.duration.base * 1000 }}
        >
          <T variant="displaySm" color={colors.ink}>
            {strings.register.driverDoneTitle}
          </T>
          <Spacer h={spacing.xs} />
          <T variant="bodyMd" color={colors.muted}>
            {strings.register.driverDoneBody}
          </T>
          <Spacer h={spacing.lg} />

          {/* His own number, shown back to him: it is the only handle a parent
              has to find him, so he must leave this screen knowing it. */}
          <Card accent="primary">
            <T variant="bodySm" color={colors.muted}>
              {strings.auth.phone}
            </T>
            <Spacer h={spacing.xxs} />
            <T variant="titleSm" color={colors.ink}>
              {phone}
            </T>
          </Card>

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

  // ── Camera ──────────────────────────────────────────────────────────
  //
  // Full screen while shooting. `facing` follows the subject: the selfie uses
  // the front camera, the CNIC card the back one, so neither costs a tap.
  if (shooting) {
    if (!permission?.granted) {
      return (
        <Screen>
          <Spacer h={spacing.xxl} />
          <T variant="titleSm" color={colors.ink}>
            {strings.register.cameraNeeded}
          </T>
          <Spacer h={spacing.sm} />
          <T variant="bodySm" color={colors.muted}>
            {strings.register.cameraNeededBody}
          </T>
          <Spacer h={spacing.lg} />
          <Button
            label={strings.register.allowCamera}
            variant="primary"
            full
            onPress={() => void requestPermission()}
          />
          <Spacer h={spacing.sm} />
          <Button label={strings.common.cancel} onPress={() => setShooting(null)} full />
        </Screen>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          ref={camera}
          style={{ flex: 1 }}
          facing={shooting === "selfie" ? "front" : "back"}
        />
        <View style={{ padding: spacing.lg, backgroundColor: "#000" }}>
          <T variant="bodySm" color="#fff" align="center">
            {shooting === "selfie" ? strings.register.selfieHint : strings.register.idCardHint}
          </T>
          <Spacer h={spacing.base} />
          <Button
            label={strings.register.takePhoto}
            variant="primary"
            full
            large
            onPress={() => void capture()}
          />
          <Spacer h={spacing.xs} />
          <Button label={strings.common.cancel} full onPress={() => setShooting(null)} />
        </View>
      </View>
    );
  }

  // ── Steps ───────────────────────────────────────────────────────────
  const steps = [
    {
      question: strings.register.nameQuestion,
      hint: strings.register.driverIntro,
      valid: () => (name.trim().length < 2 ? strings.register.nameShort : null),
      canAdvance: name.trim().length > 0,
      field: (
        <Input
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          placeholder="Ahmed Khan"
          autoCapitalize="words"
          autoFocus
        />
      ),
    },
    {
      question: strings.auth.phoneQuestion,
      hint: strings.register.driverPhoneHint,
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
        />
      ),
    },
    {
      question: strings.register.cnicQuestion,
      hint: strings.register.cnicHint,
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
        />
      ),
    },
    {
      question: strings.register.vanQuestion,
      hint: strings.register.expectedArrivalHint,
      valid: () => (vehicle.trim().length < 3 ? strings.register.vehicleRequired : null),
      canAdvance: vehicle.trim().length > 0,
      field: (
        <>
          <Field label={strings.register.vehicleNumber} hint={strings.register.vehicleNumberHint}>
            <Input
              value={vehicle}
              onChangeText={(v) => {
                setVehicle(v);
                setError(null);
              }}
              placeholder="LEA-1234"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
          </Field>
          <Field label={strings.register.capacity}>
            <Input value={seats} onChangeText={setSeats} placeholder="12" keyboardType="number-pad" />
          </Field>
          <Field label={strings.register.expectedArrival}>
            <Input
              value={arrival}
              onChangeText={setArrival}
              placeholder="13:15"
              keyboardType="numbers-and-punctuation"
            />
          </Field>
        </>
      ),
    },
    {
      question: strings.register.photosQuestion,
      hint: strings.register.photosHint,
      valid: () => (!selfie || !idCard ? strings.register.photosRequired : null),
      canAdvance: Boolean(selfie && idCard),
      field: (
        <>
          <PhotoSlot
            label={strings.register.selfie}
            hint={strings.register.selfieHint}
            uri={selfie}
            onPress={() => setShooting("selfie")}
            retakeLabel={strings.register.retakePhoto}
            takeLabel={strings.register.takePhoto}
          />
          <Spacer h={spacing.sm} />
          <PhotoSlot
            label={strings.register.idCard}
            hint={strings.register.idCardHint}
            uri={idCard}
            onPress={() => setShooting("id")}
            retakeLabel={strings.register.retakePhoto}
            takeLabel={strings.register.takePhoto}
          />
        </>
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

/** A camera-only photo slot: thumbnail once shot, prompt until then. */
function PhotoSlot({
  label,
  hint,
  uri,
  onPress,
  retakeLabel,
  takeLabel,
}: {
  label: string;
  hint: string;
  uri: string | null;
  onPress: () => void;
  retakeLabel: string;
  takeLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.base,
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: uri ? colors.hairline : colors.hairlineStrong,
        borderRadius: radius.lg,
        padding: spacing.base,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: 56, height: 56, borderRadius: radius.md }} />
      ) : (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.md,
            backgroundColor: colors.canvasSoft,
            borderWidth: 1,
            borderColor: colors.hairline,
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <T variant="bodyMd" color={colors.ink}>
          {label}
        </T>
        <T variant="caption" color={colors.muted}>
          {hint}
        </T>
      </View>
      <T variant="bodySm" color={colors.primary}>
        {uri ? retakeLabel : takeLabel}
      </T>
    </Pressable>
  );
}
