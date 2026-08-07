"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { gsap, motion } from "@/lib/gsap";
import { useAnnouncements, type Announcement } from "@/lib/useLiveQueue";
import { etaLabel } from "@/lib/format";

const HEARTBEAT_MS = 60_000;

/**
 * Classroom display — the surface that replaces the teacher's push notification.
 *
 * A wall-mounted tablet or an old phone, plugged into the school's existing PA
 * amplifier. We are not installing a PA system: every school gate here already
 * has one, and every teacher already responds to it. Same information,
 * different last mile.
 *
 * Built as a web route rather than a React Native screen on purpose. Pairing a
 * display becomes "open a URL and type a code" instead of "install an APK",
 * and GSAP plus the Web Audio API are both available here.
 *
 * It is ink-inverted at giant type because it is read from six metres away.
 */
export default function ClassroomDisplayPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const api = useApi();
  const { strings } = useLocale();

  const [current, setCurrent] = useState<Announcement | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api.listClasses() });
  const queue = useQuery({
    queryKey: ["queue", classId],
    queryFn: () => api.getQueue(classId),
    refetchInterval: 20_000,
  });

  const cls = classes.data?.find((c) => c.id === classId);

  const onAnnounce = useCallback((a: Announcement) => {
    setCurrent(a);
    // Clear after a while so the screen returns to the waiting state rather
    // than showing a stale name for the rest of the afternoon.
    setTimeout(() => setCurrent(null), 25_000);
  }, []);

  const status = useAnnouncements(classId, onAnnounce);

  // Heartbeat. A display that stops sending this has no other symptom in the
  // room — nobody knows it is broken, they just stop hearing names. The
  // dashboard is the only place that failure becomes visible.
  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("rukhsat.device") : null;
    setDeviceId(stored);
    if (!stored) return;

    const beat = () => {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1"}/devices/${stored}/heartbeat`,
        { method: "POST" },
      ).catch(() => {});
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, []);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
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
  }, [current]);

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

  const live = status === "live";

  return (
    <div className="min-h-screen bg-inv-canvas text-inv-text flex flex-col">
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
            <span
              className={`inline-block w-2 h-2 rounded-full me-2 align-middle ${
                live ? "bg-inv-success" : "bg-inv-error"
              }`}
            />
            {live ? strings.common.online : status}
          </p>
        </div>
      </header>

      {/* A display that has lost the socket must say so. Silence with no
          explanation is the failure this whole surface has to avoid. */}
      {!live ? (
        <div className="bg-inv-error/15 border-b border-inv-error/40 px-12 py-3">
          <p className="text-[20px] text-inv-error">
            Not receiving announcements — check this display
          </p>
        </div>
      ) : null}

      <div
        ref={stageRef}
        className="flex-1 flex flex-col items-center justify-center px-12 py-16 text-center"
      >
        {!current ? (
          <p className="text-[40px] text-inv-muted">{strings.display.waiting}</p>
        ) : (
          <>
            <p className="announce-label type-label text-inv-muted mb-8">
              {current.collector_name} · {strings.display.arrivingFor}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mb-10">
              {current.students.map((s) => (
                <span
                  key={s.student_id}
                  className="announce-name text-[96px] desktop:text-[120px] leading-[1.05] tracking-[-3.6px]"
                >
                  {s.student_name}
                </span>
              ))}
            </div>

            <p className="announce-meta text-[28px] text-inv-muted">
              {strings.display.inAboutTwoMinutes}
              <span className="text-primary ms-3 tabular-nums">
                {etaLabel(current.eta_seconds)}
              </span>
            </p>
          </>
        )}
      </div>

      <footer className="border-t border-inv-hairline px-12 py-8">
        <p className="type-label text-inv-muted mb-5">{strings.queue.title}</p>
        <ul className="flex flex-wrap gap-x-12 gap-y-4">
          {(queue.data ?? []).map((e) => (
            <li key={e.pickup_request_id} className="flex items-baseline gap-4">
              <span className="text-[22px] tabular-nums text-inv-muted w-6">
                {e.position}
              </span>
              <span className="text-[26px]">{e.student_name}</span>
              <span className="text-[20px] text-inv-muted tabular-nums">
                {etaLabel(e.eta_seconds)}
              </span>
            </li>
          ))}
          {(queue.data ?? []).length === 0 ? (
            <li className="text-[22px] text-inv-muted">{strings.queue.noneInQueue}</li>
          ) : null}
        </ul>
        {!deviceId ? (
          <p className="type-caption text-inv-muted mt-6">
            This display is not paired — the dashboard cannot tell if it stops working.
          </p>
        ) : null}
      </footer>
    </div>
  );
}
