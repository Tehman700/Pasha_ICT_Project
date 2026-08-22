import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@pickup/ui-native";
import type { Trip } from "@pickup/shared";

/**
 * The live trip: start it, ask for location once, then stream position.
 *
 * This is what "On my way" actually means. Before this existed the button
 * only navigated to a screen — no trip was created, no permission was asked,
 * no position was ever sent — so the ETA never moved, the queue never
 * ordered, the QR screen had no trip to fetch codes for, and the classroom
 * announcement could never fire. Every one of those looked like a separate
 * bug and was this one.
 *
 * FOREGROUND ONLY, deliberately:
 *   - `requestForegroundPermissionsAsync`, never Background.
 *   - `watchPositionAsync` lives with this hook and is removed on unmount, so
 *     leaving the screen stops the stream.
 *   - A hard stop at TRIP_MAX_MINUTES so a forgotten screen cannot transmit
 *     all afternoon.
 * See docs/SECURITY.md — the server does the geofencing precisely so this app
 * never needs the background permission, and app.json blocks it outright.
 *
 * A denied permission is NOT an error state. The schedule is the backstop: the
 * child is still on today's list, the school still expects them, and the
 * driver's declared arrival time still applies. Only the live ETA is lost, so
 * the UI says that plainly instead of blocking.
 */

const TRIP_MAX_MINUTES = 90;

/** Matches the server's expectations without spamming a 1.9GB box. */
const MIN_INTERVAL_MS = 10_000;
const MIN_DISTANCE_M = 25;

export type TripStatus = {
  eta_seconds: number;
  distance_m: number;
  inside_geofence: boolean;
  status: string;
};

export type PermissionState = "unknown" | "granted" | "denied";

export function useLiveTrip(enabled: boolean) {
  const api = useApi();
  const qc = useQueryClient();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [status, setStatus] = useState<TripStatus | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
  }, []);

  /** Ask for permission and begin streaming. Safe to call more than once. */
  const beginTracking = useCallback(
    async (tripId: string) => {
      if (subRef.current) return;

      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        setPermission("denied");
        return;
      }
      setPermission("granted");

      const startedAt = Date.now();

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: MIN_INTERVAL_MS,
          distanceInterval: MIN_DISTANCE_M,
        },
        async (pos) => {
          if (stoppedRef.current) return;

          // Hard stop rather than relying on the screen being closed — a phone
          // left on a dashboard would otherwise transmit for hours.
          if (Date.now() - startedAt > TRIP_MAX_MINUTES * 60_000) {
            stop();
            return;
          }

          const ping = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(ping);
          try {
            const next = await api.postLocation(tripId, ping);
            setStatus(next);
            // The parent's own queue position is derived from this.
            qc.invalidateQueries({ queryKey: ["myQueueEntry"] });
          } catch {
            // A dropped ping is not worth interrupting a drive for; the next
            // fix carries the same information a few seconds later.
          }
        },
      );
    },
    [api, qc, stop],
  );

  /** Ensure a trip exists, then track against it. */
  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const existing = await api.getMyTrip();
      const active = existing ?? (await api.startTrip());
      setTrip(active);
      qc.invalidateQueries({ queryKey: ["myTrip"] });
      await beginTracking(active.id);
    } catch (err) {
      // The server has a real reason and it is usually actionable. Collapsing
      // it to "check your connection" sent people to look at their signal when
      // the actual answer was "nobody is scheduled for you today" - which no
      // amount of reconnecting fixes.
      const e = err as { status?: number; message?: string };
      setError(e?.status === 409 && e.message ? e.message : "failed");
    } finally {
      setStarting(false);
    }
  }, [api, qc, beginTracking]);

  useEffect(() => {
    stoppedRef.current = false;
    if (enabled) void start();
    return () => {
      stoppedRef.current = true;
      stop();
    };
  }, [enabled, start, stop]);

  /** Retry after a denial — Android shows the sheet again unless the user
   *  ticked "don't ask", in which case this is a no-op and the copy stands. */
  const retryPermission = useCallback(async () => {
    if (trip) await beginTracking(trip.id);
  }, [trip, beginTracking]);

  return { trip, permission, status, coords, starting, error, retryPermission, stop };
}
