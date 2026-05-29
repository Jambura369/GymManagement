import Reactotron from 'reactotron-react-native';

if (__DEV__) {
  Reactotron.configure({name: 'GymManagement'})
    .useReactNative({
      asyncStorage: false,
      networking: {
        ignoreUrls: /symbolicate/,
      },
      editor: false,
      errors: {veto: () => false},
      overlay: false,
    })
    .connect();

  // Silence the Reactotron console log in metro
  console.tron = Reactotron;
}
