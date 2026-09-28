import { Platform } from 'react-native';
import * as Device from 'expo-device';

export interface PushNotificationToken {
  type: string;
  data: string;
}

export const notificationService = {
  /**
   * Register for push notifications
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('[NotificationService] Push notifications require a physical device.');
      return 'mock-push-token-emulator';
    }

    try {
      // Dynamically load expo-notifications to prevent crash if not installed/configured yet
      const Notifications = require('expo-notifications');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('[NotificationService] Failed to get push token for push notifications!');
        return null;
      }

      // Learn more about Expo Constants and projectId at:
      // https://docs.expo.dev/versions/v56.0.0/sdk/notifications/
      const ExpoConstants = require('expo-constants').default;
      const projectId = 
        ExpoConstants.expoConfig?.extra?.eas?.projectId ?? 
        ExpoConstants.easConfig?.projectId;

      const token = (await Notifications.getDevicePushTokenAsync({ projectId })).data;
      console.log('[NotificationService] Device Push Token:', token);

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.warn('[NotificationService] Error setting up notifications:', error);
      return 'mock-push-token-error';
    }
  },

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification({ title, body, data }: { 
    title: string; 
    body: string; 
    data?: Record<string, any> 
  }): Promise<string | null> {
    try {
      const Notifications = require('expo-notifications');
      
      // Set handler if not set
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: null, // immediate
      });
      return identifier;
    } catch (error) {
      console.log(`[NotificationService Local] ${title}: ${body}`);
      return null;
    }
  }
};
