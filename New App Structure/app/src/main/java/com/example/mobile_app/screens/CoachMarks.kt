package com.example.mobile_app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.mobile_app.ui.components.PageDots
import com.example.mobile_app.ui.components.PillButton
import com.example.mobile_app.ui.components.ScreenPadding
import com.example.mobile_app.ui.theme.Brand

private data class CoachMark(val title: String, val body: String)

/**
 * The four-step walkthrough that dims the dashboard on first launch. It is a
 * plain overlay rather than anchored spotlights — enough to prove the sequence.
 */
@Composable
fun CoachMarks(onDone: () -> Unit) {
    val marks = remember {
        listOf(
            CoachMark(
                "Know who is around, wherever you are",
                "Never miss a friend in your city or theirs",
            ),
            CoachMark(
                "Share your plans in a tap",
                "Add a trip and the right people hear about it",
            ),
            CoachMark(
                "See your people in one place",
                "Everyone you have connected with, always current",
            ),
            CoachMark(
                "...and keep track of the things that matter",
                "Birthdays, kid names, and more",
            ),
        )
    }
    var page by remember { mutableIntStateOf(0) }
    val isLast = page == marks.lastIndex

    Box(
        modifier = Modifier
            .fillMaxSize()
            // Swallows taps on the dashboard underneath while the tour is up.
            .background(Color.Black.copy(alpha = 0.55f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = ScreenPadding)
                .fillMaxWidth()
                .clip(RoundedCornerShape(28.dp))
                .background(Brand.Surface)
                .padding(horizontal = 22.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = marks[page].title,
                style = MaterialTheme.typography.headlineMedium,
                color = Brand.Ink,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = marks[page].body,
                style = MaterialTheme.typography.bodyLarge,
                color = Brand.InkMuted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            PillButton(
                text = if (isLast) "Done" else "Next",
                onClick = { if (isLast) onDone() else page++ },
            )
            Spacer(Modifier.height(18.dp))
            PageDots(pageCount = marks.size, currentPage = page)
        }
    }
}
