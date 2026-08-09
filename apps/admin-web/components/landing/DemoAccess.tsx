"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale";
import { useScrollReveal } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DEMO_ADMIN_PHONE,
  DEMO_DRIVER_PHONE,
  DEMO_PARENT_PHONE,
  DEMO_PASSWORD,
} from "@/lib/demo";

function CredentialRow({ label, phone }: { label: string; phone: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-hairline last:border-0">
      <span className="type-body-sm text-body">{label}</span>
      <span className="type-mono text-ink" dir="ltr">
        {phone}
      </span>
    </div>
  );
}

/**
 * The "registration" surface for a judge.
 *
 * There is no self-serve admin signup in this system — school admins are
 * vetted, not self-registered, same as the security model everywhere else
 * in the product. What a judge actually needs is a way IN, so this hands
 * over a working demo login instead of pretending to be a signup form.
 */
export function DemoAccess() {
  const { strings } = useLocale();
  const l = strings.landing;
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-demo-card]", stagger: 0.1 });

  return (
    <section id="demo" className="px-6 tablet:px-10 py-20 max-w-[1200px] mx-auto scroll-mt-16">
      <div className="max-w-xl mb-10">
        <h2 className="type-display-md text-ink mb-3">{l.demoTitle}</h2>
        <p className="type-body text-muted">{l.demoSubtitle}</p>
      </div>

      <div ref={ref} className="grid tablet:grid-cols-3 gap-4">
        <Card data-demo-card className="flex flex-col">
          <p className="type-label text-primary mb-3">{l.demoAdminLabel}</p>
          <CredentialRow label="Demo Admin" phone={DEMO_ADMIN_PHONE} />
          <p className="type-caption text-muted-soft mt-3 mb-4">
            {l.demoPasswordNote} <span className="type-mono">{DEMO_PASSWORD}</span>
          </p>
          <Link href={`/login?phone=${encodeURIComponent(DEMO_ADMIN_PHONE)}`} className="mt-auto">
            <Button variant="primary" className="w-full">
              {l.demoLoginCta}
            </Button>
          </Link>
        </Card>

        <Card data-demo-card>
          <p className="type-label text-muted mb-3">{l.demoParentLabel}</p>
          <CredentialRow label="Bilal Ahmed" phone={DEMO_PARENT_PHONE} />
          <p className="type-caption text-muted-soft mt-3">
            {l.demoPasswordNote} <span className="type-mono">{DEMO_PASSWORD}</span>
          </p>
        </Card>

        <Card data-demo-card>
          <p className="type-label text-muted mb-3">{l.demoDriverLabel}</p>
          <CredentialRow label="Kamal Yousuf" phone={DEMO_DRIVER_PHONE} />
          <p className="type-caption text-muted-soft mt-3">
            {l.demoPasswordNote} <span className="type-mono">{DEMO_PASSWORD}</span>
          </p>
        </Card>
      </div>

      <p className="type-caption text-muted-soft mt-6">
        {l.demoParentLabel} / {l.demoDriverLabel} —{" "}
        <Link href="/apps" className="text-body hover:text-ink underline underline-offset-4">
          {l.navApps}
        </Link>
      </p>
    </section>
  );
}
