const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Pin every Gradle subproject to one NDK version.
 *
 * Expo's root project picks an NDK and the app module follows it, but modules
 * that never declare `ndkVersion` themselves — expo-updates is one — fall
 * through to the Android Gradle Plugin's own built-in default, which is a
 * different revision. Gradle then tries to download that second NDK mid-build.
 *
 * On a CI image with every NDK preinstalled that is invisible. On a developer
 * machine it is a 745MB download in the middle of a build, and on a connection
 * that drops it is a build that fails after ten minutes with a message about a
 * package that was never asked for.
 *
 * Pinning is safe here because nothing in this repo ships custom C++ — no JSI
 * modules, no native source of our own. The NDK is only present because AGP
 * validates it, so one revision for everything is the honest configuration.
 *
 * This is a config plugin rather than an edit to `android/build.gradle`
 * because that directory is generated: `expo prebuild` regenerates it and any
 * hand edit is silently lost.
 */

const NDK_VERSION = "27.1.12297006";

const MARKER = "// rukhsat: pinned NDK";

/**
 * `plugins.withId`, not `afterEvaluate`.
 *
 * Expo CLI builds with `--configure-on-demand`, so by the time the end of this
 * file is reached some subprojects have already been evaluated and
 * `afterEvaluate` on them throws outright. `withId` has no such ordering
 * constraint: it fires immediately for a plugin that is already applied, and
 * on application for one that is not.
 */
const BLOCK = `
${MARKER}
subprojects { subproject ->
  ["com.android.application", "com.android.library"].each { pluginId ->
    subproject.plugins.withId(pluginId) {
      subproject.android.ndkVersion = "${NDK_VERSION}"
    }
  }
}
`;

//: Insert ahead of the apply lines rather than appending. Appending puts the
//: block after the react/expo root plugins have already configured the tree.
const ANCHOR = 'apply plugin: "expo-root-project"';

module.exports = function withPinnedNdk(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error(
        "with-pinned-ndk only supports the Groovy build.gradle Expo generates",
      );
    }
    if (cfg.modResults.contents.includes(MARKER)) return cfg;

    if (!cfg.modResults.contents.includes(ANCHOR)) {
      throw new Error(
        `with-pinned-ndk could not find '${ANCHOR}' in build.gradle — ` +
          "Expo's template changed and this plugin needs updating.",
      );
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      ANCHOR,
      `${BLOCK}\n${ANCHOR}`,
    );
    return cfg;
  });
};

module.exports.NDK_VERSION = NDK_VERSION;
