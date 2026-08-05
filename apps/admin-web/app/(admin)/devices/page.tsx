"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { relativeMinutes, timeLabel } from "@/lib/format";

/**
 * Classroom display health.
 *
 * Voice announcements have no offline path — the ETA trigger is computed
 * server-side and pushed over a WebSocket. A tablet that drops off the network
 * simply stops speaking, with nothing in the room indicating anything is
 * wrong. This page is the only thing that makes that visible.
 */
export default function DevicesPage() {
  const api = useApi();
  const { strings } = useLocale();

  const devices = useQuery({ queryKey: ["devices"], queryFn: () => api.listDevices() });
  const gridRef = useStaggerIn<HTMLDivElement>([devices.data], { stagger: 0.07 });

  const offline = devices.data?.filter((d) => !d.online) ?? [];

  return (
    <>
      <PageHeader
        title={strings.devices.title}
        subtitle={strings.devices.subtitle}
        action={<Button variant="primary">{strings.devices.pairNew}</Button>}
      />

      {offline.length > 0 && (
        <Card className="mb-8 border-error/30">
          <div className="flex items-start gap-3">
            <Badge tone="error">{offline.length} offline</Badge>
            <p className="type-body-sm text-body">
              {offline.map((d) => d.class_name).join(", ")} will not announce
              arrivals. Teachers in those rooms have only the queue screen on
              their own phone as a fallback.
            </p>
          </div>
        </Card>
      )}

      {devices.isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div ref={gridRef} className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {devices.data?.map((d) => (
            <Card key={d.id} className={d.online ? "" : "border-error/40"}>
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="type-title-md">{d.class_name}</p>
                  <p className="type-mono text-muted mt-1">{d.device_identifier}</p>
                </div>
                <Badge tone={d.online ? "success" : "error"}>
                  {d.online ? strings.common.online : strings.common.offline}
                </Badge>
              </div>

              <dl className="space-y-2.5 pt-4 border-t border-hairline-soft">
                <div className="flex justify-between gap-3">
                  <dt className="type-caption text-muted">{strings.devices.lastSeen}</dt>
                  <dd
                    className={`type-caption tabular-nums ${d.online ? "text-body" : "text-error"}`}
                  >
                    {relativeMinutes(d.last_seen_at)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="type-caption text-muted">Paired</dt>
                  <dd className="type-caption text-body tabular-nums">
                    {timeLabel(d.paired_at)}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
