const { getDefaultConfig } = require('expo/metro-config');
const path = require('path'); // Add this line

const config = getDefaultConfig(__dirname);

// Add asset resolver configuration
config.resolver.assetExts = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ttf', 'otf'
];
config.resolver.sourceExts = [
  'js', 'jsx', 'ts', 'tsx', 'json', 'svg'
];

// Ensure working with Supabase
config.resolver.unstable_conditionNames = ['require', 'default', 'browser'];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ['browser'] },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Make sure assets folder is being watched
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'assets'),
];

module.exports = config;