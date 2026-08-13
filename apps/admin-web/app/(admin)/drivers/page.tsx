"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, PhoneInput } from "@/components/ui/Input";
import { FormDialog, useAddDialog } from "@/components/ui/FormDialog";
import { isValidPhone } from "@pickup/shared";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";

/**
 * Driver registry.
 *
 * Drivers are registered and vetted by the school exactly once. Parents then
 * pick from this list and authorize their own children — which is what keeps
 * one driver as one account. If each parent created their own driver record,
 * one van would appear eight times in the queue.
 */
export default function DriversPage() {
  const api = useApi();
  const { strings } = useLocale();
  const qc = useQueryClient();
  const dialog = useAddDialog();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "guard" | "admin" | "driver">("driver");

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

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: () => api.listVehicles() });
  const auths = useQuery({
    queryKey: ["authorizations"],
    queryFn: () => api.listAuthorizations(),
  });

  const gridRef = useStaggerIn<HTMLDivElement>([vehicles.data], { stagger: 0.07 });

  return (
    <>
      <PageHeader
        title={strings.drivers.title}
        subtitle={strings.drivers.subtitle}
        action={
          <Button variant="primary" onClick={() => dialog.setOpen(true)}>
            {strings.drivers.addDriver}
          </Button>
        }
      />

      {vehicles.isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <div ref={gridRef} className="grid gap-4 desktop:grid-cols-2 mb-10">
          {vehicles.data?.map((v) => {
            const active =
              auths.data?.filter(
                (a) => a.collector_user_id === v.driver_user_id && !a.revoked_at,
              ) ?? [];
            const families = new Set(active.map((a) => a.granted_by_user_id));

            return (
              <Card key={v.id}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="type-title-md">{v.driver_name}</p>
                    <p className="type-mono text-muted mt-1">{v.registration_no}</p>
                  </div>
                  <Badge tone="primary">{strings.role.driver}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-5 border-t border-hairline-soft">
                  <div>
                    <p className="type-label text-muted-soft mb-1.5">
                      {strings.drivers.authorizedChildren}
                    </p>
                    <p className="type-display-sm tabular-nums">{active.length}</p>
                  </div>
                  <div>
                    <p className="type-label text-muted-soft mb-1.5">Families</p>
                    <p className="type-display-sm tabular-nums">{families.size}</p>
                  </div>
                  <div>
                    <p className="type-label text-muted-soft mb-1.5">
                      {strings.drivers.capacity}
                    </p>
                    <p className="type-display-sm tabular-nums text-muted">{v.capacity}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="type-display-sm mb-4">Authorizations</h2>
      <p className="type-body-sm text-muted mb-5 max-w-2xl">
        Each row is one family granting one collector access to one child.
        Revocation is per-family — removing a driver here never affects another
        family&apos;s authorization.
      </p>

      <Table>
        <THead>
          <TH>Child</TH>
          <TH>Collector</TH>
          <TH>Granted by</TH>
          <TH>Kind</TH>
          <TH align="end">Status</TH>
        </THead>
        <TBody>
          {auths.data?.map((a) => (
            <TR key={a.id}>
              <TD className="text-ink">{a.student_name}</TD>
              <TD>
                {a.collector_name}
                {a.collector_role === "driver" && (
                  <Badge tone="primary" className="ms-2">
                    {strings.role.driver}
                  </Badge>
                )}
              </TD>
              <TD>{a.granted_by_name}</TD>
              <TD>
                <Badge tone={a.kind === "one_time" ? "neutral" : "ink"}>
                  {a.kind === "one_time" ? "one-time" : "standing"}
                </Badge>
              </TD>
              <TD align="end">
                {a.revoked_at ? (
                  <Badge tone="error">revoked</Badge>
                ) : (
                  <Badge tone="success">active</Badge>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <FormDialog
        open={dialog.open}
        title="Register a driver"
        description="A driver stays invisible to every family until a parent links him by phone number. The school vets nobody."
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
            <option value="driver">Driver</option>
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
