module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['react-native-worklets-core/plugin'],
      // Reanimated plugin has to be listed last.
      ['react-native-reanimated/plugin'],
    ],
  };
}; 