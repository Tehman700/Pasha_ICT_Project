package com.rukhsat.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.rukhsat.app.ui.theme.Brand

/** Horizontal gutter shared by every screen in the flow. */
val ScreenPadding = 20.dp

/**
 * The chrome every signup step shares: centred logo, a progress bar showing how
 * far through the flow the user is, the step content, and a bottom row with the
 * back/advance circles.
 *
 * [progress] is 0f..1f; pass null on steps that sit outside the tracked flow.
 */
@Composable
fun OnboardingScaffold(
    progress: Float?,
    onBack: (() -> Unit)?,
    onNext: (() -> Unit)?,
    nextEnabled: Boolean,
    modifier: Modifier = Modifier,
    footer: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Brand.Background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding(),
    ) {
        Spacer(Modifier.height(12.dp))
        BrandMark(modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(20.dp))

        if (progress != null) {
            ProgressTrack(
                progress = progress,
                modifier = Modifier.padding(horizontal = ScreenPadding),
            )
        } else {
            // Keep the same rhythm on steps without a progress bar.
            Spacer(Modifier.height(5.dp))
        }

        Spacer(Modifier.height(36.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = ScreenPadding),
            content = content,
        )

        if (footer != null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = ScreenPadding),
                contentAlignment = Alignment.Center,
            ) {
                footer()
            }
            Spacer(Modifier.height(12.dp))
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = ScreenPadding, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBack != null) {
                CircleBackButton(
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    onClick = onBack,
                )
            }
            Spacer(Modifier.weight(1f))
            if (onNext != null) {
                CircleArrowButton(
                    icon = Icons.AutoMirrored.Filled.ArrowForward,
                    onClick = onNext,
                    enabled = nextEnabled,
                    contentDescription = "Continue",
                )
            }
        }
    }
}

/** Rounded progress bar with an animated orange fill on a warm track. */
@Composable
fun ProgressTrack(
    progress: Float,
    modifier: Modifier = Modifier,
) {
    val animated by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 350),
        label = "onboardingProgress",
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(5.dp)
            .clip(CircleShape)
            .background(Brand.Track),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(animated)
                .fillMaxHeight()
                .clip(CircleShape)
                .background(Brand.Accent),
        )
    }
}

/** The pill-and-dots page indicator used by the tour and the coach marks. */
@Composable
fun PageDots(
    pageCount: Int,
    currentPage: Int,
    modifier: Modifier = Modifier,
    activeColor: Color = Brand.Accent,
    inactiveColor: Color = Brand.InkFaint,
    stretchActive: Boolean = false,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(pageCount) { index ->
            val active = index == currentPage
            Box(
                modifier = Modifier
                    .height(8.dp)
                    .width(if (active && stretchActive) 26.dp else 8.dp)
                    .clip(CircleShape)
                    .background(if (active) activeColor else inactiveColor),
            )
        }
    }
}

/** Small circular icon slot used for the bell and share affordances. */
@Composable
fun CircleIconSlot(
    size: androidx.compose.ui.unit.Dp,
    background: Color,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(background),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}
