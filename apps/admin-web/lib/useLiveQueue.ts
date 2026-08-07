"use client";

/**
 * Live queue and announcement subscriptions.
 *
 * The socket carries a *reason*, not the queue — subscribers re-read the
 * snapshot themselves, so a message arriving out of order can never paint a
 * stale queue on a teacher's screen.
 *
 * Falls back to polling rather than going dark. A queue that silently stops
 * updating is worse than one that updates slowly: the teacher has no way to
 * tell the difference between "nobody is arriving" and "this screen is broken".
 */

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/v1";
const STORAGE_KEY = "rukhsat.token";

/** Backoff between reconnect attempts, in ms. Capped so it always recovers. */
const RETRY_MS = [1000, 2000, 5000, 10000, 15000];

export type LiveStatus = "connecting" | "live" | "reconnecting" | "polling";

export function useLiveQueue(classId: string | null) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const attempt = useRef(0);
  const socket = useRef<WebSocket | null>(null);
  const closed = useRef(false);

  useEffect(() => {
    closed.current = false;
    let retry: ReturnType<typeof setTimeout>;
    let poll: ReturnType<typeof setInterval>;

    function invalidate() {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    }

    function connect() {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!token) {
        // Nothing to authenticate with — poll rather than loop on a socket
        // that will be refused.
        setStatus("polling");
        poll = setInterval(invalidate, 15000);
        return;
      }

      const url = `${WS_URL}/ws/queue/${classId ?? "all"}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      socket.current = ws;

      ws.onopen = () => {
        attempt.current = 0;
        setStatus("live");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // `ping` is the 25s heartbeat — proxies and mobile networks drop an
          // idle socket after ~60s, and the failure is silent.
          if (msg.type === "ping") return;
          invalidate();
        } catch {
          /* ignore malformed frames rather than tearing down a working socket */
        }
      };

      ws.onclose = () => {
        if (closed.current) return;
        const wait = RETRY_MS[Math.min(attempt.current, RETRY_MS.length - 1)]!;
        attempt.current += 1;

        // After a few failures, stop pretending and start polling. The screen
        // keeps working; it just updates on a timer.
        if (attempt.current > RETRY_MS.length) {
          setStatus("polling");
          poll = setInterval(invalidate, 15000);
          return;
        }
        setStatus("reconnecting");
        retry = setTimeout(connect, wait);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      closed.current = true;
      clearTimeout(retry);
      clearInterval(poll);
      socket.current?.close();
    };
  }, [classId, queryClient]);

  return status;
}

export type Announcement = {
  class_id: string;
  trip_id: string;
  collector_name: string;
  students: { student_id: string; student_name: string }[];
  eta_seconds: number | null;
  kind: string;
};

/**
 * The classroom display's subscription.
 *
 * This is the ONLY path by which a display learns to speak, and it has no
 * offline fallback — the trigger is computed server-side and pushed. A display
 * that loses this socket goes silent with no other symptom in the room, which
 * is why `status` is surfaced on screen and why the server tracks heartbeats.
 */
export function useAnnouncements(
  classId: string,
  onAnnounce: (a: Announcement) => void,
) {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const handler = useRef(onAnnounce);
  handler.current = onAnnounce;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let attempt = 0;
    let closed = false;

    function connect() {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!token) {
        setStatus("polling");
        return;
      }

      ws = new WebSocket(
        `${WS_URL}/ws/classroom/${classId}?token=${encodeURIComponent(token)}`,
      );

      ws.onopen = () => {
        attempt = 0;
        setStatus("live");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "update" && msg.data?.kind === "arrival") {
            handler.current(msg.data as Announcement);
          }
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        if (closed) return;
        setStatus("reconnecting");
        const wait = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]!;
        attempt += 1;
        retry = setTimeout(connect, wait);
      };

      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [classId]);

  return status;
}
