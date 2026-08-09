"use client";

import { useLocale } from "@/lib/locale";
import { useScrollReveal } from "@/lib/gsap";

/**
 * Placeholder by design, not by omission — initials-only avatars, names and
 * a single factual role, nothing invented. Swap in real photos and bios
 * directly here once they exist; the layout doesn't need to change.
 */
const FOUNDERS = [
  { name: "Tehman", initial: "T" },
  { name: "Hussnain", initial: "H" },
];

export function Founders() {
  const { strings } = useLocale();
  const l = strings.landing;
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-founder]", stagger: 0.1 });

  return (
    <section className="px-6 tablet:px-10 py-20 max-w-[1200px] mx-auto">
      <h2 className="type-display-md text-ink mb-10 text-center">{l.foundersTitle}</h2>
      <div ref={ref} className="flex justify-center gap-10 tablet:gap-16">
        {FOUNDERS.map((f) => (
          <div key={f.name} data-founder className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-ink text-canvas flex items-center justify-center type-display-sm mb-4">
              {f.initial}
            </div>
            <p className="type-title-sm text-ink">{f.name}</p>
            <p className="type-caption text-muted-soft mt-1">{l.founderRole}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
