package com.rukhsat.app.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rukhsat.app.data.LocationResolver
import com.rukhsat.app.data.SignupViewModel
import com.rukhsat.app.ui.components.OnboardingScaffold
import com.rukhsat.app.ui.theme.Brand
import kotlinx.coroutines.launch

/**
 * The permissions pitch. Flipping a switch on fires the real system prompt;
 * if the user declines, the switch falls back off so it never lies about
 * the actual permission state.
 */
@Composable
fun PermissionsScreen(
    viewModel: SignupViewModel,
    onBack: () -> Unit,
    onNext: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val locationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        val granted = result.values.any { it }
        viewModel.updateLocationAllowed(granted)
        if (granted) {
            scope.launch {
                LocationResolver.resolveCity(context)?.let(viewModel::updateCity)
            }
        }
    }

    val notificationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> viewModel.updateNotificationsAllowed(granted) }

    // If location was already granted before this screen, fill the city in anyway.
    LaunchedEffect(Unit) {
        if (LocationResolver.hasPermission(context)) {
            viewModel.updateLocationAllowed(true)
            LocationResolver.resolveCity(context)?.let(viewModel::updateCity)
        }
    }

    OnboardingScaffold(
        progress = 1f,
        onBack = onBack,
        onNext = onNext,
        nextEnabled = true,
    ) {
        Text(
            text = "Last step!",
            style = MaterialTheme.typography.headlineLarge,
            color = Brand.Ink,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            text = "Rukhsat is for seeing your friends more in real life, " +
                "so we need these permissions to help you do that.",
            style = MaterialTheme.typography.bodyLarge,
            color = Brand.InkMuted,
        )
        Spacer(Modifier.height(24.dp))

        PermissionCard(
            icon = Icons.Outlined.LocationOn,
            title = "Location",
            body = "So we can show who is around you right now, and greet you " +
                "from the city you are actually in.",
            checked = viewModel.locationAllowed,
            onCheckedChange = { wantsOn ->
                if (wantsOn) {
                    locationLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_COARSE_LOCATION,
                            Manifest.permission.ACCESS_FINE_LOCATION,
                        )
                    )
                } else {
                    // The OS gives no way to revoke from inside the app; this
                    // just stops us using it.
                    viewModel.updateLocationAllowed(false)
                }
            },
        )
        Spacer(Modifier.height(12.dp))
        PermissionCard(
            icon = Icons.Outlined.Notifications,
            title = "Notifications",
            body = "We go light on notifications. We only use them to let you know " +
                "when you and your friends are going to be in the same place.",
            checked = viewModel.notificationsAllowed,
            onCheckedChange = { wantsOn ->
                when {
                    !wantsOn -> viewModel.updateNotificationsAllowed(false)
                    // POST_NOTIFICATIONS only exists on API 33+; below that,
                    // notifications are granted at install time.
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ->
                        notificationLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)

                    else -> viewModel.updateNotificationsAllowed(true)
                }
            },
        )

        Spacer(Modifier.height(24.dp))
        Text(
            text = "We take your privacy (and our own) seriously.",
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.InkMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun PermissionCard(
    icon: ImageVector,
    title: String,
    body: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(Brand.Surface)
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Brand.Ink,
                    modifier = Modifier.size(21.dp),
                )
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = Brand.Ink,
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.InkMuted,
            )
        }

        Spacer(Modifier.size(12.dp))

        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Brand.Ink,
                checkedBorderColor = Brand.Ink,
                uncheckedThumbColor = Color.White,
                uncheckedTrackColor = Brand.SurfaceDeep,
                uncheckedBorderColor = Brand.SurfaceDeep,
            ),
        )
    }
}
