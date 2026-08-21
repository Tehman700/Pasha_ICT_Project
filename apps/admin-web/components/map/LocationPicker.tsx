"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import { searchPlaces, type PlaceHit } from "@pickup/shared";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Pick the school's gate on a map, and size the arrival radius around it.
 *
 * OpenStreetMap via Leaflet, for both the basemap and the place search.
 *
 * Google Maps was tried and is one step away from usable. It renders Lahore
 * correctly, but with "This page can't load Google Maps correctly" and a
 * "For development purposes only" watermark across a darkened map - the
 * signature of a project with no billing account attached. Every other Google
 * Maps API on the key also answers "This API is not activated".
 *
 * Attach billing, enable the Maps JavaScript API, and swapping this back is
 * small. Until then a watermarked map is worse than a clean one, and OSM's
 * Pakistan POI data is better regardless.
 *
 * TomTom was tried before that and is worse than useless here: searching
 * "Bahria Town School Lahore" returned a school in Indian-administered
 * Kashmir, ~400km away, despite the query being scoped to Pakistan.
 *
 * OSM is what actually works. It finds "Beaconhouse School System, Maulana
 * Shaukat Ali Road", with street-level detail, because Pakistani cities are
 * well covered by community mapping.
 *
 * What this component is actually for: the radius decides when the system says
 * a collector is "nearly here", and the announcement fires off ETA to this
 * exact point. A pin in the middle of a campus rather than on the gate parents
 * use is a quiet, permanent few-hundred-metre error in every arrival estimate
 * the school will ever produce - which is why the copy says to pin the gate,
 * and why the circle is drawn rather than left as a number.
 */

export type PickedLocation = { lat: number; lng: number };

const DEFAULT_CENTRE: PickedLocation = { lat: 30.3753, lng: 69.3451 }; // Pakistan

/**
 * Kept in sync with `--color-primary` in globals.css. It cannot be the CSS
 * variable itself: Leaflet writes these onto the SVG stroke/fill ATTRIBUTES,
 * and SVG attributes do not resolve CSS custom properties - the circle would
 * render black.
 */
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
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      // Imported inside the effect: Leaflet reaches for `window` at module
      // scope, which throws during Next's server render.
      const L = (await import("leaflet")).default;
      if (cancelled || !hostRef.current || mapRef.current) return;

      const start = value ?? DEFAULT_CENTRE;
      const map = L.map(hostRef.current, { attributionControl: true }).setView(
        [start.lat, start.lng],
        value ? 16 : 5,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
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
    })().catch(() => setLoadError(true));

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Once. `value` is applied by the effect below; rebuilding the map on every
    // pin move would fight the user's panning.
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
        // Leaflet's default marker images resolve to a CDN path this app does
        // not serve, so they 404 and the pin renders as a broken image. A
        // divIcon needs no assets at all and matches the palette.
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
        circleRef.current = L.circle([value.lat, value.lng], {
          radius: radiusM,
          color: PRIMARY,
          weight: 2,
          fillColor: PRIMARY,
          fillOpacity: 0.08,
          // Must not swallow clicks meant for the map beneath it: the radius is
          // often larger than the visible map, which would make the picker inert.
          interactive: false,
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

  /*
   * Debounced as the administrator types, and `results` drives a real dropdown.
   *
   * The previous implementation asked for a single hit and silently moved the
   * pin to it, so a wrong first guess was indistinguishable from a broken
   * search - and it was broken, every time, because the free geocoder it used
   * rate-limits browser traffic.
   */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      const hits = await searchPlaces(q, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(hits);
      if (!hits.length) setSearchError(t.noResults);
      setSearching(false);
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, t.noResults]);

  function choose(hit: PlaceHit) {
    const loc = { lat: hit.lat, lng: hit.lng };
    onChange(loc);
    mapRef.current?.setView([loc.lat, loc.lng], 17);
    setResults([]);
    setQuery(hit.name);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(loc);
        mapRef.current?.setView([loc.lat, loc.lng], 17);
      },
      () => setSearchError(t.noResults),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      {/*
        A div, NOT a form. This renders inside the registration <form>, and
        nested forms are invalid HTML - the browser associates an inner submit
        button with the OUTER form, so searching used to submit the whole
        registration. Enter is intercepted below for the same reason.
      */}
      <div className="relative mb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results.length) choose(results[0]);
            }
            if (e.key === "Escape") setResults([]);
          }}
          placeholder={t.findPlaceholder}
          aria-label={t.findLocation}
          autoComplete="off"
          name="place-search"
        />

        {searching ? (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 type-caption text-muted">
            {t.searching}
          </span>
        ) : null}

        {results.length ? (
          <ul
            className="absolute z-[1000] start-0 end-0 mt-1 bg-surface-card border border-hairline-strong rounded-lg overflow-hidden max-h-64 overflow-y-auto"
            role="listbox"
          >
            {results.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(hit)}
                  className="w-full text-start px-3 py-2 hover:bg-canvas-soft border-b border-hairline last:border-b-0 transition-colors"
                >
                  <span className="type-body-sm text-ink block">{hit.name}</span>
                  {hit.address ? (
                    <span className="type-caption text-muted block truncate">{hit.address}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        ref={hostRef}
        style={{ height }}
        className="rounded-lg overflow-hidden border border-hairline-strong bg-canvas-soft"
      />

      {loadError ? (
        <p className="type-caption text-error mt-2" role="alert">
          {t.orDropPin}
        </p>
      ) : null}

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
