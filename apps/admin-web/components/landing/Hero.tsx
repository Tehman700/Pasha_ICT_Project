"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale";
import { gsap, motion } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";

export function Hero() {
  const { strings } = useLocale();
  const l = strings.landing;
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: motion.ease.entrance } });
      tl.fromTo(
        "[data-hero=title] .word",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: motion.duration.slow, stagger: 0.06 },
      )
        .fromTo(
          "[data-hero=subtitle]",
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: motion.duration.base },
          "-=0.25",
        )
        .fromTo(
          "[data-hero=cta] > *",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: motion.duration.base, stagger: 0.08 },
          "-=0.2",
        );
    }, el);

    return () => ctx.revert();
  }, []);

  // Split into spans so the title can stagger word-by-word rather than
  // fading in as one block — the only place on this page motion carries
  // meaning rather than decoration, since it's the first thing a judge sees.
  const words = l.heroTitle.split(" ");

  return (
    <div ref={rootRef} className="px-6 tablet:px-10 pt-20 pb-24 tablet:pt-28 tablet:pb-32 max-w-[1200px] mx-auto text-center">
      <h1
        data-hero="title"
        className="type-display-mega text-ink max-w-4xl mx-auto mb-6"
        style={{ overflow: "hidden" }}
      >
        {words.map((w, i) => (
          <span key={i} className="word inline-block" style={{ marginInlineEnd: "0.28em" }}>
            {w}
          </span>
        ))}
      </h1>
      <p data-hero="subtitle" className="type-body text-muted max-w-xl mx-auto mb-10">
        {l.heroSubtitle}
      </p>
      <div data-hero="cta" className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/#demo">
          <Button variant="primary" className="h-12 px-7 text-[15px]">
            {l.heroCtaPrimary}
          </Button>
        </Link>
        <Link href="/apps">
          <Button variant="secondary" className="h-12 px-7 text-[15px]">
            {l.heroCtaSecondary}
          </Button>
        </Link>
      </div>
    </div>
  );
}
