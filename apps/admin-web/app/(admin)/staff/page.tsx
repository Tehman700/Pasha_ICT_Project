"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, PhoneInput } from "@/components/ui/Input";
import { FormDialog, useAddDialog } from "@/components/ui/FormDialog";
import { isValidPhone } from "@pickup/shared";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";

export default function StaffPage() {
  const api = useApi();
  const { strings } = useLocale();
  const qc = useQueryClient();
  const dialog = useAddDialog();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "guard" | "admin" | "driver">("teacher");

  const addUser = useMutation({
    mutationFn: () =>
      api.createUser({ role, name: name.trim(), phone: phone.trim(), password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setName(""); setPhone(""); setPassword("");
      dialog.close();
    },
    onError: dialog.fail,
  });

  function submitUser() {
    if (name.trim().length < 2) return dialog.setError("Enter a full name.");
    if (!isValidPhone(phone)) return dialog.setError(strings.auth.phoneFormat);
    if (password.length < 8) return dialog.setError(strings.register.passwordShort);
    dialog.setError(null);
    addUser.mutate();
  }

  const users = useQuery({ queryKey: ["users"], queryFn: () => api.listUsers() });
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });

  const staff =
    users.data?.filter(
      (u) => u.role === "teacher" || u.role === "guard" || u.role === "admin",
    ) ?? [];

  return (
    <>
      <PageHeader
        title={strings.nav.staff}
        subtitle="Teachers stage children; the guard verifies at the gate. One app, two roles."
        action={
          <Button variant="primary" onClick={() => dialog.setOpen(true)}>
            {strings.common.add}
          </Button>
        }
      />

      {users.isLoading ? (
        <SkeletonRows rows={5} />
      ) : (
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>Role</TH>
            <TH>{strings.auth.phone}</TH>
            <TH align="end">Assigned class</TH>
          </THead>
          <TBody>
            {staff.map((u) => {
              const cls = classes.data?.find((c) => c.teacher_id === u.id);
              return (
                <TR key={u.id}>
                  <TD className="text-ink">{u.name}</TD>
                  <TD>
                    <Badge tone={u.role === "admin" ? "ink" : "neutral"}>
                      {strings.role[u.role]}
                    </Badge>
                  </TD>
                  <TD className="type-mono">{u.phone}</TD>
                  <TD align="end">{cls?.name ?? "—"}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
      <FormDialog
        open={dialog.open}
        title="Add a staff member"
        description="Teachers and guards sign into the staff app with these credentials. Role decides which screens they see."
        submitLabel={strings.common.add}
        busy={addUser.isPending}
        error={dialog.error}
        onClose={dialog.close}
        onSubmit={submitUser}
      >
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full h-10 px-3 bg-surface-card border border-hairline-strong rounded-md type-body-sm text-ink"
          >
            <option value="teacher">Teacher</option>
            <option value="guard">Guard</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label={strings.auth.phone} hint={strings.auth.phoneFormat}>
          <PhoneInput value={phone} onValueChange={setPhone} />
        </Field>
        <Field label={strings.auth.password} hint={strings.register.passwordShort}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
          />
        </Field>
      </FormDialog>
    </>
  );
}
