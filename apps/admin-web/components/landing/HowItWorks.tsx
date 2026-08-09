"use client";

import { useLocale } from "@/lib/locale";
import { useHorizontalPinScroll, useScrollReveal } from "@/lib/gsap";

/**
 * "How a pickup works," told as a scene per step rather than a card grid.
 *
 * Desktop: the section pins and the four panels slide by sideways as you
 * scroll down — the mechanism behind Apple's feature walkthroughs, built on
 * `useHorizontalPinScroll` (ScrollTrigger pin + scrub, see lib/gsap.ts).
 *
 * Mobile: the same hook declines to pin under 1024px — a sideways-scrolling
 * pin fights a thumb that only scrolls vertically — so this falls back to a
 * plain vertical list. Both read the same four steps; nothing is mobile-only
 * content that a desktop reader misses or vice versa.
 */

function StepPanel({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="w-screen h-full shrink-0 flex items-center justify-center px-6 tablet:px-0">
      <div className="max-w-lg">
        <p className="type-mono text-primary mb-5" style={{ fontSize: 15 }}>
          {n}
        </p>
        <p className="type-display-md text-ink mb-4">{title}</p>
        <p className="type-body text-muted">{body}</p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { strings } = useLocale();
  const l = strings.landing;
  const pinRef = useHorizontalPinScroll<HTMLDivElement>(".how-it-works-track");
  const mobileRef = useScrollReveal<HTMLDivElement>({ selector: "[data-step-mobile]", stagger: 0.12 });

  const steps = [
    { n: "01", title: l.step1Title, body: l.step1Body },
    { n: "02", title: l.step2Title, body: l.step2Body },
    { n: "03", title: l.step3Title, body: l.step3Body },
    { n: "04", title: l.step4Title, body: l.step4Body },
  ];

  return (
    <section>
      <div className="px-6 tablet:px-10 pt-20 max-w-[1200px] mx-auto">
        <div className="max-w-xl">
          <h2 className="type-display-md text-ink mb-3">{l.howItWorksTitle}</h2>
          <p className="type-body text-muted">{l.howItWorksSubtitle}</p>
        </div>
      </div>

      {/* Desktop: pinned horizontal scroll */}
      <div ref={pinRef} className="hidden tablet:block relative h-screen overflow-hidden mt-10">
        <div className="how-it-works-track flex h-full" style={{ width: `${steps.length * 100}vw` }}>
          {steps.map((s) => (
            <StepPanel key={s.n} {...s} />
          ))}
        </div>
      </div>

      {/* Mobile: plain vertical list */}
      <div ref={mobileRef} className="tablet:hidden px-6 py-12 space-y-10">
        {steps.map((s) => (
          <div key={s.n} data-step-mobile>
            <p className="type-mono text-primary mb-3">{s.n}</p>
            <p className="type-title-md text-ink mb-2">{s.title}</p>
            <p className="type-body-sm text-body">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
