package com.rukhsat.app.data

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Holds everything the user enters on the way through onboarding so later
 * steps — and the dashboard — can show it back to them, plus the email code
 * exchange itself.
 */
class SignupViewModel(
    private val auth: AuthRepository = defaultAuthRepository(),
) : ViewModel() {

    var email by mutableStateOf("")
        private set
    var code by mutableStateOf("")
        private set
    var firstName by mutableStateOf("")
        private set
    var lastName by mutableStateOf("")
        private set
    var photoUri by mutableStateOf<Uri?>(null)
        private set
    var locationAllowed by mutableStateOf(false)
        private set
    var notificationsAllowed by mutableStateOf(false)
        private set

    /** Resolved from the device once location permission is granted. */
    var city by mutableStateOf("")
        private set

    var hasSeenCoachMarks by mutableStateOf(false)
        private set

    /* ----------------------------- Code state ---------------------------- */

    var isSending by mutableStateOf(false)
        private set
    var isVerifying by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    /** Seconds left before the current code expires; 0 means resend is allowed. */
    var secondsRemaining by mutableIntStateOf(0)
        private set

    private var countdownJob: Job? = null

    val canResend: Boolean get() = secondsRemaining == 0 && !isSending
    val isCodeComplete: Boolean get() = code.length == CODE_LENGTH

    /** Good enough to catch typos without rejecting unusual but valid addresses. */
    val isEmailValid: Boolean
        get() = EMAIL_PATTERN.matches(email.trim())

    /** True when no Supabase credentials are set, so the UI can say so. */
    val isSimulated: Boolean get() = !SupabaseConfig.isConfigured

    fun updateEmail(value: String) {
        email = value
        errorMessage = null
    }

    fun updateCode(value: String) {
        code = value
        errorMessage = null
    }

    fun updateFirstName(value: String) { firstName = value }
    fun updateLastName(value: String) { lastName = value }
    fun updatePhotoUri(value: Uri?) { photoUri = value }
    fun updateLocationAllowed(value: Boolean) { locationAllowed = value }
    fun updateNotificationsAllowed(value: Boolean) { notificationsAllowed = value }
    fun updateCity(value: String) { city = value }
    fun markCoachMarksSeen() { hasSeenCoachMarks = true }

    val fullName: String
        get() = listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(" ")

    /**
     * Asks the backend to mail a code, then starts the 60-second window. The
     * screen only advances once the send actually succeeds.
     */
    fun sendCode(onSent: () -> Unit = {}) {
        if (isSending) return
        isSending = true
        errorMessage = null

        viewModelScope.launch {
            auth.sendCode(email.trim())
                .onSuccess {
                    isSending = false
                    code = ""
                    startCountdown()
                    onSent()
                }
                .onFailure {
                    isSending = false
                    errorMessage = it.message ?: "Could not send the code. Try again."
                }
        }
    }

    fun verifyCode(onVerified: () -> Unit) {
        if (isVerifying) return
        if (secondsRemaining == 0) {
            errorMessage = "That code has expired. Send a new one."
            return
        }
        isVerifying = true
        errorMessage = null

        viewModelScope.launch {
            auth.verifyCode(email.trim(), code)
                .onSuccess {
                    isVerifying = false
                    stopCountdown()
                    onVerified()
                }
                .onFailure {
                    isVerifying = false
                    code = ""
                    errorMessage = it.message ?: "That code did not work. Try again."
                }
        }
    }

    private fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = viewModelScope.launch {
            secondsRemaining = CODE_VALID_SECONDS
            while (secondsRemaining > 0) {
                delay(1_000)
                secondsRemaining -= 1
            }
        }
    }

    private fun stopCountdown() {
        countdownJob?.cancel()
        countdownJob = null
        secondsRemaining = 0
    }

    /** Clears the session so signing out drops you back to a clean welcome screen. */
    fun reset() {
        stopCountdown()
        email = ""
        code = ""
        firstName = ""
        lastName = ""
        photoUri = null
        locationAllowed = false
        notificationsAllowed = false
        city = ""
        hasSeenCoachMarks = false
        isSending = false
        isVerifying = false
        errorMessage = null
    }

    override fun onCleared() {
        super.onCleared()
        countdownJob?.cancel()
    }

    companion object {
        const val CODE_VALID_SECONDS = 60

        private val EMAIL_PATTERN = Regex("""[^\s@]+@[^\s@]+\.[^\s@]{2,}""")
    }
}
