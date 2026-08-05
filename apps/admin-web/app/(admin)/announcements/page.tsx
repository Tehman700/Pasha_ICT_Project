"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SkeletonRows } from "@/components/ui/Misc";
import { dateTimeLabel } from "@/lib/format";

/**
 * Broadcast announcements (Tier 2).
 *
 * Every announcement carries both languages in the same record — there is no
 * "translate later" path, because a parent who reads only Urdu would otherwise
 * receive an empty message.
 */
export default function AnnouncementsPage() {
  const api = useApi();
  const { strings } = useLocale();

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.listAnnouncements(),
  });
  const listRef = useStaggerIn<HTMLDivElement>([list.data], { stagger: 0.07 });

  return (
    <>
      <PageHeader
        title={strings.nav.announcements}
        subtitle="Both languages are required on every announcement, in the same record."
        action={<Button variant="primary">{strings.common.add}</Button>}
      />

      {list.isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <div ref={listRef} className="space-y-4 max-w-4xl">
          {list.data?.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <Badge tone="neutral">{a.audience}</Badge>
                {a.sent_at ? (
                  <span className="type-caption text-muted tabular-nums">
                    {dateTimeLabel(a.sent_at)}
                  </span>
                ) : (
                  <Badge tone="primary">draft</Badge>
                )}
              </div>

              <div className="grid gap-6 tablet:grid-cols-2">
                <div>
                  <p className="type-label text-muted-soft mb-2">English</p>
                  <p className="type-title-md mb-1.5">{a.title_en}</p>
                  <p className="type-body-sm text-body">{a.body_en}</p>
                </div>
                <div dir="rtl" className="tablet:border-s tablet:border-hairline-soft tablet:ps-6">
                  <p className="type-label text-muted-soft mb-2">اردو</p>
                  <p className="type-title-md mb-1.5 font-[family-name:var(--font-nastaliq)] leading-[1.9]">
                    {a.title_ur}
                  </p>
                  <p className="type-body-sm text-body font-[family-name:var(--font-nastaliq)] leading-[1.95]">
                    {a.body_ur}
                  </p>
                </div>
              </div>

              {!a.sent_at && (
                <div className="mt-6 pt-5 border-t border-hairline-soft">
                  <Button variant="primary">Send</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
