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

    // A native module neither mobile app uses, reaching the fingerprint by
    // hoisting accident.
    //
    // @react-native-masked-view/masked-view is not declared by apps/parent-app
    // or apps/staff-app. It arrives as a transitive dependency of
    // apps/admin-web - a Next.js app that cannot autolink anything - gets
    // hoisted to the workspace root, and React Native autolinking then finds
    // it there and hashes the whole directory under rncoreAutolinkingAndroid.
    //
    // It was the entire fingerprint diff on two failed builds:
    //   local 8cdd4a863dcde0be3d195b04b3d90937b7543482
    //   EAS   b7bc27de23ba01de8e9c8a4e566902fd2ba7716e
    // for byte-identical published contents at 0.3.2 - 32 files, verified.
    // pnpm simply does not lay the directory out identically on a Windows
    // install and a fresh Linux one, which is the same root cause the
    // @expo/config-plugins cluster above was excluded for.
    //
    // A genuine version change still moves the fingerprint through the
    // lockfile hash, so the OTA safety property is unaffected.
    "../../node_modules/@react-native-masked-view/**",

    // Android build OUTPUT inside node_modules, not source.
    //
    // These turned out to be a no-op - eas-cli already excludes them - but
    // they are kept as defence in depth, because `expo run:android` does leave
    // android/build, .cxx and .gradle inside 29 packages here and a future
    // fingerprint version could start counting them.
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
