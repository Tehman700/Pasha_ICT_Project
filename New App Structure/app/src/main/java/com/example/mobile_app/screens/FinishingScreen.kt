package com.example.mobile_app.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.mobile_app.ui.components.BrandMark
import com.example.mobile_app.ui.components.BrandPattern
import com.example.mobile_app.ui.components.ScreenPadding
import kotlinx.coroutines.delay

/**
 * The orange hand-off between signup and the dashboard. It is a timed pause
 * standing in for the "who do you already know" lookup.
 */
@Composable
fun FinishingScreen(onDone: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(1800)
        onDone()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        BrandPattern()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = ScreenPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
        ) {
            BrandMark(size = 60.dp, light = true)
            Spacer(Modifier.height(24.dp))
            Text(
                text = "Seeing which of your people are already here...",
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(0.85f),
            )
        }
    }
}
