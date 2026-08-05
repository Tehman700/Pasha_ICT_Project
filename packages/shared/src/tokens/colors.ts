/**
 * Colour tokens.
 *
 * Everything in `brand`, `surface`, `hairline`, `text`, `timeline` and
 * `semantic` comes verbatim from `design.md`. Everything in `status` and
 * `inverted` is an application-level extension — see `docs/DESIGN_SYSTEM.md`
 * for the reasoning. No hex value should ever appear outside this file.
 */

export const colors = {
  // ── Brand ────────────────────────────────────────────────────────────
  // The only brand action colour. design.md: "Used scarcely."
  primary: "#f54e00",
  primaryActive: "#d04200",

  // ── Surface ──────────────────────────────────────────────────────────
  canvas: "#f7f7f4", // warm cream page floor — never pure white
  canvasSoft: "#fafaf7",
  surfaceCard: "#ffffff",
  surfaceStrong: "#e6e5e0",

  // ── Hairlines (the only depth mechanism — no shadows) ────────────────
  hairline: "#e6e5e0",
  hairlineSoft: "#efeee8",
  hairlineStrong: "#cfcdc4",

  // ── Text ─────────────────────────────────────────────────────────────
  ink: "#26251e", // warm near-black
  body: "#5a5852",
  bodyStrong: "#26251e",
  muted: "#807d72",
  mutedSoft: "#a09c92",
  onPrimary: "#ffffff",

  // ── Semantic ─────────────────────────────────────────────────────────
  success: "#1f8a65",
  error: "#cf2d56",

  /**
   * AI-timeline pastels. Present for completeness only.
   *
   * design.md is explicit: "Use timeline pastels only inside in-product agent
   * visualizations — never as system action colors." This product has no agent
   * timeline, so in practice these are unused. They are NOT the queue status
   * palette — see `status` below.
   */
  timeline: {
    thinking: "#dfa88f",
    grep: "#9fc9a2",
    read: "#9fbbe0",
    edit: "#c0a8dd",
    done: "#c08532",
  },

  /**
   * Ink-inverted surface. Used by the guard verdict screen and the classroom
   * display, both of which are read in conditions the cream canvas cannot
   * survive: direct afternoon sun at the gate, and six metres across a
   * classroom.
   *
   * This is not a new visual language — design.md already inverts to ink for
   * `pricing-tier-featured`. The two `*OnInk` values are lightened derivations
   * of the existing semantics, because #1f8a65 and #cf2d56 do not carry
   * enough luminance against #26251e to read at a glance.
   */
  inverted: {
    canvas: "#26251e",
    canvasSoft: "#32302a",
    text: "#f7f7f4",
    textMuted: "#a09c92",
    hairline: "#43413a",
    successOnInk: "#4ec49a",
    errorOnInk: "#ff7a94",
  },

  /**
   * Queue status treatment.
   *
   * The timeline pastels are off-limits, and design.md forbids a second brand
   * action colour — so state is carried by ink weight, hairline weight and
   * fill rather than by hue. Only three states earn colour, and each earns it
   * for a reason:
   *
   *   NEARBY      → primary. The one state that means "act now".
   *   AT_GATE     → ink inversion. Highest attention, no new colour spent.
   *   HANDED_OVER → success. Terminal and positive.
   *   LAPSED      → error. Terminal and needs attention.
   *
   * SCHEDULED, EN_ROUTE and CANCELLED are distinguished only by weight, which
   * is what keeps the queue readable when forty rows are on screen at once.
   */
  status: {
    SCHEDULED: { fg: "#807d72", border: "#efeee8", fill: "transparent" },
    EN_ROUTE: { fg: "#26251e", border: "#e6e5e0", fill: "#fafaf7" },
    NEARBY: { fg: "#26251e", border: "#f54e00", fill: "#ffffff" },
    AT_GATE: { fg: "#f7f7f4", border: "#26251e", fill: "#26251e" },
    HANDED_OVER: { fg: "#1f8a65", border: "#e6e5e0", fill: "#ffffff" },
    CANCELLED: { fg: "#a09c92", border: "#efeee8", fill: "transparent" },
    LAPSED: { fg: "#cf2d56", border: "#efeee8", fill: "transparent" },
  },
} as const;

export type QueueStatusKey = keyof typeof colors.status;
