const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [__dirname],
  watcher: {
    watchman: {
      deferStates: ['hg.update'],
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'bin'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
