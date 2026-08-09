"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatTile, PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { etaLabel, percent, relativeMinutes } from "@/lib/format";

export default function DashboardPage() {
  const api = useApi();
  const { strings } = useLocale();

  const queue = useQuery({ queryKey: ["queue"], queryFn: () => api.getQueue() });
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => api.listDevices() });
  const onTime = useQuery({ queryKey: ["onTime"], queryFn: () => api.getOnTimeRate() });
  const audit = useQuery({
    queryKey: ["audit", "flagged"],
    queryFn: () => api.listAuditLog({ flaggedOnly: true }),
  });

  const tilesRef = useStaggerIn<HTMLDivElement>([onTime.data, queue.data]);
  const queueRef = useStaggerIn<HTMLDivElement>([queue.data], { stagger: 0.05 });

  const offline = devices.data?.filter((d) => !d.online) ?? [];
  const inQueue = queue.data?.filter((q) => q.status !== "HANDED_OVER") ?? [];

  return (
    <>
      <PageHeader
        title={strings.nav.dashboard}
        subtitle="Dismissal window 1:00 – 2:30 PM · Roots Montessori, Islamabad"
      />

      <div ref={tilesRef} className="grid gap-4 mobile:grid-cols-2 desktop:grid-cols-4 mb-10">
        <StatTile label={strings.queue.title} value={String(inQueue.length)} sub="collectors active now" />
        <StatTile
          label={strings.analytics.onTimeRate}
          value={onTime.data ? percent(onTime.data.on_time_rate) : "—"}
          sub={onTime.data ? `${onTime.data.total_pickups} pickups this term` : undefined}
        />
        <StatTile
          label={strings.analytics.manualRate}
          value={onTime.data ? percent(onTime.data.manual_fallback_rate) : "—"}
          sub="handovers without a QR scan"
        />
        <StatTile
          label={strings.nav.devices}
          value={`${(devices.data?.length ?? 0) - offline.length}/${devices.data?.length ?? 0}`}
          sub={offline.length ? `${offline.length} not announcing` : "all announcing"}
          tone={offline.length ? "error" : "success"}
        />
      </div>

      {/* A silent classroom is invisible unless we make it visible. */}
      {offline.length > 0 && (
        <Card className="mb-10 border-error/30">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="error">{strings.devices.offlineWarning}</Badge>
            <p className="type-body-sm text-body">
              {offline.map((d) => d.class_name).join(", ")} — no voice announcement is
              playing. The teacher&apos;s queue screen is the only fallback.
            </p>
            <Link href="/devices" className="type-body-sm text-primary underline underline-offset-4 ms-auto">
              {strings.nav.devices} →
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-8 desktop:grid-cols-3">
        <section className="desktop:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="type-display-sm">{strings.queue.title}</h2>
            <Link href="/queue" className="type-body-sm text-primary underline underline-offset-4">
              {strings.common.all} →
            </Link>
          </div>

          {queue.isLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            <div ref={queueRef} className="space-y-2">
              {inQueue.map((entry) => (
                <Card key={entry.pickup_request_id} padded={false} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="type-display-sm text-muted-soft w-8 tabular-nums">
                      {entry.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="type-title-sm truncate">{entry.collector_name}</p>
                      <p className="type-caption text-muted mt-0.5">
                        {entry.sibling_group.length > 1
                          ? `${entry.sibling_group.length} ${strings.queue.childrenOnTrip}`
                          : entry.student_name}
                        {" · "}
                        {entry.class_name}
                      </p>
                    </div>
                    <span className="type-body-sm text-body tabular-nums">
                      {etaLabel(entry.eta_seconds)}
                    </span>
                    <StatusPill status={entry.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="type-display-sm mb-4">{strings.audit.flagged}</h2>
          <div className="space-y-2">
            {audit.data?.map((row) => (
              <Card key={row.id} padded={false} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <Badge tone="error">manual</Badge>
                  <div className="min-w-0">
                    <p className="type-body-sm text-ink">
                      {String(row.payload.student ?? "—")}
                    </p>
                    <p className="type-caption text-muted mt-1">
                      {String(row.payload.collector ?? "")} · {row.actor_name}
                    </p>
                    <p className="type-caption text-muted-soft mt-1">
                      {relativeMinutes(row.created_at)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            <Link
              href="/audit"
              className="block type-body-sm text-primary underline underline-offset-4 pt-2"
            >
              {strings.nav.audit} →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
