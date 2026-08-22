/**
 * Excludes @expo/config-plugins and its own dependency tree from the
 * expo-updates fingerprint.
 *
 * These packages generate/edit native project files during `expo prebuild`
 * (plist, xcode, xml2js, image-utils, …) — none of them are React Native
 * runtime code and none of them compile into the APK, so their presence has
 * no bearing on whether a JS update is compatible with an installed build.
 *
 * They still ended up in the fingerprint diff as pure noise: a
 * `--frozen-lockfile` install on EAS's Linux builder places this cluster at
 * a different location in node_modules than the same install produces
 * locally on Windows, even though the *resolved version* — the thing that
 * actually matters — is identical either way. @expo/fingerprint hashes
 * whatever files it finds, so a placement difference with zero semantic
 * change was enough to fail every build with "Runtime version calculated on
 * local machine not equal to runtime version calculated during build."
 *
 * A genuine @expo/config-plugins version bump still invalidates the
 * fingerprint through the other sources that track it — the lockfile hash
 * and the `expo` package version — so this does not weaken the actual
 * safety property: an OTA update that assumes a native module the installed
 * APK lacks is still refused rather than served. See docs/RUNNING_ON_PHONES.md.
 */
module.exports = {
  ignorePaths: [
    "../../node_modules/@expo/config/**",
    "../../node_modules/@expo/config-plugins/**",
    "../../node_modules/@expo/image-utils/**",
    "../../node_modules/@expo/json-file/**",
    "../../node_modules/@expo/require-utils/**",
    "../../node_modules/@expo/schema-utils/**",
    "../../node_modules/expo/config-plugins.js",
    "../../node_modules/expo/config/**",
    "../../node_modules/ansi-styles/**",
    "../../node_modules/base64-js/**",
    "../../node_modules/big-integer/**",
    "../../node_modules/bplist-creator/**",
    "../../node_modules/chalk/**",
    "../../node_modules/jimp-compact/**",
    "../../node_modules/json5/**",
    "../../node_modules/parse-png/**",
    "../../node_modules/plist/**",
    "../../node_modules/sax/**",
    "../../node_modules/simple-plist/**",
    "../../node_modules/stream-buffers/**",
    "../../node_modules/uuid/**",
    "../../node_modules/xcode/**",
    "../../node_modules/xml2js/**",
    "../../node_modules/xmlbuilder/**",

    // Android build OUTPUT inside node_modules, not source.
    //
    // Running `expo run:android` locally compiles every autolinked native
    // module in place, leaving android/build, android/.cxx and android/.gradle
    // inside the package directory. EAS's builder has none of that, so
    // @expo/fingerprint - which hashes a whole directory for autolinked
    // modules - produced a different hash for the same package and failed the
    // build with the same "Runtime version calculated on local machine not
    // equal to runtime version calculated during build" as before.
    //
    // The real diff from the build log was exactly one entry:
    //   @react-native-masked-view/masked-view, reason rncoreAutolinkingAndroid,
    //   local 8cdd4a86..., EAS b7bc27de...
    // and 28 packages on this machine had such directories waiting to do the
    // same thing.
    //
    // Excluding compiler output weakens nothing. A genuine change to a native
    // module still moves the fingerprint through its source files, its
    // package.json and the lockfile hash. Build output is derived from those,
    // never the other way round.
    "../../node_modules/**/android/build/**",
    "../../node_modules/**/android/.cxx/**",
    "../../node_modules/**/android/.gradle/**",
  ],
};
