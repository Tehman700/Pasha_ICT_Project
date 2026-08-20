package com.example.mobile_app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Cake
import androidx.compose.material.icons.outlined.Flight
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.mobile_app.ui.components.BrandMark
import com.example.mobile_app.ui.components.PageDots
import com.example.mobile_app.ui.components.PillButton
import com.example.mobile_app.ui.components.ScreenPadding
import com.example.mobile_app.ui.theme.Brand
import kotlinx.coroutines.launch

private data class TourPage(
    val headline: String,
    val illustration: @Composable () -> Unit,
)

/**
 * The three-card value pitch. Swiping and the button advance the same pager, and
 * the last page hands off to signup.
 */
@Composable
fun TourScreen(
    onFinish: () -> Unit,
    onSkip: () -> Unit,
) {
    val pages = listOf(
        TourPage("See where you overlap with friends") { OverlapCard() },
        TourPage("And when they are coming to town") { NotificationCard() },
        TourPage("Keep track of the things that matter") { DetailsCard() },
    )
    val pagerState = rememberPagerState { pages.size }
    val scope = rememberCoroutineScope()
    val isLastPage = pagerState.currentPage == pages.lastIndex

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brand.Background)
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = ScreenPadding, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandMark(size = 30.dp)
            Spacer(Modifier.weight(1f))
            Text(
                text = "Skip",
                style = MaterialTheme.typography.labelLarge,
                color = Brand.InkMuted,
                modifier = Modifier
                    .clickable(onClick = onSkip)
                    .padding(8.dp),
            )
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f),
            pageSpacing = 12.dp,
        ) { page ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = ScreenPadding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f, fill = false),
                    contentAlignment = Alignment.Center,
                ) {
                    pages[page].illustration()
                }
                Spacer(Modifier.height(40.dp))
                Text(
                    text = pages[page].headline,
                    style = MaterialTheme.typography.headlineMedium,
                    fontSize = 30.sp,
                    lineHeight = 37.sp,
                    color = Brand.Ink,
                    textAlign = TextAlign.Center,
                )
            }
        }

        PageDots(
            pageCount = pages.size,
            currentPage = pagerState.currentPage,
            stretchActive = true,
            inactiveColor = Brand.InkFaint.copy(alpha = 0.55f),
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .padding(vertical = 24.dp),
        )

        PillButton(
            text = if (isLastPage) "Get started" else "Next",
            onClick = {
                if (isLastPage) {
                    onFinish()
                } else {
                    scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                }
            },
            modifier = Modifier.padding(horizontal = ScreenPadding),
        )
        Spacer(Modifier.height(24.dp))
    }
}

/* ---------------------------------------------------------------------------
 * Illustrations.
 *
 * The reference screens use photography we do not have, so each page is
 * composed from the same primitives the real app uses — a portrait card with
 * floating info pills. Swap the gradient wells for real images later.
 * ------------------------------------------------------------------------- */

@Composable
private fun PhotoWell(
    modifier: Modifier = Modifier,
    colors: List<Color> = listOf(Color(0xFF5A4636), Color(0xFF2E2118)),
    content: @Composable () -> Unit = {},
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(28.dp))
            .background(Brush.verticalGradient(colors)),
    ) {
        content()
    }
}

@Composable
private fun InfoPill(
    icon: ImageVector,
    label: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(CircleShape)
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(icon, contentDescription = null, tint = Brand.Accent, modifier = Modifier.size(17.dp))
        Text(label, style = MaterialTheme.typography.titleMedium, fontSize = 15.sp, color = Brand.Ink)
    }
}

@Composable
private fun OverlapCard() {
    Box(
        modifier = Modifier
            .fillMaxWidth(0.78f)
            .aspectRatio(0.72f),
    ) {
        PhotoWell(modifier = Modifier.fillMaxSize())

        InfoPill(
            icon = Icons.Outlined.Flight,
            label = "New York",
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 26.dp)
                .offset(x = (-26).dp),
        )
        InfoPill(
            icon = Icons.Outlined.CalendarToday,
            label = "3 Days",
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .offset(x = 22.dp),
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 22.dp)
                .fillMaxWidth(0.86f)
                .clip(RoundedCornerShape(18.dp))
                .background(Color.White)
                .padding(vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                "Overlap with",
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.InkMuted,
            )
            Text(
                "Lucas Partington",
                style = MaterialTheme.typography.titleMedium,
                fontSize = 17.sp,
                color = Brand.Ink,
            )
        }
    }
}

@Composable
private fun NotificationCard() {
    Box(
        modifier = Modifier
            .fillMaxWidth(0.78f)
            .aspectRatio(0.72f),
        contentAlignment = Alignment.Center,
    ) {
        // A stylised phone showing the notification the app would send.
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .aspectRatio(0.52f)
                .clip(RoundedCornerShape(36.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF8E1B0F), Color(0xFFFF7A33), Color(0xFF7C5BC7)),
                    )
                )
                .border(5.dp, Color(0xFF1A1A1A), RoundedCornerShape(36.dp)),
        ) {
            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 34.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Monday, September 16", color = Color.White, fontSize = 11.sp)
                Text(
                    "10:10",
                    color = Color.White,
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }

        Row(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color.White)
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(9.dp))
                    .background(Color(0xFFFBE9DC)),
                contentAlignment = Alignment.Center,
            ) {
                BrandMark(size = 20.dp)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Miriam is coming to town",
                    style = MaterialTheme.typography.titleMedium,
                    fontSize = 14.sp,
                    color = Brand.Ink,
                )
                Text(
                    "She will be in Lahore for 3 days",
                    style = MaterialTheme.typography.bodyMedium,
                    fontSize = 12.sp,
                    color = Brand.InkMuted,
                )
            }
        }
    }
}

@Composable
private fun DetailsCard() {
    Box(
        modifier = Modifier
            .fillMaxWidth(0.78f)
            .aspectRatio(0.72f),
    ) {
        PhotoWell(
            modifier = Modifier.fillMaxSize(),
            colors = listOf(Color(0xFF4B5A63), Color(0xFF1F272C)),
        )

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            InfoPill(Icons.Outlined.Cake, "Birthdays")
            InfoPill(Icons.Outlined.Restaurant, "Dietary needs")
            InfoPill(Icons.Outlined.Home, "Hometown")
        }
    }
}
