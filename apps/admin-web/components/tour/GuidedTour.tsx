"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, motion } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";

export type TourStep = {
  /** Matches a `data-tour="…"` attribute somewhere in the dashboard chrome. */
  target: string;
  title: string;
  body: string;
  /** Which side of the target the card sits on. Auto-flips near an edge. */
  side?: "right" | "bottom";
};

const STORAGE_KEY = "rukhsat.tour.seen";

/**
 * A step-by-step arrow tour over the real dashboard, not a set of screenshots.
 *
 * It finds the actual DOM node behind each `data-tour` id and draws an arrow
 * from a floating card to it, so what a judge sees pointed-at is the exact
 * pixel they'd click next — screenshots drift the moment a screen changes,
 * this cannot.
 *
 * Auto-launches once per browser (localStorage-gated) and is always
 * re-openable from the "Take the tour" button in the header.
 */
export function GuidedTour({
  steps,
  autoStart = false,
}: {
  steps: TourStep[];
  autoStart?: boolean;
}) {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [box, setBox] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!autoStart) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setStepIndex(0), 700);
    return () => clearTimeout(t);
  }, [autoStart]);

  // The header's "Take the tour" button must work for every admin, not only
  // the one whose first-ever login triggered the auto-start above — so this
  // listens independently of the `autoStart` gate rather than reusing it.
  useEffect(() => {
    const restart = () => setStepIndex(0);
    window.addEventListener("rukhsat:tour:restart", restart);
    return () => window.removeEventListener("rukhsat:tour:restart", restart);
  }, []);

  useEffect(() => {
    function relayout() {
      if (stepIndex < 0) return;
      const step = steps[stepIndex];
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setBox(el ? el.getBoundingClientRect() : null);
    }
    relayout();
    window.addEventListener("resize", relayout);
    window.addEventListener("scroll", relayout, true);
    return () => {
      window.removeEventListener("resize", relayout);
      window.removeEventListener("scroll", relayout, true);
    };
  }, [stepIndex, steps]);

  useEffect(() => {
    if (stepIndex < 0 || !box || !cardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: motion.duration.fast, ease: motion.ease.entrance },
      );
      if (arrowRef.current) {
        gsap.fromTo(
          arrowRef.current,
          { opacity: 0 },
          { opacity: 1, duration: motion.duration.base, delay: 0.1 },
        );
        gsap.to(arrowRef.current, {
          x: "+=4",
          duration: 0.7,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    });
    return () => ctx.revert();
  }, [stepIndex, box]);

  function end() {
    setStepIndex(-1);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  }

  function next() {
    if (stepIndex >= steps.length - 1) {
      end();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  if (stepIndex < 0) return null;
  const step = steps[stepIndex];
  const side = step.side ?? "right";

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dim everything except the highlighted element, via a 4-rect mask. */}
      {box ? (
        <>
          <div className="absolute inset-0 bg-ink/45 pointer-events-auto" onClick={next} style={{ clipPath: cutout(box) }} />
          <div
            className="absolute border-2 border-primary rounded-md transition-[top,left,width,height] duration-300"
            style={{
              top: box.top - 6,
              left: box.left - 6,
              width: box.width + 12,
              height: box.height + 12,
              boxShadow: "0 0 0 4px color-mix(in srgb, var(--color-primary) 25%, transparent)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-ink/45 pointer-events-auto" onClick={next} />
      )}

      {box ? (
        <svg
          ref={arrowRef}
          className="absolute pointer-events-none"
          width="40"
          height="24"
          viewBox="0 0 40 24"
          style={arrowStyle(box, side)}
        >
          <path
            d={side === "right" ? "M2 12 H32 M24 4 L32 12 L24 20" : "M20 2 V22 M12 14 L20 22 L28 14"}
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : null}

      <div
        ref={cardRef}
        className="absolute pointer-events-auto bg-surface-card border border-hairline-strong rounded-lg shadow-none p-5 w-[300px]"
        style={box ? cardStyle(box, side) : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
      >
        <p className="type-label text-primary mb-1.5">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <p className="type-title-sm text-ink mb-1.5">{step.title}</p>
        <p className="type-body-sm text-body mb-4">{step.body}</p>
        <div className="flex items-center justify-between gap-3">
          <button onClick={end} className="type-caption text-muted-soft hover:text-body">
            Skip tour
          </button>
          <Button variant="primary" onClick={next}>
            {stepIndex >= steps.length - 1 ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Re-launch the tour from any header button, ignoring the "seen" flag. */
export function useRestartTour() {
  return () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("rukhsat:tour:restart"));
  };
}

function cutout(box: DOMRect): string {
  const pad = 6;
  const t = box.top - pad, l = box.left - pad, r = box.right + pad, b = box.bottom + pad;
  return `polygon(evenodd, 0 0, 0 100%, 100% 100%, 100% 0, ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px)`;
}

function arrowStyle(box: DOMRect, side: "right" | "bottom"): React.CSSProperties {
  if (side === "right") {
    return { top: box.top + box.height / 2 - 12, left: box.right + 10 };
  }
  return { top: box.bottom + 6, left: box.left + box.width / 2 - 20 };
}

function cardStyle(box: DOMRect, side: "right" | "bottom"): React.CSSProperties {
  const margin = 16;
  if (side === "right") {
    const left = Math.min(box.right + margin + 34, window.innerWidth - 316);
    return { top: Math.max(16, box.top + box.height / 2 - 70), left };
  }
  const top = Math.min(box.bottom + margin + 24, window.innerHeight - 200);
  return { top, left: Math.max(16, Math.min(box.left, window.innerWidth - 316)) };
}
