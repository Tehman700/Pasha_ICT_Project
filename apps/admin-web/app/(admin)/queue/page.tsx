"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader, EmptyState, SkeletonRows } from "@/components/ui/Misc";
import { etaLabel } from "@/lib/format";

/**
 * Live queue monitor across all classes.
 *
 * Ordered by live ETA, never by booking time — a collector who booked 1:00 and
 * leaves at 1:30 falls behind on their own. Booking time drives the teacher's
 * prep list only.
 *
 * A van is one row carrying many children, in the same lane as everyone else.
 */
export default function QueuePage() {
  const api = useApi();
  const { strings } = useLocale();
  const [classFilter, setClassFilter] = useState<string | null>(null);

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });
  const queue = useQuery({
    queryKey: ["queue", classFilter],
    queryFn: () => api.getQueue(classFilter ?? undefined),
  });

  const listRef = useStaggerIn<HTMLDivElement>([queue.data], { stagger: 0.05 });

  return (
    <>
      <PageHeader
        title={strings.queue.title}
        subtitle="Ordered by live ETA. Booking time drives the prep list, not the queue."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={classFilter === null ? "ink" : "secondary"}
          onClick={() => setClassFilter(null)}
        >
          {strings.common.all}
        </Button>
        {classes.data?.map((c) => (
          <Button
            key={c.id}
            variant={classFilter === c.id ? "ink" : "secondary"}
            onClick={() => setClassFilter(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {queue.isLoading ? (
        <SkeletonRows rows={5} />
      ) : !queue.data?.length ? (
        <EmptyState message={strings.queue.noneInQueue} />
      ) : (
        <div ref={listRef} className="space-y-3">
          {queue.data.map((entry) => {
            const isVan = entry.collector_role === "driver";
            const multi = entry.sibling_group.length > 1;
            return (
              <Card
                key={entry.pickup_request_id}
                className={entry.status === "NEARBY" ? "border-primary" : ""}
              >
                <div className="flex flex-wrap items-start gap-5">
                  <div className="text-center min-w-[3rem]">
                    <p className="type-label text-muted-soft mb-1">
                      {strings.queue.position}
                    </p>
                    <p className="type-display-md tabular-nums">{entry.position}</p>
                  </div>

                  <div className="flex-1 min-w-[16rem]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="type-title-md">{entry.collector_name}</p>
                      {isVan && <Badge tone="primary">{strings.role.driver}</Badge>}
                    </div>

                    {multi ? (
                      <div className="mt-3">
                        <p className="type-caption text-muted mb-2">
                          {entry.sibling_group.length} {strings.queue.childrenOnTrip}
                          {isVan ? " · across several classes" : ""}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.sibling_group.map((s) => (
                            <span
                              key={s.student_id}
                              className="type-caption text-ink bg-surface-strong rounded-full px-2.5 py-1"
                            >
                              {s.student_name}
                              <span className="text-muted"> · {s.class_name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="type-body-sm text-muted mt-1">
                        {entry.student_name} · {entry.class_name}
                      </p>
                    )}
                  </div>

                  <div className="text-end ms-auto">
                    <p className="type-label text-muted-soft mb-1">{strings.queue.eta}</p>
                    <p className="type-display-sm tabular-nums mb-3">
                      {entry.status === "AT_GATE"
                        ? strings.queue.arrivingNow
                        : etaLabel(entry.eta_seconds)}
                    </p>
                    <StatusPill status={entry.status} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
