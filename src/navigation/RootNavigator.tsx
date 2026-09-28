import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PublicNavigator } from './PublicNavigator';
import { AppNavigator } from './AppNavigator';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import * as SplashScreen from 'expo-splash-screen';

export const RootNavigator: React.FC = () => {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return <AnimatedSplashOverlay autoFade={false} />;
  }

  if (!user) {
    return <PublicNavigator onLoginSuccess={() => {}} />;
  }

  return <AppNavigator onLogout={logout} />;
};
