/**
 * Place search over OpenStreetMap data.
 *
 * Chosen on evidence, not preference. Searching Pakistani schools:
 *
 *   "Beaconhouse School System Lahore"
 *     OSM     Beaconhouse School System, Maulana Shaukat Ali Road  31.4603,74.3249
 *     TomTom  Kinnaird Model School System (100km away), and
 *             Beacon House School in Islamabad
 *
 *   "Bahria Town School Lahore"
 *     OSM     Bahria Town School & College, Premier Campus        31.3448,74.1742
 *     TomTom  Middle School Satellite Town, 33.8855,74.7781 - which is in
 *             Indian-administered Kashmir, ~400km from Lahore, returned
 *             despite countrySet=PK
 *
 * Google Places would likely beat both, but Places API is not enabled on the
 * project's key. When it is, this is the one function to swap.
 *
 * Nominatim's usage policy asks for no more than one request per second and a
 * way to identify the caller. The browser sends a Referer automatically, and
 * every caller here debounces, so a person typing a school name produces a
 * handful of requests, once, when their school is first set up.
 */

export type PlaceHit = {
  id: string;
  /** The first, most specific line - usually the school's own name. */
  name: string;
  /** The rest of the address, for the second line of a result row. */
  address: string;
  lat: number;
  lng: number;
};

type NominatimResult = {
  place_id?: number | string;
  lat: string;
  lon: string;
  display_name: string;
};

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

/**
 * Returns [] rather than throwing: a failed search should leave the map
 * exactly as it was, with whatever pin the user already placed.
 */
export async function searchPlaces(
  query: string,
  opts: { limit?: number; signal?: AbortSignal } = {},
): Promise<PlaceHit[]> {
  const q = query.trim();
  // Two characters match half of Punjab and cost a request to find that out.
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    format: "json",
    limit: String(opts.limit ?? 6),
    // Not a nicety: unscoped, "Garrison" returns results on three continents
    // and the school the administrator wants is not on the first page.
    countrycodes: "pk",
    q,
  });

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, {
      signal: opts.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];

    const rows = (await res.json()) as NominatimResult[];
    return rows.map((r, i) => {
      // display_name is "Name, Road, Area, City, Province, Country". The first
      // part is what someone recognises; the rest is how they tell two
      // campuses of the same school apart.
      // display_name always has at least one segment, but noUncheckedIndexedAccess
      // does not know that.
      const parts = r.display_name.split(",");
      const first = parts[0] ?? r.display_name;
      const rest = parts.slice(1);
      return {
        id: String(r.place_id ?? `${r.lat},${r.lon},${i}`),
        name: first.trim(),
        address: rest.join(",").trim(),
        lat: Number(r.lat),
        lng: Number(r.lon),
      };
    });
  } catch {
    return [];
  }
}
