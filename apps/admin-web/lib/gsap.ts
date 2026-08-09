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
 * Slide-in from one side as an element crosses into view, once.
 *
 * The "Apple feature list" pattern: alternating left/right entrances give a
 * long page of otherwise-identical cards a sense of direction as you scroll,
 * rather than everything fading in the same way every time.
 */
export function useScrollRevealX<T extends HTMLElement>(
  side: "left" | "right",
  options: { distance?: number } = {},
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;

    const dist = options.distance ?? 60;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, x: side === "left" ? -dist : dist },
        {
          opacity: 1,
          x: 0,
          duration: motion.duration.slow,
          ease: motion.ease.entrance,
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [side, options.distance]);

  return ref;
}

/**
 * Pins a section and scrubs a horizontal track sideways as the page scrolls
 * vertically — the mechanism behind Apple's "swipe through features by
 * scrolling down" sections. `trackSelector` is the row of panels to
 * translate; the pinning container is the ref itself.
 *
 * Falls back to normal (unpinned, vertically-stacked) flow under reduced
 * motion or on narrow screens, where a sideways-scrolling pin fights a
 * thumb that only scrolls vertically.
 */
export function useHorizontalPinScroll<T extends HTMLElement>(
  trackSelector: string,
  deps: React.DependencyList = [],
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    const track = el?.querySelector<HTMLElement>(trackSelector);
    if (!el || !track) return;
    if (reducedMotion() || window.innerWidth < 1024) return;

    const ctx = gsap.context(() => {
      const distance = track.scrollWidth - el.clientWidth;
      if (distance <= 0) return;

      gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance}`,
          scrub: 0.4,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** Gentle vertical drift as an element scrolls through the viewport. */
export function useParallax<T extends HTMLElement>(strength = 40) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: -strength },
        {
          y: strength,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [strength]);

  return ref;
}

export { gsap, motion };
