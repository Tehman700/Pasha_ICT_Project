"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale";
import { useFadeIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const { strings, locale, toggle } = useLocale();
  const cardRef = useFadeIn<HTMLDivElement>();

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
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                router.push("/");
              }}
            >
              <Field label={strings.auth.phone}>
                <Input type="tel" placeholder="+92 300 1112233" dir="ltr" />
              </Field>
              <Field label={strings.auth.password}>
                <Input type="password" placeholder="••••••••" dir="ltr" />
              </Field>
              <Button variant="primary" type="submit" className="w-full">
                {strings.auth.signInCta}
              </Button>
            </form>
          </Card>

          <p className="type-caption text-muted-soft mt-6 text-center">
            Skeleton build — any credentials continue.
          </p>
        </div>
      </div>
    </div>
  );
}
