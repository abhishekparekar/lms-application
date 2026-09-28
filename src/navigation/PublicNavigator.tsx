import React, { useState } from 'react';
import { LandingScreen } from '../screens/public/LandingScreen';
import { AuthNavigator } from './AuthNavigator';

interface PublicNavigatorProps {
  onLoginSuccess: () => void;
}

type PublicScreen = 'landing' | 'auth';

export const PublicNavigator: React.FC<PublicNavigatorProps> = ({
  onLoginSuccess,
}) => {
  const [currentScreen, setCurrentScreen] = useState<PublicScreen>('landing');

  switch (currentScreen) {
    case 'landing':
      return (
        <LandingScreen 
          onLoginPress={() => setCurrentScreen('auth')}
          onJobsPress={() => setCurrentScreen('auth')}
          onLearnPress={() => setCurrentScreen('auth')}
          onCoursePress={() => setCurrentScreen('auth')}
          onJobPress={() => setCurrentScreen('auth')}
        />
      );
    case 'auth':
      return (
        <AuthNavigator 
          onLoginSuccess={onLoginSuccess}
          onBackToLanding={() => setCurrentScreen('landing')}
        />
      );
    default:
      return (
        <LandingScreen 
          onLoginPress={() => setCurrentScreen('auth')}
          onJobsPress={() => setCurrentScreen('auth')}
          onLearnPress={() => setCurrentScreen('auth')}
          onCoursePress={() => setCurrentScreen('auth')}
          onJobPress={() => setCurrentScreen('auth')}
        />
      );
  }
};
