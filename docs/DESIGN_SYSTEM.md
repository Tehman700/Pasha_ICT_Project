# Design System — Application Layer

`design.md` at the repo root is the visual foundation: a warm-cream, editorial,
hairline-depth system derived from Cursor's marketing site. It is authoritative
for colour, type, spacing, radius and depth, and nothing here overrides it.

But it is a **marketing-site** system. Roughly 60% of its component vocabulary —
`hero-band`, `ide-mockup-card`, `pricing-tier-card`, `cta-band`, `footer` — has
no analogue in a queue and verification product. This file records what the
application needed that `design.md` does not provide, and why each addition is
what it is.

**Token source of truth:** `packages/shared/src/tokens/`. That package feeds the
web surfaces (mirrored into Tailwind v4 `@theme` in `apps/admin-web/app/globals.css`)
and will feed the two React Native apps directly. Never inline a hex value.

---

## 1. Queue status treatment

`design.md` is explicit twice over: the AI-timeline pastels are *"only inside
in-product agent visualizations — never as system action colors"*, and *"don't
introduce a secondary brand action color."* That leaves no palette for the seven
states of the pickup state machine.

**Resolution: state is carried by weight, fill and hairline — not by hue.** Only
the states that demand an action spend colour, and each spends it for a reason.

| State | Treatment | Why |
|---|---|---|
| `SCHEDULED` | muted text, soft hairline, no fill | dormant, most rows most of the time |
| `EN_ROUTE` | ink text, hairline, soft fill | active but not urgent |
| `NEARBY` | ink text, **primary** border | the one "act now" state |
| `AT_GATE` | **ink inversion** | highest attention, spends no new colour |
| `HANDED_OVER` | **success** | terminal, positive |
| `CANCELLED` | muted-soft, soft hairline | terminal, neutral |
| `LAPSED` | **error** text | terminal, needs review |

Three of seven states use colour. That is what keeps a forty-row queue readable
— if every state were coloured, none would stand out.

The ink inversion for `AT_GATE` is not a new idea: `design.md` already inverts to
ink for `pricing-tier-featured` to signal emphasis without a coloured ribbon.

---

## 2. Ink-inverted high-contrast variant

`design.md` is a desktop-web palette: #f7f7f4 canvas with #5a5852 body text is
comfortable on a laptop indoors. Two of our surfaces are not read that way.

- **Guard verdict screen** — read in direct afternoon sun at a school gate,
  during a 1:00–2:30 PM dismissal. Peak brightness, worst case.
- **Classroom display** — read from ~6 metres across a room.

Both use the inverted surface: #26251e ground, #f7f7f4 text.

The two `*OnInk` semantic values are **lightened derivations** of the existing
tokens, not new brand colours — #1f8a65 and #cf2d56 do not carry enough
luminance against #26251e to read at a glance:

| Token | Light surface | Ink surface |
|---|---|---|
| success | `#1f8a65` | `#4ec49a` |
| error | `#cf2d56` | `#ff7a94` |

---

## 3. Urdu / Nastaliq type ramp

`design.md` has no RTL guidance and no non-Latin type ramp. Urdu is a Tier 1
requirement, so this is a gap that had to be closed before the first screen.

Two rules are **legibility requirements, not stylistic preferences**:

1. **Tracking is forced to 0.** `design.md` puts negative letter-spacing
   (−0.11px to −2.16px) on every display step. Applied to Nastaliq this severs
   the connected script and renders it close to unreadable.
2. **Line-height rises to 1.85–1.95**, from the Latin 1.1–1.5. Nastaliq descends
   steeply and diagonally; at Latin line-heights consecutive lines collide.

Font is **Noto Nastaliq Urdu**. This is a hard substitution — Inter has no Urdu
glyphs at all, so there is no graceful fallback.

Layout uses CSS logical properties (`ms-`, `pe-`, `border-s`, `text-start`)
throughout rather than left/right, so the entire shell mirrors when the document
flips to RTL.

---

## 4. Display-scale type

`design.md` tops out at 72px (`display-mega`), sized for a laptop at arm's
length. The classroom display needed two steps above that:

| Token | Size | Tracking |
|---|---|---|
| `displayHuge` | 96px | −2.88px |
| `displayGiant` | 120px | −3.6px |

Both hold weight 400. The editorial voice survives at any size; going bold to
"add emphasis" would break the one rule `design.md` states most insistently.

---

## 5. Motion

`design.md` lists animation timings under **Known Gaps**, so the whole motion
layer is an application addition. It lives in `tokens/layout.ts` as plain
numbers rather than CSS strings, because two of the three consumers are React
Native.

The easing is deliberately restrained — an editorial brand at 400 display weight
should not bounce. There is exactly **one** expressive curve,
`elastic.out(1, 0.75)`, and it is reserved for the classroom-display arrival
moment. Spending it anywhere else would make it mean nothing.

**Web uses GSAP; React Native uses Reanimated 3 + Moti.** This is not a
preference. GSAP animates the DOM, SVG and canvas — React Native has none of
them, and there is no official RN renderer. Tweening plain objects into
`Animated` values runs on the JS thread, and the risk register requires testing
on the cheapest Android hardware available; JS-thread animation alongside a
location stream, a WebSocket and the camera drops frames on exactly that
hardware. Durations and easings are shared so the two stacks feel identical.

Every animation helper is a no-op under `prefers-reduced-motion`.

---

## 6. Charts

Single-series only, so there is no categorical palette and no legend — the
figure title names the series. Marks are ink; `primary` marks exactly **one**
element (the latest point, the peak bar). That keeps Cursor Orange scarce and
makes the one orange mark carry meaning rather than decoration.

Validated against the white card surface:

| Check | Result |
|---|---|
| Contrast vs surface | **PASS** — both ≥ 3:1 |
| CVD separation | **PASS** — ΔE 30.2 protan, 44.5 tritan |
| Normal-vision floor | **PASS** — ΔE 44.1 |
| Lightness band / chroma floor | n/a — scoped to categorical palettes |

Mark specs: 2px lines, ≥8px active markers, 4px rounded bar ends anchored to the
baseline, 2px gap between bars, recessive grid, hover tooltip on every plot.

---

## 7. New components

Added in `design.md`'s own vocabulary — hairline depth, no shadows, 8px CTA
radius, 12px card radius:

`queue-row` · `status-pill` · `stat-tile` · `collector-card` · `child-chip` ·
`device-card` · `announcement-card` · `table` · `skeleton-rows` · `chart-frame`

One component has no `design.md` ancestor: **`button-danger`**. Revoking a
collector's access to a child is destructive and must read as destructive. It
uses the semantic error token on a card surface rather than a filled treatment,
so it never competes with the single primary CTA.

---

## Known gaps

- **The CSS mirror is hand-maintained.** `globals.css` duplicates the values in
  `tokens/`. Generating it at build time would remove the drift risk and is
  worth doing before the token set grows.
- **Hover states are undocumented in `design.md`** and were invented here
  (subtle canvas-soft fills, primary on links). Worth a pass once the visual
  direction is confirmed.
- **Focus rings** are an accessibility requirement `design.md` does not cover;
  currently a 2px primary outline at 2px offset.
- **Photo/avatar treatment** is unspecified. The guard verdict screen shows a
  child photo beside a collector photo and will need real rules.
