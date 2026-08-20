package com.rukhsat.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import com.rukhsat.app.ui.theme.Brand

/**
 * Wallpaper for the welcome and hand-off screens: the ink-inverted ground with
 * an arc blown up and scattered across it. Drawn rather than shipped as
 * artwork so it stays crisp at any screen size.
 *
 * Ink rather than orange because white copy needs a dark ground to sit on.
 */
@Composable
fun BrandPattern(
    modifier: Modifier = Modifier,
    baseTop: Color = Brand.InvCanvasSoft,
    baseBottom: Color = Brand.InvCanvas,
) {
    val faint = Color.White.copy(alpha = 0.05f)
    val accent = Brand.Accent.copy(alpha = 0.09f)

    Canvas(modifier = modifier.fillMaxSize()) {
        drawRect(brush = Brush.verticalGradient(listOf(baseTop, baseBottom)), size = size)

        // Positions and scales are fractions of the canvas so the composition
        // holds together on any aspect ratio.
        // Kept to the corners so nothing crowds the headline in the middle.
        departureArc(faint, cx = 0.12f, cy = 0.06f, span = 0.85f)
        departureArc(accent, cx = 0.94f, cy = 0.16f, span = 0.50f)
        departureArc(faint, cx = 0.04f, cy = 0.88f, span = 0.75f)
        departureArc(faint, cx = 0.92f, cy = 0.97f, span = 0.60f)
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
