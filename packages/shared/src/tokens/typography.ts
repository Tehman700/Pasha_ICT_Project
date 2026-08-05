/**
 * Typography tokens.
 *
 * The Latin ramp is design.md verbatim. Two additions are application-level:
 * the `displayGiant` / `displayHuge` steps for the classroom display, and the
 * entire `urdu` ramp.
 */

export const fonts = {
  /** design.md specifies CursorGothic (licensed). Inter is the documented substitute. */
  sans: '"Inter", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  /**
   * Urdu is Nastaliq script. Inter has no Urdu glyphs, so this is a hard
   * substitution, not a fallback nicety.
   */
  urdu: '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif',
} as const;

export type TypeStep = {
  size: number;
  weight: number;
  lineHeight: number;
  tracking: number;
};

export const typography = {
  // ── design.md verbatim ───────────────────────────────────────────────
  displayMega: { size: 72, weight: 400, lineHeight: 1.1, tracking: -2.16 },
  displayLg: { size: 36, weight: 400, lineHeight: 1.2, tracking: -0.72 },
  displayMd: { size: 26, weight: 400, lineHeight: 1.25, tracking: -0.325 },
  displaySm: { size: 22, weight: 400, lineHeight: 1.3, tracking: -0.11 },
  titleMd: { size: 18, weight: 600, lineHeight: 1.4, tracking: 0 },
  titleSm: { size: 16, weight: 600, lineHeight: 1.4, tracking: 0 },
  bodyMd: { size: 16, weight: 400, lineHeight: 1.5, tracking: 0 },
  bodyTracked: { size: 16, weight: 400, lineHeight: 1.5, tracking: 0.08 },
  bodySm: { size: 14, weight: 400, lineHeight: 1.5, tracking: 0 },
  caption: { size: 13, weight: 400, lineHeight: 1.4, tracking: 0 },
  captionUppercase: { size: 11, weight: 600, lineHeight: 1.4, tracking: 0.88 },
  code: { size: 13, weight: 400, lineHeight: 1.5, tracking: 0 },
  button: { size: 14, weight: 500, lineHeight: 1.0, tracking: 0 },
  navLink: { size: 14, weight: 500, lineHeight: 1.4, tracking: 0 },

  /**
   * Classroom display only. design.md tops out at 72px, which is sized for a
   * laptop at arm's length. A wall-mounted tablet read from across a
   * classroom needs considerably more.
   */
  displayGiant: { size: 120, weight: 400, lineHeight: 1.05, tracking: -3.6 },
  displayHuge: { size: 96, weight: 400, lineHeight: 1.05, tracking: -2.88 },
} as const satisfies Record<string, TypeStep>;

/**
 * Urdu type ramp.
 *
 * Two rules that are not stylistic preferences:
 *
 *  1. `tracking` is forced to 0. design.md puts negative letter-spacing on
 *     every display step; applied to Nastaliq that severs the connected
 *     script and renders it close to unreadable.
 *  2. `lineHeight` is 1.85–1.95 rather than 1.1–1.5. Nastaliq descends
 *     steeply and diagonally; at Latin line-heights consecutive lines
 *     collide.
 */
export const typographyUrdu = {
  displayMega: { size: 64, weight: 400, lineHeight: 1.85, tracking: 0 },
  displayLg: { size: 34, weight: 400, lineHeight: 1.85, tracking: 0 },
  displayMd: { size: 25, weight: 400, lineHeight: 1.9, tracking: 0 },
  displaySm: { size: 21, weight: 400, lineHeight: 1.9, tracking: 0 },
  titleMd: { size: 18, weight: 600, lineHeight: 1.9, tracking: 0 },
  titleSm: { size: 16, weight: 600, lineHeight: 1.9, tracking: 0 },
  bodyMd: { size: 17, weight: 400, lineHeight: 1.95, tracking: 0 },
  bodySm: { size: 15, weight: 400, lineHeight: 1.95, tracking: 0 },
  caption: { size: 14, weight: 400, lineHeight: 1.9, tracking: 0 },
  displayGiant: { size: 104, weight: 400, lineHeight: 1.8, tracking: 0 },
  displayHuge: { size: 84, weight: 400, lineHeight: 1.8, tracking: 0 },
} as const satisfies Record<string, TypeStep>;
