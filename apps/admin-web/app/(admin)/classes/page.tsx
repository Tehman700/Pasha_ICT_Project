"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { Field, Input } from "@/components/ui/Input";
import { FormDialog, useAddDialog } from "@/components/ui/FormDialog";

export default function ClassesPage() {
  const api = useApi();
  const { strings } = useLocale();

  const qc = useQueryClient();
  const dialog = useAddDialog();
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });
  const teachers = useQuery({
    queryKey: ["users", "teacher"],
    queryFn: () => api.listUsers("teacher"),
  });

  const add = useMutation({
    mutationFn: () =>
      api.createClass({ name: name.trim(), teacher_id: teacherId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      setName(""); setTeacherId("");
      dialog.close();
    },
    onError: dialog.fail,
  });

  function submit() {
    if (!name.trim()) return dialog.setError("Enter a class name.");
    dialog.setError(null);
    add.mutate();
  }
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => api.listDevices() });
  const gridRef = useStaggerIn<HTMLDivElement>([classes.data], { stagger: 0.07 });

  return (
    <>
      <PageHeader
        title={strings.nav.classes}
        subtitle="Each class needs a teacher and a paired display before it can announce."
        action={
          <Button variant="primary" onClick={() => dialog.setOpen(true)}>
            {strings.common.add}
          </Button>
        }
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
      <FormDialog
        open={dialog.open}
        title="Add a class"
        description="A class needs a teacher before its queue means anything, and a paired display before it can announce."
        submitLabel={strings.common.add}
        busy={add.isPending}
        error={dialog.error}
        onClose={dialog.close}
        onSubmit={submit}
      >
        <Field label="Class name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Teacher" hint="Optional now, required before the class queue is usable.">
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full h-10 px-3 bg-surface-card border border-hairline-strong rounded-md type-body-sm text-ink"
          >
            <option value="">—</option>
            {teachers.data?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
      </FormDialog>
    </>
  );
}
