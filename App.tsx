import 'react-native-url-polyfill/auto';
import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {Provider as PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Toast, {BaseToast} from 'react-native-toast-message';

import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import {useThemeStore, lightTheme, darkTheme} from './src/store/themeStore';
import {setupFCMListeners, requestFCMPermission} from './src/services/notificationService';
import {COLORS} from './src/constants';

// Suppress known non-critical third-party warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App: React.FC = () => {
  const {isDark} = useThemeStore();
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    // Request FCM permission and setup listeners
    requestFCMPermission();
    const unsubscribe = setupFCMListeners(remoteMessage => {
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title || 'New Notification',
        text2: remoteMessage.notification?.body,
        visibilityTime: 4000,
      });
    });
    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={isDark ? COLORS.backgroundDark : COLORS.background}
            translucent={false}
          />
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
          <Toast
            config={{
              success: props => (
                <BaseToast
                  {...props}
                  style={{borderLeftColor: COLORS.success}}
                  text1Style={{fontSize: 14, fontWeight: '700'}}
                />
              ),
              error: props => (
                <BaseToast
                  {...props}
                  style={{borderLeftColor: COLORS.error}}
                  text1Style={{fontSize: 14, fontWeight: '700'}}
                />
              ),
            }}
          />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
