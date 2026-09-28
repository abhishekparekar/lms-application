import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { LogBox, StatusBar as RNStatusBar, Platform } from 'react-native';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding before auth check is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

LogBox.ignoreLogs(['Cannot connect to Expo CLI', 'Setting a timer', 'WebChannelConnection RPC', 'transport errored', 'ERR_STREAM_UNABLE_TO_PIPE', 'Cannot pipe to a closed']);

export default function TabLayout() {
  useEffect(() => {
    setStatusBarStyle('light');
    RNStatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#4F46E5');
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar style="light" />
        <Slot />
      </ThemeProvider>
    </AuthProvider>
  );
}
