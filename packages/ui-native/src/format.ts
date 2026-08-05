/** Formatting helpers for the mobile surfaces. Mirrors admin-web/lib/format.ts. */

export function etaLabel(seconds: number | null): string {
  if (seconds === null) return "—";
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
