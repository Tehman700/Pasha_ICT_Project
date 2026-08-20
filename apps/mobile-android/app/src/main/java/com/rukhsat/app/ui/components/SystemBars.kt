package com.rukhsat.app.ui.components

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Forces white status- and navigation-bar icons for the duration of a
 * full-bleed screen, and puts them back to dark on the way out.
 *
 * The app is edge-to-edge, so the system bars sit on top of whatever the
 * screen paints. The cream screens are the common case and want dark icons,
 * which is the default. The welcome and hand-off screens paint orange to the
 * very top, where dark icons are hard to read - on the previous ink ground the
 * clock was nearly invisible.
 *
 * onDispose restores the default rather than leaving the next screen to fix
 * it, so a screen that forgets to call this still gets correct bars.
 */
@Composable
fun LightSystemBarIcons() {
    val view = LocalView.current
    if (view.isInEditMode) return

    DisposableEffect(Unit) {
        val window = (view.context as Activity).window
        val controller = WindowCompat.getInsetsController(window, view)
        controller.isAppearanceLightStatusBars = false
        controller.isAppearanceLightNavigationBars = false
        onDispose {
            controller.isAppearanceLightStatusBars = true
            controller.isAppearanceLightNavigationBars = true
        }
    }
}
