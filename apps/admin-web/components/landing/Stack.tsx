"use client";

import { useLocale } from "@/lib/locale";
import { useScrollReveal } from "@/lib/gsap";
import { TECH_ICONS } from "@/lib/tech-icons";

export function Stack() {
  const { strings } = useLocale();
  const l = strings.landing;
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-tech]", stagger: 0.04, y: 14 });

  return (
    <section className="px-6 tablet:px-10 py-20 bg-canvas-soft border-y border-hairline">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-xl mb-10">
          <h2 className="type-display-md text-ink mb-3">{l.stackTitle}</h2>
          <p className="type-body text-muted">{l.stackSubtitle}</p>
        </div>

        <div ref={ref} className="grid grid-cols-3 tablet:grid-cols-6 gap-3">
          {TECH_ICONS.map((t) => (
            <div
              key={t.slug}
              data-tech
              className="flex flex-col items-center justify-center gap-2.5 bg-surface-card border border-hairline rounded-lg py-6 px-2 transition-transform hover:-translate-y-0.5"
            >
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path d={t.path} fill={t.hex} />
              </svg>
              <span className="type-caption text-muted text-center leading-tight">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
