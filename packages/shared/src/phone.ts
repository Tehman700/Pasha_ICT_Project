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

/**
 * What a phone field is allowed to contain after each keystroke.
 *
 * The field holds 11 digits and nothing else — no spaces, no dashes, no `+92`.
 * Everything that reaches a phone input goes through this, so "you cannot type
 * a twelfth digit" is one rule in one place rather than a `maxLength` prop
 * that four of the six call sites forgot.
 *
 * Paste is the reason this normalises rather than simply truncating. Someone
 * pasting `+92 300 1234567` from a contact card means the same number a
 * hand-typed `03001234567` means; blindly cutting at 11 characters would keep
 * `+92 300 12` and silently produce a wrong number. So a recognisable
 * international form is converted first, and only then capped.
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  // Only reinterpret a prefix once enough of it has been typed to be
  // unambiguous. Doing it per-keystroke would rewrite "92…" the instant
  // someone typed a 9, which is a legal start to no Pakistani mobile number
  // but is jarring while typing.
  let out = digits;
  if (digits.startsWith("0092")) out = "0" + digits.slice(4);
  else if (digits.startsWith("92") && digits.length >= 12) out = "0" + digits.slice(2);
  else if (digits.length >= 10 && digits.startsWith("3")) out = "0" + digits;

  return out.slice(0, PHONE_LENGTH);
}
