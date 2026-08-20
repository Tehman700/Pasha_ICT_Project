package com.rukhsat.app.screens

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.rukhsat.app.data.SignupViewModel
import com.rukhsat.app.ui.components.FieldCard
import com.rukhsat.app.ui.components.OnboardingScaffold
import com.rukhsat.app.ui.components.PrivacyNote
import com.rukhsat.app.ui.theme.Brand

@Composable
fun NameScreen(
    viewModel: SignupViewModel,
    onBack: () -> Unit,
    onNext: () -> Unit,
) {
    val firstNameFocus = remember { FocusRequester() }
    val lastNameFocus = remember { FocusRequester() }
    val canContinue = viewModel.firstName.isNotBlank()

    LaunchedEffect(Unit) { firstNameFocus.requestFocus() }

    OnboardingScaffold(
        progress = 0.6f,
        onBack = onBack,
        onNext = { if (canContinue) onNext() },
        nextEnabled = canContinue,
    ) {
        Text(
            text = "What is your name?",
            style = MaterialTheme.typography.headlineLarge,
            color = Brand.Ink,
        )
        Spacer(Modifier.height(24.dp))

        FieldCard(
            label = "First Name",
            value = viewModel.firstName,
            onValueChange = viewModel::updateFirstName,
            focusRequester = firstNameFocus,
            onImeAction = { lastNameFocus.requestFocus() },
        )
        Spacer(Modifier.height(12.dp))
        FieldCard(
            label = "Last Name",
            value = viewModel.lastName,
            onValueChange = viewModel::updateLastName,
            focusRequester = lastNameFocus,
            imeAction = ImeAction.Done,
            onImeAction = { if (canContinue) onNext() },
        )

        Spacer(Modifier.height(16.dp))
        PrivacyNote("We will only show this to people you connect with.")
    }
}
