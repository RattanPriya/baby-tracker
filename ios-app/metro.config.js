const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main'];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      filePath: path.resolve(__dirname, 'src/shims/ws.js'),
      type: 'sourceFile',
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer/'),
  crypto: require.resolve('./src/shims/crypto.js'),
  events: require.resolve('events/'),
  process: require.resolve('process/browser'),
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util/'),
  ws: require.resolve('./src/shims/ws.js'),
  zlib: require.resolve('browserify-zlib'),
};

module.exports = config;
