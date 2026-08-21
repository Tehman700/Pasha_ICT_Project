pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "rukhsat-mobile"
include(":app")

// Shared modules. Empty at the end of Phase 0 by design - they exist so the
// code written in Phase 1 onward has an obvious home, rather than piling into
// :app and being untangled later.
//
// There is no :core-i18n. It was dropped with Urdu on 21 Aug 2026: with one
// language a module for strings earns nothing. See docs/mobile-v2/I18N.md.
include(":core-ui")
include(":core-data")
 