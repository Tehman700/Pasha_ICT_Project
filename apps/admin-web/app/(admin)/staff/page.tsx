"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";

export default function StaffPage() {
  const api = useApi();
  const { strings } = useLocale();

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
        action={<Button variant="primary">{strings.common.add}</Button>}
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
    </>
  );
}
