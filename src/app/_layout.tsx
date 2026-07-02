import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/context/AuthContext';
import { Slot } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['Cannot connect to Expo CLI', 'Setting a timer', 'WebChannelConnection RPC', 'transport errored']);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </AuthProvider>
  );
}
