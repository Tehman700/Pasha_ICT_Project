module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-worklets/plugin must be listed last (Reanimated 4 requirement).
    plugins: ["react-native-worklets/plugin"],
  };
};
