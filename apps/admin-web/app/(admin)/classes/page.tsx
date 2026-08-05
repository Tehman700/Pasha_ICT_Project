"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";

export default function ClassesPage() {
  const api = useApi();
  const { strings } = useLocale();

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => api.listDevices() });
  const gridRef = useStaggerIn<HTMLDivElement>([classes.data], { stagger: 0.07 });

  return (
    <>
      <PageHeader
        title={strings.nav.classes}
        subtitle="Each class needs a teacher and a paired display before it can announce."
        action={<Button variant="primary">{strings.common.add}</Button>}
      />

      {classes.isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div ref={gridRef} className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {classes.data?.map((c) => {
            const device = devices.data?.find((d) => d.class_id === c.id);
            return (
              <Card key={c.id}>
                <p className="type-display-sm mb-1">{c.name}</p>
                <p className="type-body-sm text-muted mb-5">{c.teacher_name}</p>

                <dl className="space-y-2.5 pt-4 border-t border-hairline-soft">
                  <div className="flex justify-between gap-3">
                    <dt className="type-caption text-muted">{strings.nav.students}</dt>
                    <dd className="type-caption text-ink tabular-nums">
                      {c.student_count}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <dt className="type-caption text-muted">{strings.nav.devices}</dt>
                    <dd>
                      {device ? (
                        <Badge tone={device.online ? "success" : "error"}>
                          {device.online ? strings.common.online : strings.common.offline}
                        </Badge>
                      ) : (
                        <Badge tone="error">not paired</Badge>
                      )}
                    </dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
