import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme, LogBox, StatusBar as RNStatusBar, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

LogBox.ignoreLogs(['Cannot connect to Expo CLI', 'Setting a timer', 'WebChannelConnection RPC', 'transport errored']);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#4F46E5');
      RNStatusBar.setTranslucent(false);
    }
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
        <StatusBar style="light" />
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </AuthProvider>
  );
}
