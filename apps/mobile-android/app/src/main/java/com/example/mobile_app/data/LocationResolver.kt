package com.example.mobile_app.data

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

/**
 * Turns the device's last known position into a city name for the dashboard
 * greeting.
 *
 * Uses the platform [LocationManager] and [Geocoder] rather than Play Services
 * so the app carries no Google dependency and still works on devices without
 * it. A last known fix is plenty here — we only need the city, and asking for a
 * live fix would spin up the radio for no benefit.
 */
object LocationResolver {

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /** Returns a city name, or null if it cannot be determined. */
    suspend fun resolveCity(context: Context): String? = withContext(Dispatchers.IO) {
        if (!hasPermission(context)) return@withContext null

        val location = lastKnownLocation(context) ?: return@withContext null

        runCatching {
            @Suppress("DEPRECATION") // The async overload is API 33+; this still works everywhere.
            val addresses = Geocoder(context, Locale.getDefault())
                .getFromLocation(location.latitude, location.longitude, 1)

            addresses?.firstOrNull()?.let { address ->
                address.locality
                    ?: address.subAdminArea
                    ?: address.adminArea
                    ?: address.countryName
            }
        }.getOrNull()
    }

    private fun lastKnownLocation(context: Context): Location? {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return null

        // Newest fix across providers wins; any of them names the city fine.
        return runCatching {
            listOf(
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER,
                LocationManager.PASSIVE_PROVIDER,
            )
                .filter { manager.allProviders.contains(it) }
                .mapNotNull { manager.getLastKnownLocation(it) }
                .maxByOrNull { it.time }
        }.getOrNull()
    }
}
