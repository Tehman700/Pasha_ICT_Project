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
 * The Rukhsat mark: an origin ring, a departure arc, and a destination dot.
 *
 * Two artwork variants ship because the arc has to invert against dark
 * surfaces — pass [light] on the navy screens.
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
