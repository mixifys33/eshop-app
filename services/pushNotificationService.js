/**
 * pushNotificationService.js
 * ─────────────────────────
 * Handles Expo Push Notifications:
 *  - Requesting permission
 *  - Getting the push token
 *  - Saving token to backend
 *  - Listening for incoming notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../config';

// ── How notifications appear when app is in foreground ──────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Request permission & get push token ─────────────────────────────────────
export async function registerForPushNotifications() {
  // Push notifications only work on real devices
  if (!Device.isDevice) {
    console.log('[Push] Skipping — not a real device');
    return null;
  }

  // Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'EasyShop Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#115061',
      sound: 'default',
    });
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission denied by user');
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // from app.json extra.eas.projectId
  });

  const token = tokenData.data;
  console.log('[Push] Token:', token);
  return token;
}

// ── Save token to backend ────────────────────────────────────────────────────
export async function savePushTokenToBackend(token) {
  if (!token) return;

  try {
    // Get user ID if logged in
    const userRaw = await AsyncStorage.getItem('currentUser') || await AsyncStorage.getItem('userData');
    const userId = userRaw ? JSON.parse(userRaw)?._id || JSON.parse(userRaw)?.id : null;

    // Get device platform
    const platform = Platform.OS;

    const res = await fetch(`${API_BASE}/push-tokens/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId, platform }),
    });

    if (res.ok) {
      console.log('[Push] Token saved to backend');
      await AsyncStorage.setItem('pushToken', token);
    } else {
      console.warn('[Push] Failed to save token:', res.status);
    }
  } catch (err) {
    console.warn('[Push] Error saving token:', err.message);
  }
}

// ── Set up notification listeners ────────────────────────────────────────────
export function setupNotificationListeners(onNotification, onNotificationResponse) {
  // Fired when notification arrives while app is open
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Push] Notification received:', notification);
    onNotification?.(notification);
  });

  // Fired when user taps the notification
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Push] Notification tapped:', response);
    onNotificationResponse?.(response);
  });

  // Return cleanup function
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

// ── Initialize everything (call once on app start) ───────────────────────────
export async function initPushNotifications(onNotification, onNotificationResponse) {
  const token = await registerForPushNotifications();
  if (token) {
    await savePushTokenToBackend(token);
  }
  const cleanup = setupNotificationListeners(onNotification, onNotificationResponse);
  return cleanup;
}
