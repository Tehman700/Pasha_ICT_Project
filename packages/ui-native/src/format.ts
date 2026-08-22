/** Formatting helpers for the mobile surfaces. Mirrors admin-web/lib/format.ts. */

/**
 * The server caps a trip at 90 minutes, so anything beyond that is not a
 * school run - it is a stale fix from before the collector set off, or a
 * device sitting in another country with its location spoofed. An emulator
 * defaulting to California and a school in Islamabad produced "32610 min",
 * which is 543 hours and reads as a broken app rather than a stale number.
 *
 * Showing a dash is honest: we do not know yet. The real value appears on the
 * next location ping.
 */
const MAX_MEANINGFUL_ETA_SECONDS = 90 * 60;

export function etaLabel(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds > MAX_MEANINGFUL_ETA_SECONDS) return "—";
  if (seconds <= 30) return "now";
  const mins = Math.round(seconds / 60);
  return mins <= 1 ? "1 min" : `${mins} min`;
}

export function timeLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function secondsUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const WEEKDAYS_UR = ["پیر", "منگل", "بدھ", "جمعرات", "جمعہ"] as const;
