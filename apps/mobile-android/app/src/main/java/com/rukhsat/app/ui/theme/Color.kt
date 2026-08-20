package com.rukhsat.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * The Rukhsat palette, taken from `apps/admin-web/app/globals.css`, which
 * itself mirrors `packages/shared/src/tokens/`. The dashboard is the source of
 * truth: if a token changes there, change it here in the same commit.
 *
 * The layout, component shapes and screen flow still come from the onboarding
 * scaffold. Only the colour is the dashboard's.
 *
 * Depth is expressed with hairlines, never shadows.
 */
object Brand {

    /* ── Surface. Warm cream floor — never pure white. ─────────────────── */

    /** Page background. */
    val Background = Color(0xFFF7F7F4)

    /** A half-step lighter than the page, for sections that should lift. */
    val BackgroundSoft = Color(0xFFFAFAF7)

    /** Raised cards and filled inputs that read *lighter* than the page. */
    val Surface = Color(0xFFFFFFFF)

    /** Inputs and chips that read *darker* than the page. */
    val SurfaceSunken = Color(0xFFE6E5E0)

    /** Deeper sunken tone — the photo well, the share button. */
    val SurfaceDeep = Color(0xFFCFCDC4)

    /** Progress-bar track. */
    val Track = Color(0xFFE6E5E0)

    /* ── Brand. The only action colour, and used scarcely. ─────────────── */

    /**
     * Drives progress fills, active page dots, text cursors, and at most one
     * consequential action per screen. The default primary button is still the
     * ink pill — a screen of orange pills would spend the scarcity that makes
     * the orange mean anything.
     */
    val Accent = Color(0xFFF54E00)
    val AccentDeep = Color(0xFFD04200)

    /**
     * White, not ink. The old amber was light enough to need dark text on it;
     * orange is dark enough to carry white. Every usage needed a visual
     * re-check when this flipped, not just a recompile.
     */
    val OnAccent = Color(0xFFFFFFFF)

    /* ── Text. Warm near-black, never pure black. ──────────────────────── */

    val Ink = Color(0xFF26251E)
    val Body = Color(0xFF5A5852)
    val InkMuted = Color(0xFF807D72)
    val InkFaint = Color(0xFFA09C92)

    /* ── Hairlines. The only depth mechanism. ──────────────────────────── */

    val Outline = Color(0xFFE6E5E0)
    val OutlineSoft = Color(0xFFEFEEE8)

    /* ── Semantic ──────────────────────────────────────────────────────── */

    /**
     * Error is its own colour, not a deeper accent. The scaffold used
     * AccentDeep for error text, which read fine while the accent was amber;
     * against orange it reads as something to press rather than a problem.
     */
    val Success = Color(0xFF1F8A65)
    val Error = Color(0xFFCF2D56)

    /* ── Ink-inverted surface ──────────────────────────────────────────────
       Full-bleed dark screens: the welcome wallpaper, the hand-off animation,
       and the guard's verdict screen, where a decision has to be readable at
       arm's length in daylight.                                             */

    val InvCanvas = Color(0xFF26251E)
    val InvCanvasSoft = Color(0xFF32302A)
    val InvText = Color(0xFFF7F7F4)
    val InvMuted = Color(0xFFA09C92)
    val InvHairline = Color(0xFF43413A)
    val InvSuccess = Color(0xFF4EC49A)
    val InvError = Color(0xFFFF7A94)
}
