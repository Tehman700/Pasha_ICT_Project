package com.example.mobile_app.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.mobile_app.ui.components.BrandMark
import com.example.mobile_app.ui.components.BrandPattern
import com.example.mobile_app.ui.components.PillButton
import com.example.mobile_app.ui.components.PillStyle
import com.example.mobile_app.ui.components.ScreenPadding

/**
 * First run. Two ways in — take the tour (which ends in signup) or go straight
 * to the phone step — plus a quieter route for people who already have an account.
 */
@Composable
fun WelcomeScreen(
    onTakeTour: () -> Unit,
    onSignUp: () -> Unit,
    onLogIn: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        BrandPattern()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = ScreenPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.weight(1f))

            BrandMark(size = 104.dp, light = true)
            Spacer(Modifier.height(20.dp))
            Text(
                text = "A place for your people",
                style = MaterialTheme.typography.displaySmall,
                color = Color.White,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(0.86f),
            )

            Spacer(Modifier.weight(1.15f))

            PillButton(
                text = "Take a quick tour",
                onClick = onTakeTour,
                style = PillStyle.Light,
            )
            Spacer(Modifier.height(12.dp))
            PillButton(
                text = "Continue with email",
                onClick = onSignUp,
                style = PillStyle.OutlinedOnDark,
                leadingIcon = Icons.Outlined.MailOutline,
            )
            Spacer(Modifier.height(14.dp))
            Text(
                text = "I already have an account",
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
                modifier = Modifier
                    .clickable(onClick = onLogIn)
                    .padding(12.dp),
            )
            Spacer(Modifier.height(16.dp))
        }
    }
}
