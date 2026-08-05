/**
 * The single source of truth for every visual value in the product.
 *
 * Consumed three ways:
 *   - web surfaces  → `app/globals.css` mirrors these into Tailwind v4 `@theme`
 *   - RN surfaces   → imported directly as a JS theme object
 *   - docs          → `docs/DESIGN_SYSTEM.md` explains the reasoning
 *
 * Rule from design.md: use token references everywhere, never inline hex.
 */

export { colors, type QueueStatusKey } from "./colors";
export {
  fonts,
  typography,
  typographyUrdu,
  type TypeStep,
} from "./typography";
export { spacing, radius, breakpoints, container, motion } from "./layout";

import { typography, typographyUrdu, type TypeStep } from "./typography";

/**
 * Resolve a type step for a locale.
 *
 * Urdu is not a translation of the Latin ramp — it has its own sizes,
 * line-heights and (critically) zero tracking. Calling this instead of
 * reaching for `typography` directly is what keeps Nastaliq legible.
 */
export function typeStep(
  step: keyof typeof typography,
  locale: "en" | "ur" = "en",
): TypeStep {
  if (locale === "ur" && step in typographyUrdu) {
    return typographyUrdu[step as keyof typeof typographyUrdu];
  }
  return typography[step];
}

/**
 * Type step as inline CSS. Web only.
 *
 * Returns a plain object rather than `React.CSSProperties` — this package is
 * also imported by the two React Native apps, which must not pull in React
 * DOM types.
 */
export function typeStepCss(
  step: keyof typeof typography,
  locale: "en" | "ur" = "en",
): {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
} {
  const t = typeStep(step, locale);
  return {
    fontSize: `${t.size}px`,
    fontWeight: t.weight,
    lineHeight: t.lineHeight,
    letterSpacing: `${t.tracking}px`,
  };
}
