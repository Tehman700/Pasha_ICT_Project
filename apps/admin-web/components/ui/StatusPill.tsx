"use client";

import type { PickupStatus } from "@pickup/shared";
import { useLocale } from "@/lib/locale";

/**
 * Queue status.
 *
 * design.md scopes the timeline pastels to agent visualizations and forbids a
 * second brand action colour, so state is carried by weight and fill rather
 * than by hue. Only the states that demand action spend colour:
 *
 *   NEARBY      → primary, the one "act now" state
 *   AT_GATE     → ink inversion, highest attention, no new colour spent
 *   HANDED_OVER → success, terminal and positive
 *   LAPSED      → error, terminal and needs attention
 *
 * The rest differ only in weight, which is what keeps a forty-row queue
 * readable at a glance.
 */

const styles: Record<PickupStatus, string> = {
  SCHEDULED: "text-muted border-hairline-soft bg-transparent",
  EN_ROUTE: "text-ink border-hairline bg-canvas-soft",
  NEARBY: "text-ink border-primary bg-surface-card",
  AT_GATE: "text-canvas border-ink bg-ink",
  HANDED_OVER: "text-success border-hairline bg-surface-card",
  CANCELLED: "text-muted-soft border-hairline-soft bg-transparent",
  LAPSED: "text-error border-hairline-soft bg-transparent",
};

export function StatusPill({ status }: { status: PickupStatus }) {
  const { strings } = useLocale();
  return (
    <span
      className={`inline-flex items-center type-label rounded-full border px-2.5 py-1 whitespace-nowrap ${styles[status]}`}
    >
      {strings.status[status]}
    </span>
  );
}
