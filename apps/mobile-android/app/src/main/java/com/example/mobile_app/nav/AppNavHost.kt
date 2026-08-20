package com.example.mobile_app.nav

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.mobile_app.data.SignupViewModel
import com.example.mobile_app.screens.AuthMode
import com.example.mobile_app.screens.DashboardScreen
import com.example.mobile_app.screens.FinishingScreen
import com.example.mobile_app.screens.NameScreen
import com.example.mobile_app.screens.OtpScreen
import com.example.mobile_app.screens.PermissionsScreen
import com.example.mobile_app.screens.EmailScreen
import com.example.mobile_app.screens.PhotoScreen
import com.example.mobile_app.screens.TourScreen
import com.example.mobile_app.screens.WelcomeScreen

object Routes {
    const val WELCOME = "welcome"
    const val TOUR = "tour"
    const val LOGIN_EMAIL = "login/email"
    const val LOGIN_CODE = "login/code"
    const val SIGNUP_EMAIL = "signup/email"
    const val SIGNUP_CODE = "signup/code"
    const val SIGNUP_NAME = "signup/name"
    const val SIGNUP_PHOTO = "signup/photo"
    const val SIGNUP_PERMISSIONS = "signup/permissions"
    const val FINISHING = "finishing"
    const val DASHBOARD = "dashboard"
}

/**
 * The whole flow in one graph. Login and signup share the email/code pair but
 * land in different places: login goes straight to the dashboard, signup
 * continues into profile setup.
 */
@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController(),
) {
    // One instance for the whole graph, so every step reads and writes the same
    // draft profile.
    val signupViewModel: SignupViewModel = viewModel()

    NavHost(navController = navController, startDestination = Routes.WELCOME) {

        composable(Routes.WELCOME) {
            WelcomeScreen(
                onTakeTour = { navController.navigate(Routes.TOUR) },
                onSignUp = { navController.navigate(Routes.SIGNUP_EMAIL) },
                onLogIn = { navController.navigate(Routes.LOGIN_EMAIL) },
            )
        }

        composable(Routes.TOUR) {
            TourScreen(
                onFinish = { navController.navigate(Routes.SIGNUP_EMAIL) },
                onSkip = { navController.navigate(Routes.SIGNUP_EMAIL) },
            )
        }

        /* ------------------------------ Log in ------------------------------ */

        composable(Routes.LOGIN_EMAIL) {
            EmailScreen(
                mode = AuthMode.LogIn,
                viewModel = signupViewModel,
                onBack = { navController.popBackStack() },
                onCodeSent = { navController.navigate(Routes.LOGIN_CODE) },
            )
        }

        composable(Routes.LOGIN_CODE) {
            OtpScreen(
                mode = AuthMode.LogIn,
                viewModel = signupViewModel,
                onBack = { navController.popBackStack() },
                onVerified = { navController.toDashboard() },
            )
        }

        /* ------------------------------ Sign up ----------------------------- */

        composable(Routes.SIGNUP_EMAIL) {
            EmailScreen(
                mode = AuthMode.SignUp,
                viewModel = signupViewModel,
                onBack = { navController.popBackStack() },
                onCodeSent = { navController.navigate(Routes.SIGNUP_CODE) },
            )
        }

        composable(Routes.SIGNUP_CODE) {
            OtpScreen(
                mode = AuthMode.SignUp,
                viewModel = signupViewModel,
                onBack = { navController.popBackStack() },
                onVerified = { navController.navigate(Routes.SIGNUP_NAME) },
            )
        }

        composable(Routes.SIGNUP_NAME) {
            NameScreen(
                viewModel = signupViewModel,
                onBack = { navController.popBackStack() },
                onNext = { navController.navigate(Routes.SIGNUP_PHOTO) },
            )
        }

        composable(Routes.SIGNUP_PHOTO) {
            PhotoScreen(
                viewModel = signupViewModel,
                onBack = { navController.popBackStack() },
                onNext = { navController.navigate(Routes.SIGNUP_PERMISSIONS) },
            )
        }

        composable(Routes.SIGNUP_PERMISSIONS) {
            PermissionsScreen(
                viewModel = signupViewModel,
                onBack = { navController.popBackStack() },
                onNext = { navController.navigate(Routes.FINISHING) },
            )
        }

        composable(Routes.FINISHING) {
            FinishingScreen(onDone = { navController.toDashboard() })
        }

        /* ----------------------------- Signed in ---------------------------- */

        composable(Routes.DASHBOARD) {
            DashboardScreen(
                viewModel = signupViewModel,
                onSignOut = {
                    signupViewModel.reset()
                    navController.navigate(Routes.WELCOME) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
    }
}

/** Entering the app clears onboarding so back does not walk into a half-signup. */
private fun NavHostController.toDashboard() {
    navigate(Routes.DASHBOARD) {
        popUpTo(0) { inclusive = true }
    }
}
