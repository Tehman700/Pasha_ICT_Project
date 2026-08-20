package com.rukhsat.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val AppColorScheme = lightColorScheme(
    primary = Brand.Ink,
    onPrimary = Brand.OnAccent,
    secondary = Brand.Accent,
    onSecondary = Brand.OnAccent,
    background = Brand.Background,
    onBackground = Brand.Ink,
    surface = Brand.Surface,
    onSurface = Brand.Ink,
    surfaceVariant = Brand.SurfaceSunken,
    onSurfaceVariant = Brand.InkMuted,
    outline = Brand.Outline,
    error = Brand.Error,
)

/**
 * The design is light-only by intent, so there is deliberately no dark scheme:
 * a night variant would fight the warm cream/orange palette.
 */
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AppColorScheme,
        typography = AppTypography,
        content = content,
    )
}
