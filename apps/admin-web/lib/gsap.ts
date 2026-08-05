"use client";

/**
 * GSAP helpers.
 *
 * Motion values come from `packages/shared` tokens so the two React Native
 * apps animate on the same curves — they use Reanimated/Moti rather than GSAP
 * (GSAP needs a DOM; RN has none), but the durations and easings match.
 *
 * Every helper is a no-op under `prefers-reduced-motion`.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "@pickup/shared";

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Staggered entrance for a list or card grid. */
export function useStaggerIn<T extends HTMLElement>(
  deps: React.DependencyList = [],
  options: { selector?: string; stagger?: number; y?: number } = {},
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;

    const targets = options.selector
      ? el.querySelectorAll(options.selector)
      : el.children;
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: options.y ?? 12 },
        {
          opacity: 1,
          y: 0,
          duration: motion.duration.base,
          ease: motion.ease.entrance,
          stagger: options.stagger ?? motion.stagger.list,
          clearProps: "transform",
        },
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** Single element fade+rise. */
export function useFadeIn<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: motion.duration.base,
          ease: motion.ease.entrance,
          delay,
        },
      );
    }, el);
    return () => ctx.revert();
  }, [delay]);

  return ref;
}

export { gsap, motion };
