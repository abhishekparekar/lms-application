import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { Platform } from 'react-native';

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyCpRlTNQKmyFqUKUo5zH_8ZbyaWZQe-Vec",
  authDomain: "ffhh-5f5b1.firebaseapp.com",
  databaseURL: "https://ffhh-5f5b1-default-rtdb.firebaseio.com",
  projectId: "ffhh-5f5b1",
  storageBucket: "ffhh-5f5b1.firebasestorage.app",
  messagingSenderId: "1060819037700",
  appId: "1:1060819037700:web:3277aa663d612687e00f51",
  measurementId: "G-M3VXQQVEWX"
};

// Initialize primary Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize secondary Firebase App (useful for creating/managing users without messing with the active auth session)
const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');

const auth = (() => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  } else {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // @ts-ignore
      const { getReactNativePersistence } = require('firebase/auth');
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      console.warn('[FirebaseConfig] AsyncStorage not found, falling back to in-memory auth persistence.', e);
      return getAuth(app);
    }
  }
})();

const secondaryAuth = (() => {
  if (Platform.OS === 'web') {
    return getAuth(secondaryApp);
  } else {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // @ts-ignore
      const { getReactNativePersistence } = require('firebase/auth');
      return initializeAuth(secondaryApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      return getAuth(secondaryApp);
    }
  }
})();

// Initialize Databases
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});              // Cloud Firestore (Document Database) with long-polling forced to prevent transport errors on React Native
const realtimeDb = getDatabase(app);      // Realtime Database (JSON Tree Database)

// Initialize Cloud Storage
const storage = getStorage(app);

// Initialize Firebase Messaging (Push Notifications) only on supported platforms (Web)
let messaging: any = null;
if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  }).catch((err) => {
    console.warn('[FirebaseConfig] Messaging support check failed:', err);
  });
}

export { auth, secondaryAuth, db, realtimeDb, storage, messaging };
export default app;
