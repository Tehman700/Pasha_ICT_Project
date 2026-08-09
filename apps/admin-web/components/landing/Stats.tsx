"use client";

import { useLocale } from "@/lib/locale";
import { useCountUp, useScrollReveal } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";

/**
 * Every number here is real, pulled from `docs/MODULE_PLAN.md`'s status
 * block at the time of writing — not marketing copy. If the module count
 * changes, this drifts out of date exactly like that doc would; update both
 * together.
 */
const FIGURES = [
  { value: 44, key: "statModules" as const },
  { value: 50, key: "statEndpoints" as const },
  { value: 210, key: "statTests" as const },
  { value: 37, key: "statScreens" as const },
];

function StatCard({ value, label }: { value: number; label: string }) {
  const countRef = useCountUp(value);
  return (
    <Card>
      <p className="type-display-lg text-ink">
        <span ref={countRef}>0</span>
      </p>
      <p className="type-label text-muted mt-2">{label}</p>
    </Card>
  );
}

export function Stats() {
  const { strings } = useLocale();
  const l = strings.landing;
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-stat]", stagger: 0.08 });

  return (
    <section className="px-6 tablet:px-10 py-20 bg-canvas-soft border-y border-hairline">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-xl mb-10">
          <h2 className="type-display-md text-ink mb-3">{l.statsTitle}</h2>
          <p className="type-body text-muted">{l.statsSubtitle}</p>
        </div>
        <div ref={ref} className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
          {FIGURES.map((f) => (
            <div key={f.key} data-stat>
              <StatCard value={f.value} label={l[f.key]} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
