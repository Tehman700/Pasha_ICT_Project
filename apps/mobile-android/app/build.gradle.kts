plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.rukhsat.app"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        // No applicationId here on purpose - each product flavor sets its own.
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Two apps, one codebase. The application IDs are fixed: they match the
    // React Native builds already installed on real devices and the download
    // links on admin.tideover.site. Changing them orphans every install.
    //
    // The launcher label is NOT set with resValue() here, though ARCHITECTURE.md
    // originally specified that. AGP 9 turns the resValues build feature off by
    // default and fails configuration with "Product Flavor parent contains
    // custom resource values, but the feature is disabled". Rather than switch
    // on an extra build feature, each flavor keeps its label in its own
    // src/<flavor>/res/values/strings.xml, which is where a string belongs.
    flavorDimensions += "surface"
    productFlavors {
        create("parent") {
            dimension = "surface"
            applicationId = "com.rukhsat.parent"
        }
        create("staff") {
            dimension = "surface"
            applicationId = "com.rukhsat.staff"
        }
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.coil.compose)

    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
}
