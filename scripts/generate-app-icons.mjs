/**
 * Generates both apps' launcher icons from the same gate mark used on the web.
 *
 *   node scripts/generate-app-icons.mjs
 *
 * The mark is defined once here as SVG and rendered with sharp, so the phone
 * icon is geometrically identical to `components/brand/Logo.tsx` rather than a
 * hand-redrawn lookalike that drifts the first time either is touched.
 *
 * Colour split matches the web AppIcon component and the rest of the system:
 * parent sits on the cream canvas used everywhere by default, staff uses the
 * ink inversion already used for guard-facing surfaces (the verdict screen,
 * the classroom display) because those are read in direct sun at a gate.
 *
 * Sizing, which is the part that is easy to get wrong in both directions:
 *
 * The mark occupies x 30..66 and y 22..74 of a 96 grid — 37.5% wide, 54% tall
 * — so at `scale: 1` it already sits inside its own tile exactly as the web
 * component draws it. The flat icons therefore use scale 1 and match the web
 * pixel for pixel.
 *
 * Android adaptive icons are the exception. The launcher masks the foreground
 * to a circle, squircle or rounded square depending on the OEM and crops hard;
 * only the central ~61% is guaranteed visible. The mark's corner-to-corner
 * extent is sqrt(37.5² + 54²) ≈ 66% of the canvas, which would clip on a
 * circular mask, so the foreground is inset to 0.85 — bringing the diagonal to
 * ~56% and clearing the safe zone on every mask. Inset further than that and
 * the icon reads as a small mark adrift in a large tile, which is the more
 * common mistake.
 */

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const INK = "#26251e";
const CREAM = "#f7f7f4";
const ORANGE = "#f54e00";

const VARIANTS = {
  parent: { app: "parent-app", tile: CREAM, post: INK },
  staff: { app: "staff-app", tile: INK, post: CREAM },
};

/**
 * The mark itself, on a 96-unit grid — same proportions as the web component.
 * `scale` shrinks it within the viewBox so adaptive-icon foregrounds can keep
 * the mark inside the launcher's safe zone.
 */
function markSvg({ size, tile, post, scale = 1, tileRadius = null }) {
  const inner = 96 * scale;
  const off = (96 - inner) / 2;
  const t = (v) => off + v * scale;
  const s = (v) => v * scale;

  const background =
    tile === null
      ? ""
      : `<rect width="96" height="96" rx="${tileRadius ?? 0}" fill="${tile}"/>`;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96">
       ${background}
       <rect x="${t(30)}" y="${t(22)}" width="${s(9)}" height="${s(52)}" rx="${s(4.5)}" fill="${post}"/>
       <rect x="${t(57)}" y="${t(22)}" width="${s(9)}" height="${s(52)}" rx="${s(4.5)}" fill="${post}"/>
       <rect x="${t(34)}" y="${t(44)}" width="${s(28)}" height="${s(9)}" rx="${s(4.5)}" fill="${ORANGE}"/>
     </svg>`,
  );
}

/**
 * `density` is the DPI sharp rasterises the SVG at, and it multiplies the
 * SVG's own width — at 384 against the default 72, a 1024px SVG comes out
 * 5461px. Render high for clean edges, then resize down to the size actually
 * wanted.
 */
async function png(svg, out, size) {
  await mkdir(dirname(out), { recursive: true });
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out);
  return out;
}

for (const [name, v] of Object.entries(VARIANTS)) {
  const assets = join(ROOT, "apps", v.app, "assets");

  // Full-bleed square. Android/iOS round the corners themselves, so the
  // source must be square — pre-rounding it leaves dark corners on launchers
  // that apply their own mask.
  await png(markSvg({ size: 1024, tile: v.tile, post: v.post, scale: 1 }), join(assets, "icon.png"), 1024);

  // Adaptive icon: flat background layer + mark-only foreground in the safe zone.
  await png(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${v.tile}"/></svg>`,
    ),
    join(assets, "android-icon-background.png"),
    1024,
  );
  await png(
    markSvg({ size: 1024, tile: null, post: v.post, scale: 0.85 }),
    join(assets, "android-icon-foreground.png"),
    1024,
  );

  // Themed icons (Android 13+) are tinted by the system from the alpha
  // channel alone — colour is discarded, so every part of the mark including
  // the barrier is drawn solid black here. Leaving the bar orange would make
  // no difference to the tint but would differ from what is drawn, and the
  // next person to read this file should see one flat silhouette.
  const mono = Buffer.from(
    markSvg({ size: 1024, tile: null, post: "#000000", scale: 0.85 })
      .toString()
      .replaceAll(ORANGE, "#000000"),
  );
  await png(mono, join(assets, "android-icon-monochrome.png"), 1024);

  // Splash: mark only, transparent — app.json supplies the background colour.
  await png(markSvg({ size: 1024, tile: null, post: v.post, scale: 1 }), join(assets, "splash-icon.png"), 1024);

  await png(markSvg({ size: 96, tile: v.tile, post: v.post, scale: 1 }), join(assets, "favicon.png"), 96);

  console.log(`${name}: icons written to apps/${v.app}/assets/`);
}
