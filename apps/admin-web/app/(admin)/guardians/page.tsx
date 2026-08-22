"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";

/**
 * Guardians — the account heads.
 *
 * A parent is the head of their family's account: they add relatives directly
 * and pick vetted drivers from the school list, granting each access to their
 * own children only.
 */
export default function GuardiansPage() {
  const api = useApi();
  const { strings } = useLocale();

  // The role MUST be in the key. Three pages call listUsers with different
  // filters, and when they shared the key ["users"] whichever loaded first won
  // - so this page rendered drivers and admins as if they were guardians. On a
  // screen about who may collect a child, that is not a cosmetic bug.
  const users = useQuery({
    queryKey: ["users", "parent"],
    queryFn: () => api.listUsers("parent"),
  });
  const auths = useQuery({
    queryKey: ["authorizations"],
    queryFn: () => api.listAuthorizations(),
  });

  return (
    <>
      <PageHeader
        title={strings.nav.guardians}
        subtitle="Parents head their own account. Anyone they add collects only their children."
        action={<Button variant="primary">{strings.common.add}</Button>}
      />

      {users.isLoading ? (
        <SkeletonRows rows={6} />
      ) : (
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>{strings.auth.phone}</TH>
            <TH>Language</TH>
            <TH>Children</TH>
            <TH align="end">Collectors added</TH>
          </THead>
          <TBody>
            {users.data?.map((u) => {
              const granted =
                auths.data?.filter((a) => a.granted_by_user_id === u.id && !a.revoked_at) ??
                [];
              const children = new Set(granted.map((a) => a.student_id));
              const collectors = new Set(granted.map((a) => a.collector_user_id));
              return (
                <TR key={u.id}>
                  <TD className="text-ink">{u.name}</TD>
                  <TD className="type-mono">{u.phone}</TD>
                  <TD>
                    <Badge tone={u.locale === "ur" ? "ink" : "neutral"}>
                      {u.locale === "ur" ? "اردو" : "English"}
                    </Badge>
                  </TD>
                  <TD className="tabular-nums">{children.size}</TD>
                  <TD align="end" className="tabular-nums">
                    {collectors.size}
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
