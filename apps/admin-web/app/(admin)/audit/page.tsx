"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows, EmptyState } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";
import { dateTimeLabel } from "@/lib/format";

/**
 * Audit log — one of the three things marked "never cut".
 *
 * Manual handovers surface flagged. That is a designed-in strength, not a
 * weakness to hide: it proves the system was built for a real gate, where
 * phones die and grandmothers arrive without the app.
 */
export default function AuditPage() {
  const api = useApi();
  const { strings } = useLocale();
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const log = useQuery({
    queryKey: ["audit", flaggedOnly],
    queryFn: () => api.listAuditLog({ flaggedOnly }),
  });

  return (
    <>
      <PageHeader
        title={strings.audit.title}
        subtitle="Every handover, authorization change, and system action — permanently recorded."
        action={
          <Button
            variant={flaggedOnly ? "ink" : "secondary"}
            onClick={() => setFlaggedOnly((v) => !v)}
          >
            {strings.audit.flaggedOnly}
          </Button>
        }
      />

      {log.isLoading ? (
        <SkeletonRows rows={5} />
      ) : !log.data?.length ? (
        <EmptyState message={strings.common.empty} />
      ) : (
        <Table>
          <THead>
            <TH>{strings.audit.when}</TH>
            <TH>{strings.audit.actor}</TH>
            <TH>{strings.audit.action}</TH>
            <TH>Detail</TH>
            <TH align="end" />
          </THead>
          <TBody>
            {log.data.map((row) => (
              <TR key={row.id}>
                <TD className="tabular-nums whitespace-nowrap">
                  {dateTimeLabel(row.created_at)}
                </TD>
                <TD className={row.actor_user_id ? "text-ink" : "text-muted italic"}>
                  {row.actor_name}
                </TD>
                <TD>
                  <span className="type-mono text-ink">{row.action}</span>
                </TD>
                <TD>
                  <span className="type-caption text-muted">
                    {Object.entries(row.payload)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </span>
                </TD>
                <TD align="end">
                  {row.flagged ? <Badge tone="error">{strings.audit.flagged}</Badge> : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
