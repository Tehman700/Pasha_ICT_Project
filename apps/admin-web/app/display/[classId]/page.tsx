"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { gsap, motion } from "@/lib/gsap";
import { etaLabel } from "@/lib/format";
import type { QueueEntry } from "@pickup/shared";

/**
 * Classroom display — the surface that replaces the teacher's push notification.
 *
 * A wall-mounted tablet in kiosk mode. Ink-inverted at giant type because it is
 * read from six metres away, not arm's length. This is the most animation-heavy
 * surface in the product, which is part of why it is a web route: GSAP and the
 * Web Audio API are both available here, and neither is on React Native.
 *
 * Announcement fires on ETA < ~120s — NOT on the 1km geofence ring. One or two
 * minutes is roughly 500–650m and varies with traffic. Every child of one trip
 * in this class batches into a single announcement, so a class does not hear
 * six separate calls for one van.
 *
 * NOTE: the announcement cycle below is a skeleton simulation on a timer. The
 * real trigger arrives over `/ws/classroom/{class_id}` — module M6.3/M6.4 — and
 * has no offline path, which is why M6.5 monitors device heartbeat.
 */
export default function ClassroomDisplayPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const api = useApi();
  const { strings } = useLocale();

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });
  const queue = useQuery({
    queryKey: ["queue", classId],
    queryFn: () => api.getQueue(classId),
  });

  const cls = classes.data?.find((c) => c.id === classId);
  const entries = queue.data ?? [];

  // Cycle through arrivals so the announcement motion is visible in the skeleton.
  const [announceIndex, setAnnounceIndex] = useState(0);
  useEffect(() => {
    if (entries.length < 2) return;
    const id = setInterval(
      () => setAnnounceIndex((i) => (i + 1) % entries.length),
      6000,
    );
    return () => clearInterval(id);
  }, [entries.length]);

  const active: QueueEntry | undefined = entries[announceIndex];

  const stageRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLSpanElement | null>(null);

  // Announcement entrance. Names rise and settle; the arrival curve is the one
  // expressive easing in the system and is reserved for exactly this moment.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(
        ".announce-label",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: motion.duration.fast, ease: motion.ease.entrance },
      )
        .fromTo(
          ".announce-name",
          { opacity: 0, y: 48, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: motion.duration.announce,
            ease: motion.ease.arrival,
            stagger: 0.09,
          },
          "-=0.05",
        )
        .fromTo(
          ".announce-meta",
          { opacity: 0 },
          { opacity: 1, duration: motion.duration.base, ease: motion.ease.standard },
          "-=0.4",
        );
    }, el);

    return () => ctx.revert();
  }, [active, announceIndex]);

  // Wall clock — a display with a stale clock is obviously dead.
  useEffect(() => {
    const tick = () => {
      if (clockRef.current) {
        clockRef.current.textContent = new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-inv-canvas text-inv-text flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-12 py-8 border-b border-inv-hairline">
        <div>
          <p className="type-label text-inv-muted mb-2">{strings.display.pairedTo}</p>
          <h1 className="text-[44px] leading-none tracking-[-1.3px]">
            {cls?.name ?? "—"}
          </h1>
        </div>
        <div className="text-end">
          <span
            ref={clockRef}
            className="text-[44px] leading-none tabular-nums font-[family-name:var(--font-jetbrains)]"
          />
          <p className="type-label text-inv-muted mt-2">
            <span className="inline-block w-2 h-2 rounded-full bg-inv-success me-2 align-middle" />
            {strings.common.online}
          </p>
        </div>
      </header>

      {/* Announcement stage */}
      <div
        ref={stageRef}
        className="flex-1 flex flex-col items-center justify-center px-12 py-16 text-center"
      >
        {!active ? (
          <p className="text-[40px] text-inv-muted">{strings.display.waiting}</p>
        ) : (
          <>
            <p className="announce-label type-label text-inv-muted mb-8">
              {active.status === "AT_GATE"
                ? strings.display.atGate
                : `${active.collector_name} · ${strings.display.arrivingFor}`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mb-10">
              {active.sibling_group
                .filter((s) => s.class_name === cls?.name)
                .map((s) => (
                  <span
                    key={s.student_id}
                    className="announce-name text-[96px] desktop:text-[120px] leading-[1.05] tracking-[-3.6px]"
                  >
                    {s.student_name}
                  </span>
                ))}
            </div>

            <p className="announce-meta text-[28px] text-inv-muted">
              {active.status === "AT_GATE" ? (
                <span className="text-inv-success">{strings.queue.arrivingNow}</span>
              ) : (
                <>
                  {strings.display.inAboutTwoMinutes}
                  <span className="text-primary ms-3 tabular-nums">
                    {etaLabel(active.eta_seconds)}
                  </span>
                </>
              )}
            </p>
          </>
        )}
      </div>

      {/* Upcoming */}
      <footer className="border-t border-inv-hairline px-12 py-8">
        <p className="type-label text-inv-muted mb-5">{strings.queue.title}</p>
        <ul className="flex flex-wrap gap-x-12 gap-y-4">
          {entries.map((e, i) => (
            <li
              key={e.pickup_request_id}
              className={`flex items-baseline gap-4 ${i === announceIndex ? "" : "opacity-45"}`}
            >
              <span className="text-[22px] tabular-nums text-inv-muted w-6">
                {e.position}
              </span>
              <span className="text-[26px]">{e.student_name}</span>
              <span className="text-[20px] text-inv-muted tabular-nums">
                {etaLabel(e.eta_seconds)}
              </span>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
