package com.example.mobile_app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Warm cream layout tones kept from the approved onboarding design, with the
 * accent and ink pulled from the Rukhsat mark so the app matches its own logo.
 */
object Brand {
    /** Page background — warm off-white. */
    val Background = Color(0xFFF5F1EE)

    /** Raised cards and filled inputs that should read *lighter* than the page. */
    val Surface = Color(0xFFFCFAF8)

    /** Inputs and chips that should read *darker* than the page. */
    val SurfaceSunken = Color(0xFFEEEBE5)

    /** Slightly deeper sunken tone, used for the photo well and share button. */
    val SurfaceDeep = Color(0xFFE9E4DC)

    /** Progress-bar track. */
    val Track = Color(0xFFE7E1D8)

    /* --- Straight from the logo ------------------------------------------ */

    /** The destination dot. Drives progress, active dots, cursors, highlights. */
    val Accent = Color(0xFFE8A33D)
    val AccentSoft = Color(0xFFF0BC6E)
    val AccentDeep = Color(0xFFC9822B)

    /** The mark's ink, also the fill for primary buttons. */
    val Ink = Color(0xFF14171F)

    /** The origin ring. */
    val Blue = Color(0xFF5B8BB8)
    val BlueDeep = Color(0xFF2C5F8A)

    /** Navy shades for the full-bleed welcome and hand-off screens. */
    val NavyDeep = Color(0xFF14171F)
    val NavyLift = Color(0xFF1E2A38)

    val InkMuted = Color(0xFF8A8782)
    val InkFaint = Color(0xFFB4AFA8)

    val OnAccent = Color(0xFF14171F)
    val Outline = Color(0xFFDCD6CC)
}
