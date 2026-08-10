"use client";

import { useState } from "react";
import Link from "next/link";
import { PHONE_PLACEHOLDER, isValidPhone, normalisePhone } from "@pickup/shared";
import { useRouter } from "next/navigation";
import { storeToken, useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useFadeIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Wordmark } from "@/components/brand/Logo";
import { LocationPicker, type PickedLocation } from "@/components/map/LocationPicker";

/**
 * School onboarding: administrator details, then the school itself.
 *
 * Two screens, one submit. `users.school_id` is NOT NULL, so the API creates
 * the administrator and the school in a single transaction — splitting it into
 * two requests would leave a half-registered admin with nowhere to belong if
 * the second one failed.
 *
 * Step 1 is validated locally before step 2 is shown, so nobody fills in a map
 * and a radius only to be told their passwords did not match.
 */

const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 20_000;

export default function RegisterPage() {
  const api = useApi();
  const router = useRouter();
  const { strings, locale, toggle } = useLocale();
  const t = strings.adminSignup;
  const cardRef = useFadeIn<HTMLDivElement>();

  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2
  const [schoolName, setSchoolName] = useState("");
  const [dismissal, setDismissal] = useState("13:15");
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState(1);

  const radiusM = Math.round(radiusKm * 1000);

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError(t.nameRequired);
    if (!phone.trim()) return setError(t.phoneRequired);
    if (!isValidPhone(phone)) return setError(strings.auth.phoneFormat);
    if (password.length < 8) return setError(t.passwordShort);
    if (password !== confirm) return setError(t.passwordMismatch);
    setError(null);
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (schoolName.trim().length < 2) return setError(t.schoolNameRequired);
    if (!location) return setError(t.locationRequired);

    setError(null);
    setBusy(true);
    try {
      const res = await api.registerAdmin({
        name: name.trim(),
        name_ur: nameUr.trim() || null,
        phone: normalisePhone(phone),
        password,
        locale,
        school: {
          name: schoolName.trim(),
          lat: location.lat,
          lng: location.lng,
          geofence_radius_m: Math.min(Math.max(radiusM, MIN_RADIUS_M), MAX_RADIUS_M),
          dismissal_time: dismissal,
        },
      });
      // The API returns a token precisely so this does not bounce the person
      // back to a login form they filled in a minute ago.
      storeToken(res.access_token);
      router.push("/dashboard");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(status === 409 ? t.phoneTaken : t.failed);
      // A rejected school leaves nothing behind server-side, so it is safe to
      // send them back to fix whichever half was wrong.
      if (status === 409) setStep(1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 tablet:px-10">
        <Link href="/">
          <Wordmark />
        </Link>
        <button
          onClick={toggle}
          className="type-body-sm text-body hover:text-ink border border-hairline-strong rounded-md h-9 px-3 bg-surface-card transition-colors"
        >
          {locale === "en" ? "اردو" : "English"}
        </button>
      </header>

      <div className="flex-1 flex justify-center px-6 pb-24 pt-4">
        <div ref={cardRef} className={step === 1 ? "w-full max-w-sm" : "w-full max-w-2xl"}>
          <p className="type-label text-primary mb-2">
            {t.stepOf} {step} {strings.common.of} 2
          </p>
          <h1 className="type-display-lg mb-2">{t.title}</h1>
          <p className="type-body text-muted mb-8">{t.subtitle}</p>

          {step === 1 ? (
            <Card>
              <form className="space-y-5" onSubmit={goToStep2}>
                <div>
                  <p className="type-title-sm text-ink">{t.step1Title}</p>
                  <p className="type-caption text-muted mt-1">{t.step1Body}</p>
                </div>

                <Field label={t.yourName}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field label={t.yourNameUr}>
                  <Input value={nameUr} onChange={(e) => setNameUr(e.target.value)} dir="rtl" />
                </Field>
                <Field label={t.phone} hint={t.phoneHint}>
                  <Input
                    type="tel"
                    dir="ltr"
                    placeholder={PHONE_PLACEHOLDER}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </Field>
                <Field label={t.password} hint={t.passwordHint}>
                  <Input
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field label={t.confirmPassword}>
                  <Input
                    type="password"
                    dir="ltr"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </Field>

                {error ? (
                  <p role="alert" className="type-body-sm text-error border border-error/30 rounded-md px-3 py-2">
                    {error}
                  </p>
                ) : null}

                <Button variant="primary" type="submit" className="w-full">
                  {t.next}
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <form className="space-y-5" onSubmit={submit}>
                <div>
                  <p className="type-title-sm text-ink">{t.step2Title}</p>
                  <p className="type-caption text-muted mt-1">{t.step2Body}</p>
                </div>

                <div className="grid tablet:grid-cols-2 gap-4">
                  <Field label={t.schoolName}>
                    <Input
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder={t.schoolNamePlaceholder}
                      required
                    />
                  </Field>
                  <Field label={t.dismissalTime} hint={t.dismissalHint}>
                    <Input
                      type="time"
                      dir="ltr"
                      value={dismissal}
                      onChange={(e) => setDismissal(e.target.value)}
                      required
                    />
                  </Field>
                </div>

                <LocationPicker value={location} radiusM={radiusM} onChange={setLocation} />

                <Field label={`${t.radius} — ${radiusKm.toFixed(1)} km`} hint={t.radiusHint}>
                  <input
                    type="range"
                    min={MIN_RADIUS_M / 1000}
                    max={5}
                    step={0.1}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </Field>

                {error ? (
                  <p role="alert" className="type-body-sm text-error border border-error/30 rounded-md px-3 py-2">
                    {error}
                  </p>
                ) : null}

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                    {t.back}
                  </Button>
                  <Button variant="primary" type="submit" className="flex-1" disabled={busy}>
                    {busy ? t.creating : t.createAccount}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <p className="type-caption text-center mt-6">
            {t.haveAccount}{" "}
            <Link href="/login" className="text-body hover:text-ink underline underline-offset-4">
              {strings.auth.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
