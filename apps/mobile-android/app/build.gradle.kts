plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
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
    implementation(project(":core-ui"))
    implementation(project(":core-data"))

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

    // Group 1 - networking and JSON.
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.json)
    implementation(libs.ktor.client.logging)
    implementation(libs.ktor.client.websockets)
    implementation(libs.kotlinx.serialization.json)

    // Group 2 - session storage.
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.security.crypto)

    // Group 3 - QR, split by flavor rather than shared.
    //
    // ML Kit's bundled barcode model is libbarhopper_v3.so, 19.3 MB on its
    // own. Shipping it in both apps took the parent APK from 18 MB to 45 MB,
    // and the parent app never scans a code - it displays one. On the cheap
    // Xiaomi and Infinix handsets this market actually runs, on metered data,
    // that download is a real cost to a parent for a library they never call.
    //
    // The bundled model stays bundled, not the Play-Services-delivered
    // variant: the gate has to verify with no signal.
    //
    // CameraX is staff-only for the same reason. PhotoScreen takes its picture
    // through the system picker, not CameraX, so the parent app needs neither.
    //
    // Quoted configuration names on purpose: the Kotlin DSL only generates
    // typed accessors like staffImplementation(...) for flavors declared in
    // an already-applied plugin, not for ones declared in this same file.
    "staffImplementation"(libs.androidx.camera.core)
    "staffImplementation"(libs.androidx.camera.camera2)
    "staffImplementation"(libs.androidx.camera.lifecycle)
    "staffImplementation"(libs.androidx.camera.view)
    "staffImplementation"(libs.mlkit.barcode.scanning)

    // Generation only. The collector shows the rotating code; nobody in the
    // staff app ever renders one.
    "parentImplementation"(libs.zxing.core)

    // Group 4 - offline queue.
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Group 5 - background sync.
    implementation(libs.androidx.work.runtime)

    // Group 6 - push. See the catalog note: no google-services plugin yet.
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)

    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
}
