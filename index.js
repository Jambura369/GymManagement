import './src/config/ReactotronConfig';
import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// Must be registered at module level — before any React component mounts — so
// the handler fires when the app is in background or quit state.
messaging().setBackgroundMessageHandler(async _remoteMessage => {
  // Notifications in background/quit are shown automatically by FCM;
  // handle any data-only payloads here if needed.
});

AppRegistry.registerComponent(appName, () => App);
