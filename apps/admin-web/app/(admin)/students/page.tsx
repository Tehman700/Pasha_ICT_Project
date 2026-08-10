"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader, SkeletonRows, EmptyState } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";
import { Field } from "@/components/ui/Input";
import { FormDialog, useAddDialog } from "@/components/ui/FormDialog";

export default function StudentsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const { strings } = useLocale();
  const [q, setQ] = useState("");

  const dialog = useAddDialog();
  const [name, setName] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [classId, setClassId] = useState("");
  const [cnic, setCnic] = useState("");

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });

  const add = useMutation({
    mutationFn: () =>
      api.createStudent({
        name: name.trim(),
        name_ur: nameUr.trim() || null,
        class_id: classId,
        guardian_cnic: cnic.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setName(""); setNameUr(""); setCnic("");
      dialog.close();
    },
    onError: dialog.fail,
  });

  function submit() {
    if (name.trim().length < 1) return dialog.setError("Enter the child's name.");
    if (!classId) return dialog.setError("Choose a class.");
    dialog.setError(null);
    add.mutate();
  }

  const students = useQuery({ queryKey: ["students"], queryFn: () => api.listStudents() });
  const auths = useQuery({
    queryKey: ["authorizations"],
    queryFn: () => api.listAuthorizations(),
  });

  const rows =
    students.data?.filter((s) =>
      q ? s.name.toLowerCase().includes(q.toLowerCase()) : true,
    ) ?? [];

  return (
    <>
      <PageHeader
        title={strings.nav.students}
        subtitle="Every child, their class, and who is currently authorized to collect them."
        action={
          <Button variant="primary" onClick={() => dialog.setOpen(true)}>
            {strings.common.add}
          </Button>
        }
      />

      <div className="mb-6 max-w-sm">
        <Input
          placeholder={strings.common.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {students.isLoading ? (
        <SkeletonRows rows={6} />
      ) : !rows.length ? (
        <EmptyState message={strings.common.empty} />
      ) : (
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>اردو</TH>
            <TH>{strings.nav.classes}</TH>
            <TH align="end">Authorized collectors</TH>
          </THead>
          <TBody>
            {rows.map((s) => {
              const active =
                auths.data?.filter((a) => a.student_id === s.id && !a.revoked_at) ?? [];
              return (
                <TR key={s.id}>
                  <TD className="text-ink">{s.name}</TD>
                  <TD>
                    <span className="font-[family-name:var(--font-nastaliq)] leading-[1.9]">
                      {s.name_ur}
                    </span>
                  </TD>
                  <TD>{s.class_name}</TD>
                  <TD align="end">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {active.length === 0 ? (
                        <span className="type-caption text-muted-soft">none</span>
                      ) : (
                        active.map((a) => (
                          <Badge
                            key={a.id}
                            tone={a.collector_role === "driver" ? "primary" : "neutral"}
                          >
                            {a.collector_name?.split(" (")[0]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <FormDialog
        open={dialog.open}
        title="Add a student"
        description="The guardian CNIC is what links a self-registering parent to this child. Getting it wrong means the parent registers successfully and then sees an empty app."
        submitLabel={strings.common.add}
        busy={add.isPending}
        error={dialog.error}
        onClose={dialog.close}
        onSubmit={submit}
      >
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Name in Urdu (optional)">
          <Input value={nameUr} onChange={(e) => setNameUr(e.target.value)} dir="rtl" />
        </Field>
        <Field label={strings.nav.classes}>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full h-10 px-3 bg-surface-card border border-hairline-strong rounded-md type-body-sm text-ink"
          >
            <option value="">—</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Guardian CNIC" hint="13 digits, as printed on the card.">
          <Input value={cnic} onChange={(e) => setCnic(e.target.value)} dir="ltr" />
        </Field>
      </FormDialog>
    </>
  );
}
