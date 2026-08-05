"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";

export default function SchoolsPage() {
  const api = useApi();
  const { strings } = useLocale();

  const schools = useQuery({ queryKey: ["schools"], queryFn: () => api.listSchools() });

  return (
    <>
      <PageHeader
        title={strings.nav.schools}
        subtitle="Geofence radius and dismissal time drive the whole scheduling pipeline."
        action={<Button variant="primary">{strings.common.add}</Button>}
      />

      {schools.isLoading ? (
        <SkeletonRows rows={1} />
      ) : (
        schools.data?.map((s) => (
          <Card key={s.id} className="max-w-3xl">
            <p className="type-display-sm mb-6">{s.name}</p>

            <div className="grid gap-5 mobile:grid-cols-2">
              <Field label="Dismissal time">
                <Input defaultValue={s.dismissal_time} />
              </Field>
              <Field label="Timezone">
                <Input defaultValue={s.timezone} />
              </Field>
              <Field
                label="Geofence radius (m)"
                hint="Logged on entry. The announcement fires on ETA, not this ring."
              >
                <Input defaultValue={String(s.geofence_radius_m)} />
              </Field>
              <Field label="Coordinates">
                <Input defaultValue={`${s.lat}, ${s.lng}`} />
              </Field>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-hairline-soft">
              <Button variant="primary">{strings.common.save}</Button>
              <Button variant="secondary">{strings.common.cancel}</Button>
            </div>
          </Card>
        ))
      )}
    </>
  );
}
