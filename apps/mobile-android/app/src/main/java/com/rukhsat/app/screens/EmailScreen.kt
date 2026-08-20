package com.rukhsat.app.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rukhsat.app.R
import com.rukhsat.app.data.CODE_LENGTH
import com.rukhsat.app.data.SignupViewModel
import com.rukhsat.app.ui.components.FieldCard
import com.rukhsat.app.ui.components.OnboardingScaffold
import com.rukhsat.app.ui.theme.Brand

/** Which half of the flow the email/code pair is serving. */
enum class AuthMode { LogIn, SignUp }

/**
 * Step one: collect the address the code will be mailed to. The screen only
 * advances once the backend confirms it actually sent something.
 */
@Composable
fun EmailScreen(
    mode: AuthMode,
    viewModel: SignupViewModel,
    onBack: () -> Unit,
    onCodeSent: () -> Unit,
) {
    val focusRequester = remember { FocusRequester() }
    val canContinue = viewModel.isEmailValid && !viewModel.isSending

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    val submit = { if (canContinue) viewModel.sendCode(onSent = onCodeSent) }

    OnboardingScaffold(
        progress = if (mode == AuthMode.SignUp) 0.2f else null,
        onBack = onBack,
        onNext = submit,
        nextEnabled = canContinue,
        footer = { SupportFooter() },
    ) {
        Text(
            text = if (mode == AuthMode.SignUp) {
                "What is your email address?"
            } else {
                "Welcome back. What is your email?"
            },
            style = MaterialTheme.typography.headlineLarge,
            color = Brand.Ink,
        )
        Spacer(Modifier.height(24.dp))

        FieldCard(
            label = "Email address",
            value = viewModel.email,
            onValueChange = viewModel::updateEmail,
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Go,
            onImeAction = submit,
            focusRequester = focusRequester,
        )

        Spacer(Modifier.height(14.dp))

        when {
            viewModel.isSending -> Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                CircularProgressIndicator(
                    color = Brand.Accent,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = "Sending your code...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Brand.InkMuted,
                )
            }

            viewModel.errorMessage != null -> Text(
                text = viewModel.errorMessage.orEmpty(),
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.Error,
            )

            else -> Text(
                text = "We will email you a $CODE_LENGTH-digit code to confirm it is you.",
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.InkMuted,
            )
        }

        if (viewModel.isSimulated) {
            Spacer(Modifier.height(10.dp))
            Text(
                text = "Demo mode: no email is sent yet — any 6 digits will work.",
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.InkFaint,
            )
        }
    }
}

/** The quiet support line that sits above the advance button on auth steps. */
@Composable
fun SupportFooter() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "Experiencing issues? Email our team:",
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.InkFaint,
            textAlign = TextAlign.Center,
        )
        Text(
            text = stringResource(R.string.support_email),
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.InkMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
