package com.rukhsat.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import com.rukhsat.app.ui.theme.Brand

/**
 * Wallpaper for the welcome and hand-off screens: a flat orange ground with an
 * arc blown up and scattered tone-on-tone across it. Drawn rather than shipped
 * as artwork so it stays crisp at any screen size.
 *
 * This restores the reference design's own treatment. The Mobbin screens this
 * scaffold came from use a full-bleed #FF5401 ground with arcs in white at
 * ~10.5% alpha (measured: the arcs read #FF661B over #FF5401, which is exactly
 * that blend), and the ground is flat - no vertical gradient. The scaffold's
 * author had replaced it with a navy gradient to suit a logo that is itself
 * being retired.
 *
 * We use Brand.Accent (#F54E00) rather than the reference's #FF5401: they are
 * the same colour to the eye, ten points of red apart, and using our own token
 * keeps one source of truth.
 *
 * This is the one place orange is allowed to cover a whole screen. Everywhere
 * else it stays scarce - see DESIGN_ALIGNMENT.md.
 */
@Composable
fun BrandPattern(
    modifier: Modifier = Modifier,
    ground: Color = Brand.Accent,
) {
    // Measured off the reference, not guessed.
    val arc = Color.White.copy(alpha = 0.105f)

    Canvas(modifier = modifier.fillMaxSize()) {
        drawRect(color = ground, size = size)

        // Positions and scales are fractions of the canvas so the composition
        // holds together on any aspect ratio.
        // Kept to the corners so nothing crowds the headline in the middle.
        departureArc(arc, cx = 0.12f, cy = 0.06f, span = 0.85f)
        departureArc(arc, cx = 0.94f, cy = 0.16f, span = 0.50f)
        departureArc(arc, cx = 0.04f, cy = 0.88f, span = 0.75f)
        departureArc(arc, cx = 0.92f, cy = 0.97f, span = 0.60f)
    }
}

/** One oversized copy of the logo arc, centred on a fraction of the canvas. */
private fun DrawScope.departureArc(color: Color, cx: Float, cy: Float, span: Float) {
    val d = size.minDimension * span
    val stroke = d * 0.055f
    drawArc(
        color = color,
        // Matches the mark: a shallow sweep, not a full ring.
        startAngle = 104f,
        sweepAngle = 62f,
        useCenter = false,
        topLeft = Offset(size.width * cx - d / 2f, size.height * cy - d / 2f),
        size = Size(d, d),
        style = Stroke(width = stroke, cap = StrokeCap.Round),
    )
}
