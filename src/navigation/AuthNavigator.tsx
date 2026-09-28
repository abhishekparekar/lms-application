import React, { useState } from 'react';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPassword } from '../screens/auth/ForgotPassword';

interface AuthNavigatorProps {
  onLoginSuccess: () => void;
  onBackToLanding: () => void;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({
  onLoginSuccess,
  onBackToLanding,
}) => {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [registerInitialRole, setRegisterInitialRole] = useState<'seeker' | 'recruiter'>('seeker');

  switch (currentScreen) {
    case 'login':
      return (
        <LoginScreen
          onRegisterPress={(role) => {
            setRegisterInitialRole(role || 'seeker');
            setCurrentScreen('register');
          }}
          onLoginSuccess={onLoginSuccess}
          onForgotPasswordPress={() => setCurrentScreen('forgot_password')}
          onBack={onBackToLanding}
        />
      );
    case 'register':
      return (
        <RegisterScreen
          initialRole={registerInitialRole}
          onLoginPress={() => setCurrentScreen('login')}
          onRegisterSuccess={onLoginSuccess}
          onBack={onBackToLanding}
        />
      );
    case 'forgot_password':
      return (
        <ForgotPassword
          onBackToLogin={() => setCurrentScreen('login')}
        />
      );
    default:
      return (
        <LoginScreen
          onRegisterPress={(role) => {
            setRegisterInitialRole(role || 'seeker');
            setCurrentScreen('register');
          }}
          onLoginSuccess={onLoginSuccess}
          onForgotPasswordPress={() => setCurrentScreen('forgot_password')}
          onBack={onBackToLanding}
        />
      );
  }
};
