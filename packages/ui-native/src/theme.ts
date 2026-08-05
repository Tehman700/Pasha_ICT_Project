/**
 * RN theme.
 *
 * Re-exports the shared tokens so app code never reaches past this module for
 * a colour or a type step, and never inlines a hex value.
 */

import { colors, radius, spacing, motion, text, textUr } from "@pickup/shared";

export { colors, radius, spacing, motion, text, textUr };

/**
 * Shadows are deliberately absent.
 *
 * design.md: "Don't add drop shadows. Hairlines + ink-on-cream contrast carry
 * the depth." RN's default card idiom is elevation; this system's is a 1px
 * hairline on a white surface over a cream canvas. Do not add `elevation` or
 * `shadowOpacity` to anything here.
 */
export const surface = {
  card: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
  },
  screen: {
    backgroundColor: colors.canvas,
  },
  /** Guard verdict + any outdoor-read surface. */
  inverted: {
    backgroundColor: colors.inverted.canvas,
  },
} as const;
