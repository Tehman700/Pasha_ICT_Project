/**
 * Pakistani CNIC: 13 digits, written `38515-1952462-5`.
 *
 * The dashes are presentation only — `backend/app/routers/registration.py`
 * strips to digits before storing, and `Student.guardian_cnic` is matched on
 * digits. So every field here formats for the eye and every request sends
 * `digitsOnly`.
 *
 * That split matters for a specific failure: a parent self-registers by typing
 * the CNIC the school already recorded against their child. If one side stores
 * `38515-1952462-5` and the other `3851519524625`, the match silently returns
 * no children and the parent lands in an empty app with nothing to explain it.
 */

export const CNIC_LENGTH = 13;

/** Where the dashes fall: 5 digits, 7 digits, 1 digit. */
const GROUPS = [5, 7, 1] as const;

export const CNIC_PLACEHOLDER = "38515-1952462-5";

/** Strip formatting for transport and comparison. */
export function cnicDigits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * What a CNIC field holds after each keystroke: digits regrouped as
 * `38515-1952462-5`, capped at 13 digits.
 *
 * Dashes are inserted as the user passes each boundary rather than pre-painted
 * as a mask. A mask means the caret has to be steered around characters the
 * user did not type, which on React Native is where these controls usually
 * break — backspacing onto a dash either does nothing or deletes two digits.
 * Growing the string only when a real digit arrives keeps the caret at the end
 * where the keyboard already puts it.
 */
export function formatCnic(raw: string): string {
  const digits = cnicDigits(raw).slice(0, CNIC_LENGTH);
  if (!digits) return "";

  const parts: string[] = [];
  let at = 0;
  for (const size of GROUPS) {
    if (at >= digits.length) break;
    parts.push(digits.slice(at, at + size));
    at += size;
  }
  return parts.join("-");
}

export function isValidCnic(raw: string | null | undefined): boolean {
  return cnicDigits(raw).length === CNIC_LENGTH;
}
