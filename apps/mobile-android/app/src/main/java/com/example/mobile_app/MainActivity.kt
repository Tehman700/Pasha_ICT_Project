package com.example.mobile_app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import com.example.mobile_app.nav.AppNavHost
import com.example.mobile_app.ui.theme.AppTheme
import com.example.mobile_app.ui.theme.Brand
import androidx.compose.foundation.layout.Box

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            AppTheme {
                // Paints behind the system bars so edge-to-edge never shows white.
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Brand.Background)
                ) {
                    AppNavHost()
                }
            }
        }
    }
}
