"use client";

import { useLocale } from "@/lib/locale";
import { useScrollRevealX } from "@/lib/gsap";

/** A small illustrated pickup queue — the scene this project is actually
 * about, drawn in the same restrained ink/cream/orange system as
 * everything else on the page rather than a stock photo. */
function GateQueueIllustration() {
  return (
    <svg viewBox="0 0 360 240" className="w-full h-auto" role="img" aria-hidden="true">
      <rect width="360" height="240" rx="20" fill="var(--color-canvas-soft)" />
      {/* gate */}
      <rect x="150" y="30" width="10" height="150" rx="5" fill="var(--color-ink)" />
      <rect x="260" y="30" width="10" height="150" rx="5" fill="var(--color-ink)" />
      <rect x="150" y="96" width="120" height="10" rx="5" fill="var(--color-primary)" />
      {/* queue of collectors, one highlighted as verified */}
      {[
        { x: 50, tone: "var(--color-muted-soft)" },
        { x: 84, tone: "var(--color-muted-soft)" },
        { x: 118, tone: "var(--color-ink)" },
      ].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={168} r={14} fill={p.tone} />
          <path
            d={`M${p.x - 16} 202c3-12 12-18 16-18s13 6 16 18`}
            stroke={p.tone}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ))}
      <circle cx="118" cy="152" r="9" fill="var(--color-primary)" />
      <path
        d="M113 152l3.5 3.5L124 148"
        stroke="var(--color-on-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* small figures approaching the gate */}
      <circle cx="300" cy="150" r="10" fill="var(--color-hairline-strong)" />
      <circle cx="320" cy="150" r="7" fill="var(--color-hairline-strong)" />
    </svg>
  );
}

export function Origin() {
  const { strings } = useLocale();
  const l = strings.landing;
  const textRef = useScrollRevealX<HTMLDivElement>("left");
  const imgRef = useScrollRevealX<HTMLDivElement>("right");

  return (
    <section className="px-6 tablet:px-10 py-20 max-w-[1200px] mx-auto">
      <div className="grid tablet:grid-cols-2 gap-10 tablet:gap-16 items-center">
        <div ref={textRef}>
          <h2 className="type-display-md text-ink mb-4">{l.originTitle}</h2>
          <p className="type-body text-muted">{l.originBody}</p>
        </div>
        <div ref={imgRef} className="rounded-xl overflow-hidden border border-hairline bg-surface-card p-3">
          <GateQueueIllustration />
        </div>
      </div>
    </section>
  );
}
