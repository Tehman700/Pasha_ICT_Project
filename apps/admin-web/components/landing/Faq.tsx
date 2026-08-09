"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/lib/locale";
import { useScrollReveal, gsap, motion } from "@/lib/gsap";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  function toggle() {
    const el = bodyRef.current;
    if (!el) {
      setOpen((o) => !o);
      return;
    }
    if (!open) {
      setOpen(true);
      requestAnimationFrame(() => {
        gsap.fromTo(
          el,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, duration: motion.duration.base, ease: motion.ease.entrance },
        );
      });
    } else {
      gsap.to(el, {
        height: 0,
        opacity: 0,
        duration: motion.duration.fast,
        ease: motion.ease.exit,
        onComplete: () => setOpen(false),
      });
    }
  }

  return (
    <div data-faq className="border-b border-hairline py-5">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-start"
      >
        <span className="type-title-sm text-ink">{q}</span>
        <span
          className="shrink-0 w-6 h-6 rounded-full border border-hairline-strong flex items-center justify-center type-body-sm text-body transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "none" }}
        >
          +
        </span>
      </button>
      {open ? (
        <div ref={bodyRef} style={{ overflow: "hidden" }}>
          <p className="type-body-sm text-body pt-3.5 max-w-2xl">{a}</p>
        </div>
      ) : null}
    </div>
  );
}

export function Faq() {
  const { strings } = useLocale();
  const l = strings.landing;
  const ref = useScrollReveal<HTMLDivElement>({ selector: "[data-faq]", stagger: 0.05, y: 10 });

  const items: [string, string][] = [
    [l.faqQ1, l.faqA1],
    [l.faqQ2, l.faqA2],
    [l.faqQ3, l.faqA3],
    [l.faqQ4, l.faqA4],
    [l.faqQ5, l.faqA5],
    [l.faqQ6, l.faqA6],
    [l.faqQ7, l.faqA7],
    [l.faqQ8, l.faqA8],
  ];

  return (
    <section className="px-6 tablet:px-10 py-20 max-w-[900px] mx-auto">
      <div className="max-w-xl mb-8">
        <h2 className="type-display-md text-ink mb-3">{l.faqTitle}</h2>
        <p className="type-body text-muted">{l.faqSubtitle}</p>
      </div>
      <div ref={ref}>
        {items.map(([q, a], i) => (
          <FaqItem key={i} q={q} a={a} />
        ))}
      </div>
    </section>
  );
}
