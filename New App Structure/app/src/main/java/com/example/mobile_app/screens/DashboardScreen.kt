package com.example.mobile_app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Flight
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.IosShare
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.mobile_app.data.SignupViewModel
import com.example.mobile_app.ui.components.PillButton
import com.example.mobile_app.ui.components.ScreenPadding
import com.example.mobile_app.ui.theme.Brand
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private enum class Tab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Outlined.Home),
    Plans("My Plans", Icons.Outlined.Flight),
    People("My People", Icons.Outlined.Groups),
    Profile("Profile", Icons.Outlined.Person),
}

@Composable
fun DashboardScreen(
    viewModel: SignupViewModel,
    onSignOut: () -> Unit,
) {
    var selectedTab by remember { mutableStateOf(Tab.Home) }
    val showCoachMarks = !viewModel.hasSeenCoachMarks

    Box(modifier = Modifier.fillMaxSize().background(Brand.Background)) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.weight(1f)) {
                when (selectedTab) {
                    Tab.Home -> HomeTab(viewModel)
                    Tab.Plans -> EmptyTab(
                        icon = Icons.Outlined.Flight,
                        title = "No plans yet",
                        body = "Add a trip and your friends will know when you are in town.",
                    )
                    Tab.People -> EmptyTab(
                        icon = Icons.Outlined.Groups,
                        title = "No people yet",
                        body = "Once contacts are connected, your people will show up here.",
                    )
                    Tab.Profile -> ProfileTab(viewModel, onSignOut)
                }
            }

            BottomBar(
                selected = selectedTab,
                onSelect = { selectedTab = it },
            )
        }

        if (showCoachMarks) {
            CoachMarks(onDone = { viewModel.markCoachMarksSeen() })
        }
    }
}

/* --------------------------------- Tabs --------------------------------- */

@Composable
private fun HomeTab(viewModel: SignupViewModel) {
    val now = remember { Date() }
    val greeting = remember(now) { greetingForNow() }
    val dateLabel = remember(now) {
        SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(now)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = ScreenPadding),
    ) {
        Spacer(Modifier.height(24.dp))

        Row(verticalAlignment = Alignment.Top) {
            Text(
                text = buildAnnotatedString {
                    append(greeting)
                    // The city only appears once location permission resolves one,
                    // so the greeting still reads properly when it is declined.
                    if (viewModel.city.isNotBlank()) {
                        append("\nfrom ")
                        withStyle(SpanStyle(color = Brand.Accent)) {
                            append(viewModel.city.substringBefore(","))
                        }
                    }
                },
                style = MaterialTheme.typography.displaySmall,
                fontSize = 34.sp,
                lineHeight = 40.sp,
                color = Brand.Ink,
                modifier = Modifier.weight(1f),
            )
            Icon(
                imageVector = Icons.Outlined.Notifications,
                contentDescription = "Notifications",
                tint = Brand.Ink,
                modifier = Modifier
                    .padding(top = 8.dp)
                    .size(26.dp),
            )
        }

        Spacer(Modifier.height(14.dp))
        Row(
            modifier = Modifier
                .clip(CircleShape)
                .background(Brand.SurfaceSunken)
                .padding(horizontal = 14.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(7.dp),
        ) {
            Icon(
                imageVector = Icons.Outlined.CalendarToday,
                contentDescription = null,
                tint = Brand.InkMuted,
                modifier = Modifier.size(15.dp),
            )
            Text(dateLabel, style = MaterialTheme.typography.bodyLarge, color = Brand.InkMuted)
        }

        Spacer(Modifier.height(28.dp))
        Text(
            text = "Invite your friends",
            style = MaterialTheme.typography.headlineSmall,
            color = Brand.Ink,
        )
        Spacer(Modifier.height(12.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(Brand.SurfaceSunken)
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Know someone who lives here or has plans to visit? Invite them.",
                style = MaterialTheme.typography.bodyLarge,
                color = Brand.Ink,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.size(12.dp))
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(Brand.SurfaceDeep),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Outlined.IosShare,
                    contentDescription = "Share an invite",
                    tint = Brand.Ink,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
private fun EmptyTab(icon: ImageVector, title: String, body: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = ScreenPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Brand.InkFaint,
            modifier = Modifier.size(46.dp),
        )
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.headlineSmall, color = Brand.Ink)
        Spacer(Modifier.height(8.dp))
        Text(
            text = body,
            style = MaterialTheme.typography.bodyLarge,
            color = Brand.InkMuted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ProfileTab(viewModel: SignupViewModel, onSignOut: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(horizontal = ScreenPadding),
    ) {
        Spacer(Modifier.height(24.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Profile",
                style = MaterialTheme.typography.displaySmall,
                color = Brand.Ink,
                modifier = Modifier.weight(1f),
            )
            Icon(
                imageVector = Icons.Outlined.Settings,
                contentDescription = "Settings",
                tint = Brand.Ink,
                modifier = Modifier.size(26.dp),
            )
        }

        Spacer(Modifier.height(28.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .clip(CircleShape)
                    .background(Brand.SurfaceDeep),
                contentAlignment = Alignment.Center,
            ) {
                val uri = viewModel.photoUri
                if (uri != null) {
                    AsyncImage(
                        model = uri,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(
                        imageVector = Icons.Outlined.Person,
                        contentDescription = null,
                        tint = Brand.InkMuted,
                        modifier = Modifier.size(38.dp),
                    )
                }
            }
            Spacer(Modifier.size(16.dp))
            Column {
                Text(
                    text = viewModel.fullName.ifBlank { "Your name" },
                    style = MaterialTheme.typography.headlineSmall,
                    color = Brand.Ink,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = viewModel.city.ifBlank { "Location off" },
                    style = MaterialTheme.typography.bodyLarge,
                    color = Brand.InkMuted,
                )
                Text(
                    text = viewModel.email,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Brand.InkFaint,
                )
            }
        }

        Spacer(Modifier.weight(1f))
        PillButton(text = "Sign out", onClick = onSignOut)
        Spacer(Modifier.height(24.dp))
    }
}

/* ------------------------------ Bottom bar ------------------------------ */

@Composable
private fun BottomBar(selected: Tab, onSelect: (Tab) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brand.Background)
            .navigationBarsPadding()
            .padding(horizontal = 8.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BottomBarItem(Tab.Home, selected, onSelect, Modifier.weight(1f))
        BottomBarItem(Tab.Plans, selected, onSelect, Modifier.weight(1f))

        // The centre action is deliberately not a tab — it creates a plan.
        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Brand.Ink),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add a plan",
                    tint = Color.White,
                    modifier = Modifier.size(26.dp),
                )
            }
        }

        BottomBarItem(Tab.People, selected, onSelect, Modifier.weight(1f))
        BottomBarItem(Tab.Profile, selected, onSelect, Modifier.weight(1f))
    }
}

@Composable
private fun BottomBarItem(
    tab: Tab,
    selected: Tab,
    onSelect: (Tab) -> Unit,
    modifier: Modifier = Modifier,
) {
    val isSelected = tab == selected
    val tint = if (isSelected) Brand.Ink else Brand.InkMuted

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable { onSelect(tab) }
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = tab.icon,
            contentDescription = tab.label,
            tint = tint,
            modifier = Modifier.size(24.dp),
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = tab.label,
            style = MaterialTheme.typography.labelMedium,
            color = tint,
        )
    }
}

private fun greetingForNow(): String =
    when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
        in 0..11 -> "Good morning"
        in 12..16 -> "Good afternoon"
        else -> "Good evening"
    }
