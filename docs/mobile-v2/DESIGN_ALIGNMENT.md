# Design alignment — scaffold structure, admin-web tokens

## The decision, precisely

> Adopt the orange and cream, but the flow and structure of buttons, screens
> and everything else comes off the New App Structure.
> — 2026-08-20

So: **colour, type family, and brand mark come from `apps/admin-web/`.
Layout, component shapes, and screen flow come from `New App Structure/`.**

The amber `#E8A33D` / navy `#14171F` / blue `#5B8BB8` "journey" identity is
retired. The SVGs stay in `apps/mobile-android/App Logos/` as the only vector
source, in case it is ever revisited.

## What the reference screens actually contain

Measured on 21 Aug 2026 by sampling all 23 Mobbin screens in
`apps/mobile-android/Mozi iOS Onboarding/`, rather than trusting the scaffold's
own account of itself. The result changes how the scaffold should be read:

| Value | In the reference? |
|---|---|
| Orange `#FF5401` | **Yes** — 25,773 px, the dominant accent |
| Cream `#F5F1EE` | **Yes** — 379,457 px, the page ground |
| Surface `#FCFAF8` | **Yes** |
| Amber `#E8A33D` | **No. Does not appear at all.** |
| Navy `#14171F` | **No. Does not appear at all.** |

**The amber and the navy were never part of the design the scaffold was copied
from.** They were invented to match the journey logo, which is itself retired.
The `#2F2D2B` dark in reference screens 19-20 is not a dark screen either — it
is the scrim behind a coach-mark overlay. The reference has **no dark
full-bleed screen anywhere**.

The reference's orange `#FF5401` and admin-web's `#F54E00` are the same colour
to the eye, ten points of red apart. Retheming to the dashboard's palette
therefore moved the app *back toward* its reference, not away from it. Use the
`Brand.Accent` token, not `#FF5401`, so there is one source of truth.

### The full-bleed orange ground

Reference screen 18 is a flat `#FF5401` ground — **no gradient** — with
oversized arcs tone-on-tone. The arcs read `#FF661B` over `#FF5401`, which is
exactly white at 10.5% alpha. `BrandPattern` now reproduces this.

This is the **one deliberate exception** to the scarcity rule below: orange
covers the whole welcome and hand-off screens. Everywhere else it stays rare.
A wallpaper is not an action, so it does not spend the meaning that makes an
orange button read as the thing to press.

Source of truth for every value below: `apps/admin-web/app/globals.css`,
which itself mirrors `packages/shared/src/tokens/`. **If a token changes
there, change it here in the same commit.**

## `Color.kt` — the full mapping

Keep the `Brand` object's shape. Replace every value.

```kotlin
object Brand {
    /* ── Surface. Warm cream floor — never pure white. ─────────────── */
    val Background    = Color(0xFFF7F7F4)  // was F5F1EE  → --color-canvas
    val BackgroundSoft= Color(0xFFFAFAF7)  // new         → --color-canvas-soft
    val Surface       = Color(0xFFFFFFFF)  // was FCFAF8  → --color-surface-card
    val SurfaceSunken = Color(0xFFE6E5E0)  // was EEEBE5  → --color-surface-strong
    val SurfaceDeep   = Color(0xFFCFCDC4)  // was E9E4DC  → --color-hairline-strong
    val Track         = Color(0xFFE6E5E0)  // was E7E1D8  → --color-hairline

    /* ── Brand. The only action colour. Used scarcely. ─────────────── */
    val Accent        = Color(0xFFF54E00)  // was E8A33D  → --color-primary
    val AccentDeep    = Color(0xFFD04200)  // was C9822B  → --color-primary-active
    val OnAccent      = Color(0xFFFFFFFF)  // was 14171F  → --color-on-primary

    /* ── Text. Warm near-black, never pure black. ──────────────────── */
    val Ink           = Color(0xFF26251E)  // was 14171F  → --color-ink
    val Body          = Color(0xFF5A5852)  // new         → --color-body
    val InkMuted      = Color(0xFF807D72)  // was 8A8782  → --color-muted
    val InkFaint      = Color(0xFFA09C92)  // was B4AFA8  → --color-muted-soft

    /* ── Hairlines. The only depth mechanism. ──────────────────────── */
    val Outline       = Color(0xFFE6E5E0)  // was DCD6CC  → --color-hairline
    val OutlineSoft   = Color(0xFFEFEEE8)  // new         → --color-hairline-soft

    /* ── Semantic ──────────────────────────────────────────────────── */
    val Success       = Color(0xFF1F8A65)  // new         → --color-success
    val Error         = Color(0xFFCF2D56)  // new         → --color-error

    /* ── Ink-inverted surface (guard verdict, full-bleed screens) ──── */
    val InvCanvas     = Color(0xFF26251E)  // was NavyDeep 14171F
    val InvCanvasSoft = Color(0xFF32302A)  // was NavyLift 1E2A38
    val InvText       = Color(0xFFF7F7F4)
    val InvMuted      = Color(0xFFA09C92)
    val InvHairline   = Color(0xFF43413A)
    val InvSuccess    = Color(0xFF4EC49A)
    val InvError      = Color(0xFFFF7A94)
}
```

**Deleted outright:** `AccentSoft`, `Blue`, `BlueDeep`, `NavyDeep`, `NavyLift`.
The blues existed only to serve the journey logo's origin ring.

### Two changes that are easy to get wrong

1. **`OnAccent` flips from dark to white.** Amber needed dark ink on it; orange
   `#f54e00` is dark enough to carry white. Every `Brand.OnAccent` usage must
   be re-checked visually, not just recompiled.

2. **Error stops being an accent.** The scaffold used `Brand.AccentDeep` for
   error text (`EmailScreen`, `OtpScreen`). That worked when the accent was
   amber. With orange it reads as an action, not a problem. Use `Brand.Error`.

## Buttons — the one real judgment call

The scaffold's primary is an **ink-filled pill** (`PillStyle.Solid`). The
admin dashboard's primary is **orange**. Both cannot be "the primary".

**Resolution:** keep the ink pill as the default primary action. Orange is
reserved for progress fills, active indicators, focus cursors, and the single
most consequential action on a screen where one exists.

This is deliberate, and it is consistent with both sources: the design system
already says orange is "the only action colour, **used scarcely**", and the
React Native apps already shipped an ink "Sign in" button above a white
"Take a quick tour". A screen of orange pills would violate the scarcity rule
that makes the orange mean anything.

| `PillStyle` | Fill | Label | Use |
|---|---|---|---|
| `Solid` | `Ink` | white | Default primary on cream screens |
| `Light` | white | `Ink` | Primary on ink/inverted screens |
| `Accent` *(new)* | `Accent` | `OnAccent` | At most one per screen, for the consequential action |
| `OutlinedOnDark` | transparent + white hairline | white | Secondary on inverted screens |
| *disabled* | `SurfaceDeep` | `InkFaint` | Unchanged behaviour |

Where orange **does** belong, unchanged from the scaffold: `ProgressTrack`
fill, active `PageDots`, `cursorBrush` in every text field, and the
highlighted span in the dashboard greeting.

## Typography

**Keep Plus Jakarta Sans.** Decided with the user on 21 Aug 2026, overriding
the part of the brand decision that said the type family comes from admin-web.
Everything else in that decision stands — the colour and the brand mark still
come from admin-web.

The five Jakarta `.ttf` files in `app/src/main/res/font/` stay. Inter is not
added. The apps and the dashboard will not share a typeface, which is a
deliberate, accepted difference: the scaffold's type is part of the screen
flow the user chose to keep.

`QuestionStyle` — the big "What is your name?" head — keeps its geometry
(34sp / 40sp line-height / −0.8sp tracking). It is the signature of the flow.

| Scaffold style | Size | Admin-web token |
|---|---|---|
| `displaySmall` | 36sp | `--text-display-lg` 36px |
| `headlineLarge` (`QuestionStyle`) | 34sp | *mobile extension* |
| `headlineMedium` | 28sp | ≈ `--text-display-md` 26px |
| `headlineSmall` | 22sp | `--text-display-sm` 22px |
| `titleMedium` | 17sp | ≈ `--text-title-md` 18px |
| `bodyLarge` | 16sp | `--text-body-md` 16px |
| `bodyMedium` | 14sp | `--text-body-sm` 14px |
| `labelLarge` | 16sp | `--text-title-sm` 16px |
| `labelMedium` | 13sp | `--text-caption` 13px |

The apps are English-only, so there is one type ramp. See [I18N.md](I18N.md).

## Radii — a documented mobile extension

The scaffold is much rounder than the dashboard: 18dp fields, 20dp cards,
`CircleShape` pills, against admin-web's 4–16px scale.

**Keep the scaffold's radii.** `design.md` already establishes app-level
extensions to the shared system, and the rounder geometry is a large part of
the structure the user chose. Record the values in `core-ui` as named
constants rather than scattering magic numbers:

```kotlin
object Radius {
    val field = 18.dp   val card = 20.dp    val otpBox = 14.dp
    val well  = 28.dp   val tile = 16.dp    val pill = CircleShape
}
```

## The rule that must not be broken

**No shadows. Hairlines only.** No `Modifier.shadow`, no `elevation` on any
Card, Surface, Button, or `BottomAppBar`, no `tonalElevation`.

Depth comes from three things and nothing else: a 1dp `Brand.Outline` border,
a lighter fill (`Surface`) or a darker one (`SurfaceSunken`), and spacing.

The scaffold already honours this — it uses fills and never elevation. Material 3
components default to tonal elevation, so any newly-introduced `Card`,
`Surface`, or `NavigationBar` must have it explicitly zeroed.

## Brand mark

Replace the journey glyph with the gate glyph from
`apps/admin-web/app/icon.svg`: two ink posts, an orange crossbar, on cream.

Convert to `res/drawable/ic_logo.xml` (vector) plus an `ic_logo_light.xml`
variant for inverted screens. `BrandMark(light = true)` keeps working.

Launcher icons regenerate from the same mark: `ic_launcher_background` cream
`#f7f7f4`, foreground the gate, monochrome the posts+bar in a single colour.

## Verifying alignment

Screenshot a rebuilt screen next to the live dashboard at
`https://admin.tideover.site` and compare canvas, ink, and orange directly.
If the cream reads cooler or the orange reads redder, a token was missed. See
[VERIFICATION.md](VERIFICATION.md).
