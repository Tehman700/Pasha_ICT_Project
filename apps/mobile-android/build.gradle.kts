// Top-level build file.
//
// Every plugin used by any module is declared here once, with a version, and
// `apply false`. Modules then apply them by alias without a version.
//
// This is not optional tidiness. Requesting com.android.library with a version
// in a module fails once the application plugin has already put it on the
// classpath: "the plugin is already on the classpath with an unknown version,
// so compatibility cannot be checked".
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.compose.compiler) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
}
