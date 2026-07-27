import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme, LogBox, StatusBar } from 'react-native';
import { AuthProvider } from '@/context/AuthContext';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

LogBox.ignoreLogs(['Cannot connect to Expo CLI', 'Setting a timer', 'WebChannelConnection RPC', 'transport errored']);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide native splash screen as soon as React component mounts
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#4F46E5"
          translucent={false}
        />
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </AuthProvider>
  );
}
