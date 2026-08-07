import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { T, colors, radius, spacing } from "@pickup/ui-native";

/**
 * OpenStreetMap via Leaflet in a WebView.
 *
 * NOT react-native-maps, and deliberately so. That needs a Google Maps SDK key,
 * which needs a billing account, which needs a valid international card — the
 * riskiest non-technical dependency on the whole Day-0 list, and harder to
 * obtain here than anything technical in this project. It also needs a dev
 * build, which puts the map out of reach in Expo Go.
 *
 * This has no key, no quota, no billing, and runs in Expo Go today. OSM
 * coverage in Pakistani cities is more than good enough for "a van moving
 * toward a school".
 *
 * Tiles load over the network. With no signal the WebView shows the fallback
 * rather than a blank grey box, because a parent staring at nothing assumes
 * the app is broken.
 */
export function OsmMap({
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

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
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
