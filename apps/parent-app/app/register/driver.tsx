/**
 * Driver self-registration.
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
 * recognise it — so `launchCameraAsync` with no library option, and the
 * server refuses a registration without them.
 */

import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MotiView } from "moti";
import { useMutation, useQuery } from "@tanstack/react-query";
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

const digits = (v: string) => v.replace(/\D/g, "");

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
  const { strings, locale, toggle } = useLocale();

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

  function validate(): string | null {
    if (name.trim().length < 2) return strings.register.nameShort;
    if (digits(cnic).length !== 13) return strings.register.cnicInvalid;
    if (vehicle.trim().length < 3) return strings.register.vehicleRequired;
    if (password.length < 8) return strings.register.passwordShort;
    if (password !== confirm) return strings.register.passwordMismatch;
    if (!selfie || !idCard) return strings.register.photosRequired;
    if (!school) return strings.register.schoolRequired;
    return null;
  }

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
        phone: phone.trim(),
        password,
        cnic: digits(cnic),
        selfie_url: shot.key,
        id_photo_url: card.key,
        registration_no: vehicle.trim().toUpperCase(),
        capacity: seats.trim() ? Number(digits(seats)) : null,
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
              {phone.trim()}
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
          <Button
            label={strings.common.cancel}
            onPress={() => setShooting(null)}
            full
          />
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
            {shooting === "selfie"
              ? strings.register.selfieHint
              : strings.register.idCardHint}
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
          <Button
            label={strings.common.cancel}
            full
            onPress={() => setShooting(null)}
          />
        </View>
      </View>
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
          {strings.register.driverTitle}
        </T>
        <Spacer h={spacing.xs} />
        <T variant="bodySm" color={colors.muted}>
          {strings.register.driverIntro}
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
              placeholder="Ahmed Khan"
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
              placeholder="+92 321 5000011"
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

          <Field
            label={strings.register.vehicleNumber}
            hint={strings.register.vehicleNumberHint}
          >
            <Input
              value={vehicle}
              onChangeText={(v) => {
                setVehicle(v);
                setError(null);
              }}
              placeholder="LEA-1234"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </Field>

          <Field label={strings.register.capacity}>
            <Input
              value={seats}
              onChangeText={setSeats}
              placeholder="12"
              keyboardType="number-pad"
            />
          </Field>

          <Field
            label={strings.register.expectedArrival}
            hint={strings.register.expectedArrivalHint}
          >
            <Input
              value={arrival}
              onChangeText={setArrival}
              placeholder="13:15"
              keyboardType="numbers-and-punctuation"
            />
          </Field>

          {/* Camera only, and required. A parent has to recognise this face
              before she grants a stranger access to her child. */}
          <Field label={strings.register.selfie} hint={strings.register.selfieHint}>
            <Pressable onPress={() => setShooting("selfie")}>
              {selfie ? (
                <Row>
                  <Image
                    source={{ uri: selfie }}
                    style={{ width: 64, height: 64, borderRadius: 8 }}
                  />
                  <View style={{ width: spacing.sm }} />
                  <T variant="bodySm" color={colors.primary}>
                    {strings.register.retakePhoto}
                  </T>
                </Row>
              ) : (
                <T variant="bodySm" color={colors.primary}>
                  {strings.register.takePhoto}
                </T>
              )}
            </Pressable>
          </Field>

          <Field label={strings.register.idCard} hint={strings.register.idCardHint}>
            <Pressable onPress={() => setShooting("id")}>
              {idCard ? (
                <Row>
                  <Image
                    source={{ uri: idCard }}
                    style={{ width: 64, height: 64, borderRadius: 8 }}
                  />
                  <View style={{ width: spacing.sm }} />
                  <T variant="bodySm" color={colors.primary}>
                    {strings.register.retakePhoto}
                  </T>
                </Row>
              ) : (
                <T variant="bodySm" color={colors.primary}>
                  {strings.register.takePhoto}
                </T>
              )}
            </Pressable>
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
