"use client";

import { useLocale } from "@/lib/locale";
import { useScrollReveal } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";

/** A right-pointing arrow between two step cards. Flips under RTL via `dir`. */
function StepArrow() {
  return (
    <svg
      className="hidden tablet:block shrink-0 rtl:-scale-x-100"
      width="40"
      height="16"
      viewBox="0 0 40 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 8 H32 M25 2 L32 8 L25 14"
        stroke="var(--color-hairline-strong)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function HowItWorks() {
  const { strings } = useLocale();
  const l = strings.landing;
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-step]", stagger: 0.12 });

  const steps = [
    { n: "01", title: l.step1Title, body: l.step1Body },
    { n: "02", title: l.step2Title, body: l.step2Body },
    { n: "03", title: l.step3Title, body: l.step3Body },
    { n: "04", title: l.step4Title, body: l.step4Body },
  ];

  return (
    <section className="px-6 tablet:px-10 py-20 max-w-[1200px] mx-auto">
      <div className="max-w-xl mb-12">
        <h2 className="type-display-md text-ink mb-3">{l.howItWorksTitle}</h2>
        <p className="type-body text-muted">{l.howItWorksSubtitle}</p>
      </div>

      <div ref={ref} className="flex flex-col tablet:flex-row items-stretch gap-3 tablet:gap-0">
        {steps.map((step, i) => (
          <div key={step.n} className="flex items-center gap-3 tablet:flex-1">
            <Card data-step className="flex-1">
              <p className="type-mono text-primary mb-3">{step.n}</p>
              <p className="type-title-sm text-ink mb-2">{step.title}</p>
              <p className="type-body-sm text-body">{step.body}</p>
            </Card>
            {i < steps.length - 1 ? <StepArrow /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
