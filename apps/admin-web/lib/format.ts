/** Formatting helpers shared across admin screens. */

export function etaLabel(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds <= 30) return "now";
  const mins = Math.round(seconds / 60);
  return mins <= 1 ? "1 min" : `${mins} min`;
}

export function durationLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function timeLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateTimeLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${timeLabel(iso)}`;
}

export function relativeMinutes(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return "just now";
  return mins === 1 ? "1 min ago" : `${mins} min ago`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
