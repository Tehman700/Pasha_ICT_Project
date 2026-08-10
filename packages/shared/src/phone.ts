/**
 * Canonical Pakistani mobile number: `03xxxxxxxxx` — 11 digits.
 *
 * Mirrors `backend/app/phone.py`. Both exist because the browser and the apps
 * should reject a malformed number before a round trip, while the server can
 * never trust that they did.
 */

export const PHONE_LENGTH = 11;
const CANONICAL = /^03\d{9}$/;

/** Reduce any plausible input to `03xxxxxxxxx`. */
export function normalisePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0092")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("92") && digits.length >= 12) digits = "0" + digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("3")) digits = "0" + digits;

  return digits;
}

export function isValidPhone(raw: string | null | undefined): boolean {
  return CANONICAL.test(normalisePhone(raw));
}

/** For placeholders and help text — one spelling, everywhere. */
export const PHONE_PLACEHOLDER = "03001234567";
