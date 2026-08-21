/**
 * TomTom: map tiles and place search.
 *
 * One provider for the dashboard and both apps, so a pin dropped in admin and
 * the same point drawn in the parent app are read off the same basemap.
 *
 * Replaced OpenStreetMap tiles + Nominatim on 21 Aug 2026. Nominatim was not
 * merely slow — it rate-limits browser traffic without a contact User-Agent,
 * so the school search on the signup form failed silently every time. It was
 * also called with `limit=1`, so there was never a list to choose from: it
 * either jumped somewhere or said "no results".
 *
 * What we deliberately do NOT use:
 *
 * - **Reverse geocoding.** Tested against Lahore and it is wrong, not merely
 *   imprecise: Liberty Market and Model Town are ~3km apart and return
 *   byte-identical address objects, both labelled Islamabad, with no street
 *   field at all. Karachi resolves correctly, so it is Lahore's data. Show a
 *   collector's position as a point on a map. Never as a sentence.
 */

/** Raster basemap tiles, in the {z}/{x}/{y} form Leaflet expects. */
export function tomtomTileUrl(key: string, style: "basic" | "hybrid" = "basic"): string {
  const layer = style === "hybrid" ? "hybrid" : "basic";
  return `https://api.tomtom.com/map/1/tile/${layer}/main/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
}

export const TOMTOM_ATTRIBUTION = "&copy; TomTom";

export type PlaceHit = {
  id: string;
  /** POI name where there is one, else the first line of the address. */
  name: string;
  /** The fuller address, for the second line of a result row. */
  address: string;
  lat: number;
  lng: number;
};

type RawResult = {
  id?: string;
  poi?: { name?: string };
  address?: { freeformAddress?: string; municipality?: string };
  position?: { lat?: number; lon?: number };
};

/**
 * Place and POI search, scoped to Pakistan.
 *
 * `countrySet=PK` is not a nicety. Unscoped, "Garrison" returns results on
 * three continents and the school an administrator actually wants is not on
 * the first page.
 *
 * Returns [] rather than throwing on a bad response: a failed search should
 * leave the map exactly as it was, with the pin the user already placed.
 */
export async function searchPlaces(
  key: string,
  query: string,
  opts: { limit?: number; signal?: AbortSignal; near?: { lat: number; lng: number } } = {},
): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    key,
    limit: String(opts.limit ?? 6),
    countrySet: "PK",
    typeahead: "true",
  });
  // Bias toward what is already on screen, so "gate" near a pinned school
  // ranks that school's own gate above one in another city.
  if (opts.near) {
    params.set("lat", String(opts.near.lat));
    params.set("lon", String(opts.near.lng));
  }

  const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?${params}`;

  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) return [];

  const body = (await res.json()) as { results?: RawResult[] };
  const out: PlaceHit[] = [];

  for (const r of body.results ?? []) {
    const lat = r.position?.lat;
    const lng = r.position?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;

    const address = r.address?.freeformAddress ?? r.address?.municipality ?? "";
    const name = r.poi?.name ?? address.split(",")[0] ?? q;
    if (!name) continue;

    out.push({ id: r.id ?? `${lat},${lng}`, name, address, lat, lng });
  }
  return out;
}
