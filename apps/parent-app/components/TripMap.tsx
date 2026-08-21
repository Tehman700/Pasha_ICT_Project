import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { T, colors, radius, spacing } from "@pickup/ui-native";
import { TOMTOM_ATTRIBUTION, tomtomTileUrl } from "@pickup/shared";

/**
 * Shipped inside the app bundle, which is unavoidable for client-side tiles.
 * Restrict it by bundle id in my.tomtom.com rather than trying to hide it.
 */
const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY ?? "";

/**
 * TomTom tiles via Leaflet in a WebView.
 *
 * NOT react-native-maps, still deliberately: that needs a native map SDK and a
 * dev build, and this renders the same two dots and a line for a fraction of
 * the weight. The tiles moved from OpenStreetMap to TomTom on 21 Aug 2026 so
 * the dashboard and the apps draw a pin on the same basemap.
 *
 * The map shows WHERE the van is. It never says where the van is in words -
 * TomTom's reverse geocoding is wrong for Lahore, returning byte-identical
 * addresses for points kilometres apart. Coordinates on a map, never a
 * sentence. See packages/shared/src/maps/tomtom.ts.
 *
 * Tiles load over the network. With no signal the WebView shows the fallback
 * rather than a blank grey box, because a parent staring at nothing assumes
 * the app is broken.
 */
export function TripMap({
  lat,
  lng,
  schoolLat,
  schoolLng,
  height = 200,
  label = "Van",
}: {
  lat: number | null;
  lng: number | null;
  schoolLat: number;
  schoolLng: number;
  height?: number;
  label?: string;
}) {
  const html = useMemo(() => {
    const hasCollector = lat !== null && lng !== null;
    const centerLat = hasCollector ? (lat! + schoolLat) / 2 : schoolLat;
    const centerLng = hasCollector ? (lng! + schoolLng) / 2 : schoolLng;

    return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html,body,#map{height:100%;margin:0;background:${colors.canvasSoft}}
  .leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,.7)}
  .pin{border-radius:50%;border:3px solid #fff}
  .pin-school{background:${colors.ink}}
  .pin-collector{background:${colors.primary}}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: true })
    .setView([${centerLat}, ${centerLng}], ${hasCollector ? 13 : 15});

  L.tileLayer('${tomtomTileUrl(TOMTOM_KEY)}', {
    maxZoom: 22,
    attribution: '${TOMTOM_ATTRIBUTION}'
  }).addTo(map);

  var dot = function (cls) {
    return L.divIcon({
      className: '',
      html: '<div class="pin ' + cls + '" style="width:14px;height:14px"></div>',
      iconSize: [20, 20], iconAnchor: [10, 10]
    });
  };

  L.marker([${schoolLat}, ${schoolLng}], { icon: dot('pin-school') })
    .addTo(map).bindPopup('School');

  ${
    hasCollector
      ? `
  var collector = L.marker([${lat}, ${lng}], { icon: dot('pin-collector') })
    .addTo(map).bindPopup(${JSON.stringify(label)});

  // Straight line, not a route. We never call a routing API — it bills per
  // request and we would hit it every 15 seconds per active trip.
  L.polyline([[${lat}, ${lng}], [${schoolLat}, ${schoolLng}]], {
    color: '${colors.primary}', weight: 2, opacity: .5, dashArray: '6 6'
  }).addTo(map);

  map.fitBounds(L.latLngBounds([[${lat}, ${lng}], [${schoolLat}, ${schoolLng}]]),
    { padding: [40, 40] });`
      : ""
  }
</script>
</body></html>`;
  }, [lat, lng, schoolLat, schoolLng, label]);

  return (
    <View
      style={{
        height,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
        backgroundColor: colors.canvasSoft,
      }}
    >
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: colors.canvasSoft }}
        originWhitelist={["*"]}
        scrollEnabled={false}
        // A parent staring at a blank grey box assumes the app is broken.
        renderError={() => (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: spacing.md,
            }}
          >
            <T variant="caption" color={colors.muted} align="center">
              Map unavailable offline{"\n"}Your position is still being shared
            </T>
          </View>
        )}
      />
    </View>
  );
}
