/**
 * React Native style helpers.
 *
 * Same tokens as the web surfaces, converted to what RN's style system needs.
 * Two differences matter and are the reason this file exists rather than the
 * apps importing `typography` directly:
 *
 *   1. RN `lineHeight` is ABSOLUTE pixels, not a ratio. Passing 1.5 makes text
 *      overlap itself — a bug that looks like a font problem and isn't.
 *   2. RN `fontWeight` is a string.
 *
 * No `react-native` import here: RN styles are plain objects, and this package
 * is also consumed by the two web surfaces.
 */

import { typography, typographyUrdu, type TypeStep } from "./typography";
import type { Locale } from "../types/api";

export type RNTextStyle = {
  fontSize: number;
  fontWeight: "400" | "500" | "600";
  lineHeight: number;
  letterSpacing: number;
};

function toRN(step: TypeStep): RNTextStyle {
  return {
    fontSize: step.size,
    fontWeight: String(step.weight) as RNTextStyle["fontWeight"],
    // ratio → absolute px
    lineHeight: Math.round(step.size * step.lineHeight),
    letterSpacing: step.tracking,
  };
}

/**
 * Text style for a type step in a locale.
 *
 * Urdu resolves to its own ramp: zero tracking (negative tracking severs
 * Nastaliq's connected script) and a much taller line-height.
 */
export function textStyle(
  step: keyof typeof typography,
  locale: Locale = "en",
): RNTextStyle {
  if (locale === "ur" && step in typographyUrdu) {
    return toRN(typographyUrdu[step as keyof typeof typographyUrdu]);
  }
  return toRN(typography[step]);
}

/** Every Latin step, pre-resolved. */
export const text = Object.fromEntries(
  Object.keys(typography).map((k) => [
    k,
    toRN(typography[k as keyof typeof typography]),
  ]),
) as Record<keyof typeof typography, RNTextStyle>;

/** Every Urdu step, pre-resolved. */
export const textUr = Object.fromEntries(
  Object.keys(typographyUrdu).map((k) => [
    k,
    toRN(typographyUrdu[k as keyof typeof typographyUrdu]),
  ]),
) as Record<keyof typeof typographyUrdu, RNTextStyle>;
