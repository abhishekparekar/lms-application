import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme, LogBox, StatusBar as RNStatusBar, Platform, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

LogBox.ignoreLogs(['Cannot connect to Expo CLI', 'Setting a timer', 'WebChannelConnection RPC', 'transport errored']);

const CustomTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
    card: '#ffffff',
    text: '#111827',
    border: '#E2E8F0',
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const forceWhiteStatusBar = () => {
      RNStatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor('#4F46E5', true);
        RNStatusBar.setTranslucent(false);
      }
    };

    forceWhiteStatusBar();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        forceWhiteStatusBar();
      }
    });

    SplashScreen.hideAsync().catch(() => {});

    return () => {
      subscription.remove();
    };
  }, [colorScheme]);

  return (
    <AuthProvider>
      <ThemeProvider value={CustomTheme}>
        <RNStatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
        <StatusBar style="light" />
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </AuthProvider>
  );
}
