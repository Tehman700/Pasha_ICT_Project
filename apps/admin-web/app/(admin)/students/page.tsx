"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader, SkeletonRows, EmptyState } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";

export default function StudentsPage() {
  const api = useApi();
  const { strings } = useLocale();
  const [q, setQ] = useState("");

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
        action={<Button variant="primary">{strings.common.add}</Button>}
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
    </>
  );
}
