module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add this plugin if you don't have it already
      'react-native-reanimated/plugin',
    ]
  };
};