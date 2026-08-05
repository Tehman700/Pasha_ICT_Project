/** Spacing, radius, breakpoints and motion. Base unit is 4px. */

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  base: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 80,
} as const;

export const radius = {
  none: 0,
  xs: 4, // inline tags
  sm: 6, // compact rows
  md: 8, // CTA buttons, form inputs
  lg: 12, // cards, panes
  xl: 16, // larger feature cards (rare)
  pill: 9999,
  full: 9999,
} as const;

export const breakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
} as const;

/** Max content width. design.md: content caps at ~1200px. */
export const container = 1200;

/**
 * Motion.
 *
 * design.md lists animation timings under "Known Gaps", so this is an
 * application-level addition. The easing curve is deliberately restrained —
 * an editorial brand at 400 display weight should not bounce.
 *
 * These values are consumed by GSAP on web and by Moti/Reanimated on the two
 * React Native apps, so they are expressed as plain numbers rather than CSS
 * strings.
 */
export const motion = {
  duration: {
    instant: 0.12,
    fast: 0.22,
    base: 0.36,
    slow: 0.6,
    /** Queue reorder — slow enough to track a row moving, fast enough to not annoy. */
    reorder: 0.5,
    /** Classroom display name entrance — read from across a room. */
    announce: 0.9,
  },
  ease: {
    standard: "power2.out",
    entrance: "power3.out",
    exit: "power2.in",
    /** The single expressive curve, reserved for arrival moments. */
    arrival: "elastic.out(1, 0.75)",
  },
  stagger: {
    list: 0.045,
    card: 0.07,
  },
} as const;
