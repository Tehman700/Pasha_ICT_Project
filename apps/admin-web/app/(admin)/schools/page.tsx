"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { LocationPicker, type PickedLocation } from "@/components/map/LocationPicker";
import type { School } from "@pickup/shared";

/**
 * Edit the school's location, geofence and dismissal time.
 *
 * This screen previously rendered uncontrolled inputs and a Save button with
 * no handler — it looked editable and silently discarded everything typed
 * into it, which is worse than being obviously read-only. Now it is a real
 * form against PATCH /schools/{id}.
 *
 * The map is here and not only in signup because a school's gate is the thing
 * most likely to be wrong after the fact: whoever registered may have pinned
 * the campus centre, or the school may start using a different gate. Getting
 * it wrong is a permanent offset in every arrival estimate, and until now
 * there was no way to correct it short of editing the database by hand.
 */

const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 20_000;

function SchoolCard({ school }: { school: School }) {
  const api = useApi();
  const qc = useQueryClient();
  const { strings } = useLocale();
  const t = strings.adminSignup;

  const [name, setName] = useState(school.name);
  const [dismissal, setDismissal] = useState(school.dismissal_time);
  const [radiusKm, setRadiusKm] = useState(school.geofence_radius_m / 1000);
  const [location, setLocation] = useState<PickedLocation>({
    lat: school.lat,
    lng: school.lng,
  });
  const [saved, setSaved] = useState(false);

  const radiusM = Math.round(radiusKm * 1000);

  const dirty =
    name !== school.name ||
    dismissal !== school.dismissal_time ||
    radiusM !== school.geofence_radius_m ||
    location.lat !== school.lat ||
    location.lng !== school.lng;

  const save = useMutation({
    mutationFn: () =>
      api.updateSchool(school.id, {
        name: name.trim(),
        lat: location.lat,
        lng: location.lng,
        geofence_radius_m: Math.min(Math.max(radiusM, MIN_RADIUS_M), MAX_RADIUS_M),
        dismissal_time: dismissal,
      }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["schools"] });
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function reset() {
    setName(school.name);
    setDismissal(school.dismissal_time);
    setRadiusKm(school.geofence_radius_m / 1000);
    setLocation({ lat: school.lat, lng: school.lng });
  }

  return (
    <Card className="max-w-3xl">
      <p className="type-display-sm mb-6">{school.name}</p>

      <div className="grid gap-5 mobile:grid-cols-2 mb-6">
        <Field label={t.schoolName}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t.dismissalTime} hint={t.dismissalHint}>
          <Input
            type="time"
            dir="ltr"
            value={dismissal}
            onChange={(e) => setDismissal(e.target.value)}
          />
        </Field>
      </div>

      <LocationPicker value={location} radiusM={radiusM} onChange={setLocation} height={280} />

      <div className="mt-5">
        <Field
          label={`${t.radius} — ${radiusKm.toFixed(1)} km`}
          hint="Logged on entry. The announcement fires on ETA, not on this ring."
        >
          <input
            type="range"
            min={MIN_RADIUS_M / 1000}
            max={5}
            step={0.1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>
      </div>

      {save.isError ? (
        <p role="alert" className="type-body-sm text-error border border-error/30 rounded-md px-3 py-2 mt-4">
          {strings.errors.network}
        </p>
      ) : null}

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-hairline-soft">
        <Button
          variant="primary"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? strings.common.loading : strings.common.save}
        </Button>
        <Button variant="secondary" disabled={!dirty || save.isPending} onClick={reset}>
          {strings.common.cancel}
        </Button>
        {saved ? <span className="type-caption text-success">✓</span> : null}
      </div>
    </Card>
  );
}

export default function SchoolsPage() {
  const api = useApi();
  const { strings } = useLocale();
  const schools = useQuery({ queryKey: ["schools"], queryFn: () => api.listSchools() });

  return (
    <>
      <PageHeader
        title={strings.nav.schools}
        subtitle="Geofence radius and dismissal time drive the whole scheduling pipeline."
      />

      {schools.isLoading ? (
        <SkeletonRows rows={1} />
      ) : (
        schools.data?.map((s) => <SchoolCard key={s.id} school={s} />)
      )}
    </>
  );
}
