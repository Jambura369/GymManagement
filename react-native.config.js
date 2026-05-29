module.exports = {
  project: {
    android: {
      sourceDir: './android',
    },
  },
  assets: ['./src/assets/fonts/'],
  dependencies: {
    // React Native Vector Icons - manual linking
    'react-native-vector-icons': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
