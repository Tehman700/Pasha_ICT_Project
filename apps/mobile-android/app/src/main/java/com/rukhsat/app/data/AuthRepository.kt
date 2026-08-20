package com.rukhsat.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * Supabase project credentials.
 *
 * Paste the two values from your Supabase dashboard (Project Settings → API).
 * While they stay blank the app runs in simulated mode: no email is sent and
 * any six digits are accepted, so the flow is still walkable.
 *
 * One extra step is needed in Supabase, otherwise it mails a magic *link*
 * rather than a code: Authentication → Emails → Magic Link, and put
 * {{ .Token }} in the template body.
 */
object SupabaseConfig {
    const val URL = ""          // e.g. https://abcdefgh.supabase.co
    const val ANON_KEY = ""

    val isConfigured: Boolean
        get() = URL.isNotBlank() && ANON_KEY.isNotBlank()
}

/** What the UI needs from an auth backend, regardless of who provides it. */
interface AuthRepository {
    suspend fun sendCode(email: String): Result<Unit>
    suspend fun verifyCode(email: String, code: String): Result<Unit>
}

/**
 * Talks to Supabase's GoTrue endpoints over plain HTTP.
 *
 * Deliberately dependency-free (HttpURLConnection + org.json) so nothing new
 * enters the build. When this moves to Kotlin Multiplatform for iOS, this class
 * is the single file to re-implement on Ktor — everything above it is common.
 */
class SupabaseAuthRepository(
    private val baseUrl: String = SupabaseConfig.URL,
    private val anonKey: String = SupabaseConfig.ANON_KEY,
) : AuthRepository {

    override suspend fun sendCode(email: String): Result<Unit> = post(
        path = "/auth/v1/otp",
        body = JSONObject()
            .put("email", email)
            .put("create_user", true),
    )

    override suspend fun verifyCode(email: String, code: String): Result<Unit> = post(
        path = "/auth/v1/verify",
        body = JSONObject()
            .put("email", email)
            .put("token", code)
            .put("type", "email"),
    )

    private suspend fun post(path: String, body: JSONObject): Result<Unit> =
        withContext(Dispatchers.IO) {
            var connection: HttpURLConnection? = null
            try {
                connection = (URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection)
                    .apply {
                        requestMethod = "POST"
                        doOutput = true
                        connectTimeout = 15_000
                        readTimeout = 15_000
                        setRequestProperty("apikey", anonKey)
                        setRequestProperty("Authorization", "Bearer $anonKey")
                        setRequestProperty("Content-Type", "application/json")
                    }

                connection.outputStream.use { it.write(body.toString().toByteArray()) }

                val status = connection.responseCode
                if (status in 200..299) {
                    Result.success(Unit)
                } else {
                    Result.failure(RuntimeException(readError(connection, status)))
                }
            } catch (t: Throwable) {
                Result.failure(t)
            } finally {
                connection?.disconnect()
            }
        }

    /** Surfaces Supabase's own message where it has one, so errors stay useful. */
    private fun readError(connection: HttpURLConnection, status: Int): String {
        val raw = runCatching {
            connection.errorStream?.bufferedReader()?.use(BufferedReader::readText)
        }.getOrNull().orEmpty()

        val message = runCatching {
            val json = JSONObject(raw)
            json.optString("msg")
                .ifBlank { json.optString("error_description") }
                .ifBlank { json.optString("message") }
                .ifBlank { json.optString("error") }
        }.getOrNull().orEmpty()

        return message.ifBlank { "Request failed ($status)" }
    }
}

/**
 * Stand-in used until Supabase credentials are filled in: accepts any six
 * digits so the flow can be walked end to end without a network.
 */
class SimulatedAuthRepository : AuthRepository {
    override suspend fun sendCode(email: String): Result<Unit> = Result.success(Unit)

    override suspend fun verifyCode(email: String, code: String): Result<Unit> =
        if (code.length == CODE_LENGTH) {
            Result.success(Unit)
        } else {
            Result.failure(IllegalArgumentException("Enter all $CODE_LENGTH digits"))
        }
}

const val CODE_LENGTH = 6

/** Picks the real backend when configured, the simulator otherwise. */
fun defaultAuthRepository(): AuthRepository =
    if (SupabaseConfig.isConfigured) SupabaseAuthRepository() else SimulatedAuthRepository()
