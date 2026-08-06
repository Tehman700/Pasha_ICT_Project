"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi, USE_MOCK } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useFadeIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const api = useApi();
  const { strings, locale, toggle } = useLocale();
  const cardRef = useFadeIn<HTMLDivElement>();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.login({ phone: phone.trim(), password });
      if (res.user.role !== "admin") {
        // The dashboard is admin-only. Staff use the mobile app; letting a
        // teacher in here would show them every class's data.
        setError("This dashboard is for administrators.");
        return;
      }
      router.push("/");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 401
          ? "Incorrect phone number or password."
          : "Could not reach the server. Check your connection.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 tablet:px-10">
        <span className="type-title-md text-ink">
          {strings.common.appName}
          <span className="text-primary">.</span>
        </span>
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
                <Input
                  type="tel"
                  placeholder="+92 300 1112233"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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

          <p className="type-caption text-muted-soft mt-6 text-center">
            {USE_MOCK
              ? "Running on fixtures — any credentials continue."
              : "Signed in against the live API."}
          </p>
        </div>
      </div>
    </div>
  );
}
