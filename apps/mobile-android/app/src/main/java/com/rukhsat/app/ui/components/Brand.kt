package com.rukhsat.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rukhsat.app.R

/**
 * The Rukhsat mark: a gate — two posts and a boom barrier. Traced from
 * `apps/admin-web/app/icon.svg`, which is the source of truth.
 *
 * Two artwork variants ship because the mark has to invert. Pass [light] on
 * the orange full-bleed screens; the default suits the cream screens.
 */
@Composable
fun BrandMark(
    modifier: Modifier = Modifier,
    size: Dp = 34.dp,
    light: Boolean = false,
) {
    Image(
        painter = painterResource(
            if (light) R.drawable.ic_logo_light else R.drawable.ic_logo_dark
        ),
        contentDescription = "Rukhsat",
        modifier = modifier.size(size),
    )
}
