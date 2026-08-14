const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const nativeWebMocks = {
  'react-native-maps': './src/lib/web-maps-mock.ts',
  '@react-native-async-storage/async-storage': './src/lib/web-async-storage-mock.ts',
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeWebMocks[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(nativeWebMocks[moduleName]),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
