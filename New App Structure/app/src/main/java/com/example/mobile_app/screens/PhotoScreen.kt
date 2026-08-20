package com.example.mobile_app.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.mobile_app.data.SignupViewModel
import com.example.mobile_app.ui.components.OnboardingScaffold
import com.example.mobile_app.ui.components.PrivacyNote
import com.example.mobile_app.ui.theme.Brand

/**
 * Profile photo step. Uses the system photo picker, which needs no runtime
 * permission — the user only ever hands over the one image they choose.
 */
@Composable
fun PhotoScreen(
    viewModel: SignupViewModel,
    onBack: () -> Unit,
    onNext: () -> Unit,
) {
    val pickPhoto = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri -> if (uri != null) viewModel.updatePhotoUri(uri) }

    val openPicker = {
        pickPhoto.launch(
            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
        )
    }

    OnboardingScaffold(
        progress = 0.8f,
        onBack = onBack,
        onNext = onNext,
        // Skippable on purpose: a missing avatar should not block the flow.
        nextEnabled = true,
    ) {
        Text(
            text = "Add a profile image",
            style = MaterialTheme.typography.headlineLarge,
            color = Brand.Ink,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Pick a picture that will make your friends smile.",
            style = MaterialTheme.typography.bodyLarge,
            color = Brand.InkMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(24.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.78f)
                .clip(RoundedCornerShape(28.dp))
                .background(Brand.SurfaceDeep)
                .clickable(onClick = openPicker),
            contentAlignment = Alignment.Center,
        ) {
            val uri = viewModel.photoUri
            if (uri == null) {
                Icon(
                    imageVector = Icons.Outlined.AddPhotoAlternate,
                    contentDescription = "Choose a photo",
                    tint = Brand.Ink.copy(alpha = 0.75f),
                    modifier = Modifier.size(46.dp),
                )
            } else {
                AsyncImage(
                    model = uri,
                    contentDescription = "Your profile photo",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                // Scrim keeps the overlaid name legible over any photo.
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0.55f to Color.Transparent,
                                1f to Color.Black.copy(alpha = 0.55f),
                            )
                        )
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = viewModel.fullName.uppercase(),
                        style = MaterialTheme.typography.headlineSmall,
                        fontSize = 26.sp,
                        color = Color.White,
                        textAlign = TextAlign.Center,
                    )
                    if (viewModel.city.isNotBlank()) {
                        Spacer(Modifier.height(10.dp))
                        Row(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.55f))
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Home,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp),
                            )
                            Text(
                                text = viewModel.city,
                                style = MaterialTheme.typography.labelMedium,
                                color = Color.White,
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        PrivacyNote("We will only show this image to people you connect with.")
    }
}
