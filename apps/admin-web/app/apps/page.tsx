"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale";
import { API_URL } from "@/lib/api";
import { useScrollReveal } from "@/lib/gsap";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Footer } from "@/components/landing/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QrCode } from "@/components/landing/QrCode";

// API_URL carries the "/v1" API-contract suffix; the APKs live at the
// server's origin, served by a plain static mount — see backend/app/main.py.
const API_ORIGIN = API_URL.replace(/\/v1\/?$/, "");

const APKS = {
  parent: `${API_ORIGIN}/downloads/rukhsat-parent.apk`,
  staff: `${API_ORIGIN}/downloads/rukhsat-staff.apk`,
};

function AppCard({
  icon,
  name,
  tagline,
  href,
}: {
  icon: string;
  name: string;
  tagline: string;
  href: string;
}) {
  const { strings } = useLocale();
  const a = strings.apps;

  return (
    <Card data-app-card className="flex flex-col tablet:flex-row gap-6">
      <div className="flex items-center gap-4 tablet:flex-col tablet:items-start tablet:w-40 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt=""
          width={64}
          height={64}
          className="rounded-2xl border border-hairline shrink-0"
        />
        <div className="tablet:mt-2">
          <p className="type-title-sm text-ink">{name}</p>
          <p className="type-caption text-muted">{tagline}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col tablet:flex-row items-start gap-6">
        <div className="flex-1">
          <a href={href} download>
            <Button variant="primary">{a.downloadButton}</Button>
          </a>
        </div>
        <div className="text-center shrink-0">
          <QrCode value={href} size={110} />
          <p className="type-caption text-muted-soft mt-2 max-w-[110px]">{a.scanToInstall}</p>
        </div>
      </div>
    </Card>
  );
}

export default function AppsPage() {
  const { strings } = useLocale();
  const a = strings.apps;
  const l = strings.landing;
  const revealRef = useScrollReveal<HTMLDivElement>({ selector: "[data-app-card]", stagger: 0.1 });

  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />

      <main className="flex-1 px-6 tablet:px-10 py-16 max-w-[900px] mx-auto w-full">
        <h1 className="type-display-lg text-ink mb-2">{a.title}</h1>
        <p className="type-body text-muted mb-10">{a.subtitle}</p>

        <div ref={revealRef} className="space-y-5 mb-14">
          <AppCard
            icon="/apps/parent-icon.png"
            name={a.parentAppName}
            tagline={a.parentAppTagline}
            href={APKS.parent}
          />
          <AppCard
            icon="/apps/staff-icon.png"
            name={a.staffAppName}
            tagline={a.staffAppTagline}
            href={APKS.staff}
          />
        </div>

        <Card className="mb-8">
          <p className="type-label text-muted mb-4">{a.installTitle}</p>
          <ol className="space-y-3">
            {[a.installStep1, a.installStep2, a.installStep3, a.installStep4].map((step, i) => (
              <li key={i} className="flex gap-3 type-body-sm text-body">
                <span className="type-mono text-primary shrink-0">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <p className="type-body-sm text-muted border border-hairline-strong rounded-lg p-4 bg-canvas-soft">
          {a.playStoreNote}
        </p>

        <p className="type-caption mt-8">
          <Link href="/#demo" className="text-body hover:text-ink underline underline-offset-4">
            {a.backToDemo}
          </Link>
        </p>

        <p className="type-caption text-muted-soft mt-2">{l.footerNote}</p>
      </main>

      <Footer />
    </div>
  );
}
