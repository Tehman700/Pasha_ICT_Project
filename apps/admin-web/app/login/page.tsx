"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { normalisePhone } from "@pickup/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi, USE_MOCK } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useFadeIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, PhoneInput } from "@/components/ui/Input";
import { Wordmark } from "@/components/brand/Logo";
import { DEMO_ADMIN_PHONE, DEMO_PASSWORD } from "@/lib/demo";

function LoginForm() {
  const router = useRouter();
  const api = useApi();
  const { strings, locale, toggle } = useLocale();
  const cardRef = useFadeIn<HTMLDivElement>();
  const params = useSearchParams();

  // The landing page's demo link passes the demo admin's number so a judge
  // doesn't have to retype it — never the password, that stays on-screen
  // where it was already shown, not in a URL that ends up in browser history.
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.login({ phone: normalisePhone(phone), password });
      if (res.user.role !== "admin") {
        setError(strings.errors.wrongAppAdmin);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(status === 401 ? strings.errors.badCredentials : strings.errors.network);
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

      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <div ref={cardRef} className="w-full max-w-sm">
          <h1 className="type-display-lg mb-2">{strings.auth.signIn}</h1>
          <p className="type-body text-muted mb-8">{strings.auth.subtitle}</p>

          <Card>
            <form className="space-y-5" onSubmit={submit}>
              <Field label={strings.auth.phone}>
                <PhoneInput
                  value={phone}
                  onValueChange={setPhone}
                  autoComplete="username"
                  required
                />
              </Field>
              <Field label={strings.auth.password}>
                <Input
                  type="password"
                  placeholder="••••••••"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>

              {error ? (
                <p
                  role="alert"
                  className="type-body-sm text-error border border-error/30 rounded-md px-3 py-2"
                >
                  {error}
                </p>
              ) : null}

              <Button variant="primary" type="submit" className="w-full" disabled={busy}>
                {busy ? strings.common.loading : strings.auth.signInCta}
              </Button>
            </form>
          </Card>

          {/* Fills the fields; does not submit. The judge still presses Sign
              in themselves — this saves typing a phone number and a
              password, not the act of signing in. */}
          <div className="mt-4 border border-dashed border-hairline-strong rounded-lg p-4">
            <p className="type-body-sm text-ink mb-0.5">{strings.landing.demoApplyTitle}</p>
            <p className="type-caption text-muted mb-3">{strings.landing.demoApplyBody}</p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setPhone(DEMO_ADMIN_PHONE);
                setPassword(DEMO_PASSWORD);
                setError(null);
              }}
            >
              {strings.landing.demoApplyCta}
            </Button>
          </div>

          <p className="type-caption text-muted-soft mt-6 text-center">
            {USE_MOCK ? "Running on fixtures — any credentials continue." : "Signed in against the live API."}
          </p>

          <p className="type-caption text-center mt-3">
            <Link href="/#demo" className="text-body hover:text-ink underline underline-offset-4">
              {strings.landing.demoTitle}
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-hairline text-center">
            <p className="type-body-sm text-muted mb-3">{strings.register.noAccount}</p>
            <Link href="/register">
              <Button variant="secondary" className="w-full">
                {strings.adminSignup.cta}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the App Router, even though
  // the fallback is never visible — this whole page renders client-side.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
