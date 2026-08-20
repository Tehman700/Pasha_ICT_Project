package com.example.mobile_app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.example.mobile_app.ui.theme.Brand

/** How a [PillButton] is painted. */
enum class PillStyle {
    /** Ink fill, white label. The default primary action on cream screens. */
    Solid,

    /** White fill, ink label. Primary action on dark screens. */
    Light,

    /**
     * Transparent with a white hairline. A solid ink pill would vanish against
     * the navy welcome screen, so secondary actions there use this instead.
     */
    OutlinedOnDark,
}

/** The full-width pill that carries every primary action in the design. */
@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: PillStyle = PillStyle.Solid,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null,
) {
    val background = when {
        !enabled -> Brand.SurfaceDeep
        style == PillStyle.Solid -> Brand.Ink
        style == PillStyle.Light -> Color.White
        else -> Color.Transparent
    }
    val content = when {
        !enabled -> Brand.InkFaint
        style == PillStyle.Solid -> Color.White
        style == PillStyle.Light -> Brand.Ink
        else -> Color.White
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(58.dp)
            .clip(CircleShape)
            .background(background)
            .then(
                if (style == PillStyle.OutlinedOnDark) {
                    Modifier.border(1.5.dp, Color.White.copy(alpha = 0.55f), CircleShape)
                } else {
                    Modifier
                }
            )
            .clickable(enabled = enabled, onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingIcon != null) {
            Icon(
                imageVector = leadingIcon,
                contentDescription = null,
                tint = content,
                modifier = Modifier.size(20.dp),
            )
            androidx.compose.foundation.layout.Spacer(Modifier.size(10.dp))
        }
        Text(text = text, style = MaterialTheme.typography.labelLarge, color = content)
    }
}

/**
 * The circular arrow that advances each onboarding step. It stays visible but
 * goes flat and beige while the step is incomplete, exactly as in the design.
 */
@Composable
fun CircleArrowButton(
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    contentDescription: String? = null,
) {
    val background by animateColorAsState(
        targetValue = if (enabled) Brand.Ink else Brand.SurfaceDeep,
        label = "circleButtonBackground",
    )
    val tint by animateColorAsState(
        targetValue = if (enabled) Color.White else Brand.InkFaint,
        label = "circleButtonTint",
    )
    val interaction = remember { MutableInteractionSource() }

    Box(
        modifier = modifier
            .size(56.dp)
            .clip(CircleShape)
            .background(background)
            .clickable(
                enabled = enabled,
                interactionSource = interaction,
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier.size(22.dp),
        )
    }
}

/** The pale circular "back" affordance that sits opposite [CircleArrowButton]. */
@Composable
fun CircleBackButton(
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(56.dp)
            .clip(CircleShape)
            .background(Brand.Surface)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = "Back",
            tint = Brand.Ink,
            modifier = Modifier.size(22.dp),
        )
    }
}
