"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows, StatTile } from "@/components/ui/Misc";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/Table";

/**
 * Name recordings.
 *
 * Announcements stitch pre-recorded clips rather than using device TTS:
 * Android's Urdu TTS is unreliable on cheap hardware, and an English voice
 * mangles Pakistani names.
 *
 * One clip per person covers BOTH languages — a name sounds the same either
 * way. Only the ~6 surrounding template phrases are recorded twice.
 *
 * The setup burden is real (~75 clips for a 30-student school), so this screen
 * has to make bulk recording fast or the feature never gets used.
 */
export default function AudioPage() {
  const api = useApi();
  const { strings } = useLocale();

  const students = useQuery({ queryKey: ["students"], queryFn: () => api.listStudents() });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.listUsers() });
  const audio = useQuery({ queryKey: ["nameAudio"], queryFn: () => api.listNameAudio() });

  const recordedIds = new Set(audio.data?.map((a) => a.subject_id));

  const collectors =
    users.data?.filter((u) => u.role === "parent" || u.role === "driver") ?? [];
  const subjects = [
    ...(students.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      kind: "student" as const,
    })),
    ...collectors.map((u) => ({
      id: u.id,
      name: u.name,
      kind: "collector" as const,
    })),
  ];

  const recorded = subjects.filter((s) => recordedIds.has(s.id)).length;
  const pct = subjects.length ? Math.round((recorded / subjects.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title={strings.audio.title}
        subtitle={strings.audio.subtitle}
        action={<Button variant="primary">Bulk record</Button>}
      />

      <div className="grid gap-4 mobile:grid-cols-3 mb-10">
        <StatTile label="Recorded" value={`${recorded}`} sub={`of ${subjects.length} people`} />
        <StatTile
          label="Coverage"
          value={`${pct}%`}
          tone={pct === 100 ? "success" : "error"}
          sub={pct < 100 ? "missing clips fall back to class + count" : "every name has a clip"}
        />
        <StatTile label="Template phrases" value="6" sub="recorded twice — en and ur" />
      </div>

      <Card className="mb-8">
        <p className="type-label text-muted mb-3">Announcement template</p>
        <p className="type-body text-ink leading-relaxed">
          <span className="bg-primary/12 text-primary rounded-xs px-1.5 py-0.5">
            [collector clip]
          </span>{" "}
          <span className="text-muted">{strings.display.arrivingFor}</span>{" "}
          <span className="bg-primary/12 text-primary rounded-xs px-1.5 py-0.5">
            [child clip]
          </span>{" "}
          <span className="text-muted">{strings.display.inAboutTwoMinutes}</span>
        </p>
      </Card>

      {students.isLoading ? (
        <SkeletonRows rows={6} />
      ) : (
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>Type</TH>
            <TH>{strings.audio.duration}</TH>
            <TH align="end">Status</TH>
          </THead>
          <TBody>
            {subjects.map((s) => {
              const clip = audio.data?.find((a) => a.subject_id === s.id);
              return (
                <TR key={s.id}>
                  <TD className="text-ink">{s.name}</TD>
                  <TD>{s.kind === "student" ? "Child" : "Collector"}</TD>
                  <TD className="tabular-nums">
                    {clip ? `${(clip.duration_ms / 1000).toFixed(1)}s` : "—"}
                  </TD>
                  <TD align="end">
                    {clip ? (
                      <Badge tone="success">{strings.audio.recorded}</Badge>
                    ) : (
                      <Badge tone="error">{strings.audio.missing}</Badge>
                    )}
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
