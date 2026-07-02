import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/services/firebase/config';
import { authService, UserProfile } from '@/services/auth/authService';

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: typeof authService.login;
  register: typeof authService.register;
  logout: typeof authService.logout;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is configured, listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const profile = await authService.getUserProfile(fbUser.uid);
          setUser(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback user if profile loading fails
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'User',
            role: 'seeker',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (params: Parameters<typeof authService.login>[0]) => {
    setLoading(true);
    try {
      const response = await authService.login(params);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (params: Parameters<typeof authService.register>[0]) => {
    setLoading(true);
    try {
      const response = await authService.register(params);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) throw new Error('No user is currently logged in');
    const updatedProfile = await authService.updateUserProfile(user.uid, profileData);
    setUser(updatedProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
