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
 *
 * Each step gets its own small illustration rather than text alone — the
 * same ink/cream/orange system as the Problem section, applied to the
 * specific action each step describes, not a generic icon.
 */

function AddCollectorArt() {
  return (
    <svg viewBox="0 0 320 260" className="w-full h-auto" role="img" aria-hidden="true">
      <rect width="320" height="260" rx="20" fill="var(--color-canvas-soft)" />
      <rect x="100" y="40" width="120" height="180" rx="18" fill="var(--color-surface-card)" stroke="var(--color-hairline-strong)" strokeWidth="2" />
      <rect x="118" y="70" width="84" height="16" rx="4" fill="var(--color-hairline-soft)" />
      <rect x="118" y="70" width="84" height="16" rx="4" fill="none" stroke="var(--color-hairline-strong)" strokeWidth="1.5" />
      <text x="126" y="82" fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-mono)">+92 3xx xxxxxxx</text>
      <circle cx="160" cy="130" r="22" fill="var(--color-primary)" />
      <path d="M150 130l7 7 14-14" stroke="var(--color-on-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* no-search reinforcement */}
      <g opacity="0.55">
        <circle cx="240" cy="60" r="10" fill="none" stroke="var(--color-muted-soft)" strokeWidth="3" />
        <line x1="247" y1="67" x2="256" y2="76" stroke="var(--color-muted-soft)" strokeWidth="3" strokeLinecap="round" />
        <line x1="228" y1="46" x2="252" y2="70" stroke="var(--color-error)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function OnMyWayArt() {
  return (
    <svg viewBox="0 0 320 260" className="w-full h-auto" role="img" aria-hidden="true">
      <rect width="320" height="260" rx="20" fill="var(--color-canvas-soft)" />
      <path d="M60 200C110 140 150 190 200 120S260 60 270 55" stroke="var(--color-hairline-strong)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="200" r="9" fill="var(--color-ink)" />
      <g>
        <rect x="240" y="30" width="14" height="34" rx="7" fill="var(--color-ink)" />
        <circle cx="247" cy="34" r="5" fill="var(--color-canvas-soft)" />
      </g>
      <circle cx="150" cy="163" r="10" fill="var(--color-primary)" />
      <rect x="96" y="210" width="118" height="30" rx="15" fill="var(--color-surface-card)" stroke="var(--color-hairline-strong)" strokeWidth="1.5" />
      <text x="155" y="230" textAnchor="middle" fontSize="12" fill="var(--color-ink)" fontFamily="var(--font-mono)">ETA 2 min</text>
    </svg>
  );
}

function AnnounceArt() {
  return (
    <svg viewBox="0 0 320 260" className="w-full h-auto" role="img" aria-hidden="true">
      <rect width="320" height="260" rx="20" fill="var(--color-canvas-soft)" />
      <rect x="90" y="70" width="140" height="110" rx="10" fill="var(--color-surface-card)" stroke="var(--color-hairline-strong)" strokeWidth="2" />
      <rect x="90" y="70" width="140" height="18" rx="4" fill="var(--color-ink)" />
      <path d="M140 128h-14v20h14l18 14v-48z" fill="var(--color-ink)" />
      <path d="M172 122c8 8 8 24 0 32" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M182 112c14 14 14 38 0 52" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.55" />
      <text x="160" y="215" textAnchor="middle" fontSize="12" fill="var(--color-muted)" fontFamily="var(--font-mono)">once — not repeated</text>
    </svg>
  );
}

function OfflineScanArt() {
  return (
    <svg viewBox="0 0 320 260" className="w-full h-auto" role="img" aria-hidden="true">
      <rect width="320" height="260" rx="20" fill="var(--color-canvas-soft)" />
      <rect x="100" y="40" width="120" height="150" rx="14" fill="var(--color-ink)" />
      <rect x="114" y="56" width="92" height="92" rx="4" fill="var(--color-canvas)" />
      {/* simple QR-like grid */}
      {[0, 1, 2, 3, 4, 5].map((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => {
          const on = (r * 7 + c * 3) % 5 < 2;
          if (!on) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={122 + c * 13}
              y={64 + r * 13}
              width="10"
              height="10"
              fill="var(--color-ink)"
            />
          );
        }),
      )}
      <circle cx="160" cy="165" r="9" fill="var(--color-primary)" />
      <path d="M155 165l3.5 3.5L166 160" stroke="var(--color-on-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* no-signal marker, still verifying */}
      <g transform="translate(240,50)" opacity="0.8">
        <path d="M0 20h4v-6H0v6zm7 0h4v-12H7v12zm7 0h4v-18h-4v18z" fill="var(--color-muted-soft)" />
        <line x1="-4" y1="-4" x2="22" y2="22" stroke="var(--color-error)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function StepPanel({
  n,
  title,
  body,
  art,
}: {
  n: string;
  title: string;
  body: string;
  art: React.ReactNode;
}) {
  return (
    <div className="w-screen h-full shrink-0 flex items-center justify-center px-6 tablet:px-16">
      <div className="max-w-5xl w-full grid tablet:grid-cols-2 gap-10 tablet:gap-16 items-center">
        <div className="max-w-[340px] mx-auto tablet:mx-0 w-full order-1 rtl:tablet:order-2">{art}</div>
        <div className="order-2 rtl:tablet:order-1">
          <p className="type-mono text-primary mb-4" style={{ fontSize: 18 }}>
            {n}
          </p>
          <p className="type-display-lg text-ink mb-5">{title}</p>
          <p className="type-body text-muted max-w-md" style={{ fontSize: 18, lineHeight: 1.6 }}>
            {body}
          </p>
        </div>
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
    { n: "01", title: l.step1Title, body: l.step1Body, art: <AddCollectorArt /> },
    { n: "02", title: l.step2Title, body: l.step2Body, art: <OnMyWayArt /> },
    { n: "03", title: l.step3Title, body: l.step3Body, art: <AnnounceArt /> },
    { n: "04", title: l.step4Title, body: l.step4Body, art: <OfflineScanArt /> },
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
      <div ref={mobileRef} className="tablet:hidden px-6 py-12 space-y-14">
        {steps.map((s) => (
          <div key={s.n} data-step-mobile>
            <div className="max-w-[280px] mx-auto mb-6">{s.art}</div>
            <p className="type-mono text-primary mb-3">{s.n}</p>
            <p className="type-display-sm text-ink mb-3">{s.title}</p>
            <p className="type-body text-body">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
