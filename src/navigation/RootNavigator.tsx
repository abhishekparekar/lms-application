import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PublicNavigator } from './PublicNavigator';
import { AppNavigator } from './AppNavigator';
import { Spinner } from '@/components/loaders/Spinner';

export const RootNavigator: React.FC = () => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <Spinner fullScreen message="Checking authorization..." />;
  }

  if (!user) {
    return <PublicNavigator onLoginSuccess={() => {}} />;
  }

  return <AppNavigator onLogout={logout} />;
};
