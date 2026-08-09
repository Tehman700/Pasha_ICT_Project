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
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "@pickup/shared";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

/**
 * Reveal children as they cross into view, once, on scroll.
 *
 * For the landing page only — every other screen in this dashboard is
 * short enough that scroll-triggered animation would just be a delay
 * between a click and seeing the data.
 */
export function useScrollReveal<T extends HTMLElement>(
  options: { selector?: string; stagger?: number; y?: number } = {},
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;

    const targets = options.selector ? el.querySelectorAll(options.selector) : [el];
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: options.y ?? 24 },
        {
          opacity: 1,
          y: 0,
          duration: motion.duration.slow,
          ease: motion.ease.entrance,
          stagger: options.stagger ?? motion.stagger.list,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [options.selector, options.stagger, options.y]);

  return ref;
}

/**
 * Counts up to a number once it scrolls into view.
 *
 * Used for the stats strip — 44 modules, 188 tests and so on are real
 * figures pulled from MODULE_PLAN.md, not marketing copy, and counting up
 * to a real number reads as evidence rather than decoration.
 */
export function useCountUp(target: number, opts: { duration?: number } = {}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion()) {
      el.textContent = String(target);
      return;
    }

    const counter = { value: 0 };
    const ctx = gsap.context(() => {
      gsap.to(counter, {
        value: target,
        duration: opts.duration ?? 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = String(Math.round(counter.value));
        },
      });
    });

    return () => ctx.revert();
  }, [target, opts.duration]);

  return ref;
}

export { gsap, motion };
