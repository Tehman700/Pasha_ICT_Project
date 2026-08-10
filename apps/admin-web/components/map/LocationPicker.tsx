"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Pick the school's gate on a map, and size the arrival radius around it.
 *
 * OpenStreetMap via Leaflet, and Nominatim for the address search — the same
 * reasoning as the driver map in the parent app: no API key, no billing
 * account, and no international card required to keep it working.
 *
 * Leaflet is imported dynamically inside an effect because it reaches for
 * `window` at module scope, which throws during Next's server render.
 *
 * What this component is actually for: the radius decides when the system says
 * a collector is "nearly here", and the announcement fires off ETA to this
 * exact point. A pin in the middle of a campus rather than on the gate parents
 * use is a quiet, permanent few-hundred-metre error in every arrival estimate
 * the school will ever produce — which is why the copy tells them to pin the
 * gate, and why the circle is drawn rather than left as a number.
 */

export type PickedLocation = { lat: number; lng: number };

type NominatimResult = { lat: string; lon: string; display_name: string };

const DEFAULT_CENTRE: PickedLocation = { lat: 30.3753, lng: 69.3451 }; // Pakistan

/** Kept in sync with `--color-primary` in globals.css — see the note at the
 *  circle below for why this cannot be the CSS variable itself. */
const PRIMARY = "#f54e00";

export function LocationPicker({
  value,
  radiusM,
  onChange,
  height = 340,
}: {
  value: PickedLocation | null;
  radiusM: number;
  onChange: (loc: PickedLocation) => void;
  height?: number;
}) {
  const { strings } = useLocale();
  const t = strings.adminSignup;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !hostRef.current || mapRef.current) return;

      const start = value ?? DEFAULT_CENTRE;
      const map = L.map(hostRef.current, { attributionControl: true }).setView(
        [start.lat, start.lng],
        value ? 16 : 5,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      setReady(true);

      cleanup = () => {
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Deliberately once — `value` is applied by the effect below, and
    // rebuilding the map on every pin move would fight the user's panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the current pin and radius.
  useEffect(() => {
    if (!ready || !mapRef.current || !value) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (cancelled || !map) return;

      if (!markerRef.current) {
        // Leaflet's default marker images resolve to a CDN path that this
        // app does not serve, so they 404 and the pin renders as a broken
        // image. A divIcon needs no assets at all and matches the palette.
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:18px;height:18px;border-radius:50%;
            background:var(--color-primary);
            border:3px solid var(--color-surface-card);
            box-shadow:0 0 0 1px var(--color-hairline-strong);
          "></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        markerRef.current = L.marker([value.lat, value.lng], { icon, draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current!.getLatLng();
          onChangeRef.current({ lat: p.lat, lng: p.lng });
        });
      } else {
        markerRef.current.setLatLng([value.lat, value.lng]);
      }

      if (!circleRef.current) {
        // Literal hex, not var(--color-primary): Leaflet writes these onto
        // the SVG `stroke`/`fill` *attributes*, and SVG attributes do not
        // resolve CSS custom properties — the circle would render black.
        circleRef.current = L.circle([value.lat, value.lng], {
          radius: radiusM,
          color: PRIMARY,
          weight: 2,
          fillColor: PRIMARY,
          fillOpacity: 0.08,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng([value.lat, value.lng]);
        circleRef.current.setRadius(radiusM);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, value, radiusM]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(query.trim());
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const hits: NominatimResult[] = await res.json();
      if (!hits.length) {
        setSearchError(t.noResults);
        return;
      }
      const loc = { lat: Number(hits[0].lat), lng: Number(hits[0].lon) };
      onChange(loc);
      mapRef.current?.setView([loc.lat, loc.lng], 16);
    } catch {
      setSearchError(t.noResults);
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(loc);
        mapRef.current?.setView([loc.lat, loc.lng], 16);
      },
      () => setSearchError(t.noResults),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2 mb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.findPlaceholder}
          aria-label={t.findLocation}
        />
        <Button type="submit" variant="secondary" disabled={searching}>
          {searching ? t.searching : t.search}
        </Button>
      </form>

      <div
        ref={hostRef}
        style={{ height }}
        className="rounded-lg overflow-hidden border border-hairline-strong bg-canvas-soft"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <p className="type-caption text-muted">
          {value ? (
            <>
              {t.pinnedAt}{" "}
              <span className="type-mono text-ink" dir="ltr">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </span>
            </>
          ) : (
            t.orDropPin
          )}
        </p>
        <Button type="button" variant="tertiary" onClick={useMyLocation}>
          {t.useMyLocation}
        </Button>
      </div>

      {searchError ? (
        <p className="type-caption text-error mt-2" role="alert">
          {searchError}
        </p>
      ) : null}
    </div>
  );
}
