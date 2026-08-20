package com.example.mobile_app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.mobile_app.data.SignupViewModel
import com.example.mobile_app.ui.components.OnboardingScaffold
import com.example.mobile_app.ui.components.OtpBoxes
import com.example.mobile_app.ui.theme.Brand

/**
 * Code entry. The code is good for 60 seconds; while the clock runs, resend is
 * disabled, and once it hits zero the code is refused and resend opens up.
 */
@Composable
fun OtpScreen(
    mode: AuthMode,
    viewModel: SignupViewModel,
    onBack: () -> Unit,
    onVerified: () -> Unit,
) {
    val focusRequester = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current
    val expired = viewModel.secondsRemaining == 0
    val canSubmit = viewModel.isCodeComplete && !expired && !viewModel.isVerifying

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        keyboard?.show()
    }

    // Filling the last box submits by itself, the way a real code flow would.
    LaunchedEffect(viewModel.code) {
        if (viewModel.isCodeComplete && !expired && !viewModel.isVerifying) {
            keyboard?.hide()
            viewModel.verifyCode(onVerified)
        }
    }

    OnboardingScaffold(
        progress = if (mode == AuthMode.SignUp) 0.4f else null,
        onBack = onBack,
        onNext = { if (canSubmit) viewModel.verifyCode(onVerified) },
        nextEnabled = canSubmit,
        footer = { SupportFooter() },
    ) {
        Text(
            text = "We just emailed you, what is the code?",
            style = MaterialTheme.typography.headlineLarge,
            color = Brand.Ink,
        )
        Spacer(Modifier.height(24.dp))

        OtpBoxes(
            code = viewModel.code,
            onCodeChange = viewModel::updateCode,
            focusRequester = focusRequester,
        )

        Spacer(Modifier.height(16.dp))
        Text(
            text = "Sent to ${viewModel.email}",
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.InkMuted,
        )

        Spacer(Modifier.height(6.dp))
        CountdownLine(
            secondsRemaining = viewModel.secondsRemaining,
            isVerifying = viewModel.isVerifying,
            error = viewModel.errorMessage,
        )

        Spacer(Modifier.height(18.dp))
        ResendButton(
            enabled = viewModel.canResend,
            sending = viewModel.isSending,
            onClick = { viewModel.sendCode() },
        )
    }
}

@Composable
private fun CountdownLine(
    secondsRemaining: Int,
    isVerifying: Boolean,
    error: String?,
) {
    when {
        isVerifying -> Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            CircularProgressIndicator(
                color = Brand.Accent,
                strokeWidth = 2.dp,
                modifier = Modifier.size(15.dp),
            )
            Text(
                text = "Checking your code...",
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.InkMuted,
            )
        }

        error != null -> Text(
            text = error,
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.AccentDeep,
            fontWeight = FontWeight.Medium,
        )

        secondsRemaining > 0 -> Text(
            text = "Code expires in ${secondsRemaining}s",
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.Accent,
            fontWeight = FontWeight.SemiBold,
        )

        else -> Text(
            text = "That code has expired. Send a new one.",
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.InkMuted,
        )
    }
}

@Composable
private fun ResendButton(
    enabled: Boolean,
    sending: Boolean,
    onClick: () -> Unit,
) {
    val tint = if (enabled) Brand.Ink else Brand.InkFaint

    Row(
        modifier = Modifier
            .clip(CircleShape)
            .background(Brand.SurfaceSunken)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        if (sending) {
            CircularProgressIndicator(
                color = tint,
                strokeWidth = 2.dp,
                modifier = Modifier.size(17.dp),
            )
        } else {
            Icon(
                imageVector = Icons.Outlined.Refresh,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(18.dp),
            )
        }
        Text(
            text = if (sending) "Sending..." else "Resend code",
            style = MaterialTheme.typography.labelLarge,
            color = tint,
        )
    }
}
