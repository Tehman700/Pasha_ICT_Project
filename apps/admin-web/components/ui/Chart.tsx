"use client";

/**
 * Chart primitives.
 *
 * Colour approach: every chart here is SINGLE-SERIES, so there is no
 * categorical palette and no legend — the title names the series. Marks are
 * ink; `primary` marks exactly one element (the latest point, the peak bar).
 * That keeps Cursor Orange scarce, as design.md requires, and makes the one
 * orange mark carry real meaning rather than decoration.
 *
 * Validated with the palette script against the white card surface:
 *   contrast          both ≥ 3:1                          PASS
 *   CVD separation    ΔE 30.2 protan / 44.5 tritan        PASS
 *   normal vision     ΔE 44.1                             PASS
 * (The lightness-band and chroma-floor checks are scoped to categorical
 * palettes — not applicable to one series plus an emphasis colour.)
 *
 * Mark specs: 2px lines, ≥8px active markers, 4px rounded bar ends anchored to
 * the baseline, a 2px surface gap between bars, recessive grid, hover tooltip
 * on every plot.
 */

import type { ReactNode } from "react";

export const chartInk = "#26251e";
export const chartPrimary = "#f54e00";
export const chartGrid = "#efeee8";
export const chartAxis = "#a09c92";

export function ChartFrame({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <figure className="bg-surface-card border border-hairline rounded-lg p-6">
      <figcaption className="mb-6">
        <h3 className="type-title-md">{title}</h3>
        {caption ? <p className="type-caption text-muted mt-1">{caption}</p> : null}
      </figcaption>
      <div className="h-64 w-full">{children}</div>
    </figure>
  );
}

/** Tooltip styled to the card surface — hairline border, no shadow. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: { value: number | string }[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-hairline-strong rounded-md px-3 py-2">
      <p className="type-label text-muted mb-1">{label}</p>
      <p className="type-title-sm text-ink tabular-nums">
        {payload[0]?.value}
        {unit}
      </p>
    </div>
  );
}
