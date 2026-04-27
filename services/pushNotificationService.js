/**
 * pushNotificationService.js  (Customer / User App)
 * ──────────────────────────────────────────────────
 * Web-safe: expo-notifications and expo-device are only imported
 * on native (Android/iOS). On web, all functions are no-ops so
 * Metro can bundle without crashing.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../constants/api';

const EAS_PROJECT_ID = '2ce589a4-f05e-44ef-8fe3-f5a98ada8a93';

// ── Web stub — all functions are safe no-ops on web ───────────────────────────
const IS_WEB = Platform.OS === 'web';

// Lazy-load native modules only on native platforms
let Notifications = null;
let Device = null;

if (!IS_WEB) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    // Set foreground handler only on native
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.warn('[Push] Native modules not available:', err.message);
  }
}

// ── Create Android notification channels ─────────────────────────────────────
async function createAndroidChannels() {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'EasyShop Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#115061',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#27ae60',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions & Deals',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#e74c3c',
      sound: 'default',
      enableVibrate: false,
      showBadge: false,
    });
  } catch (err) {
    console.warn('[Push] createAndroidChannels error:', err.message);
  }
}

// ── Request permission & get Expo push token ─────────────────────────────────
export async function registerForPushNotifications() {
  if (IS_WEB || !Notifications || !Device) return null;

  if (!Device.isDevice) {
    console.log('[Push] Skipping — not a real device');
    return null;
  }

  try {
    await createAndroidChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission denied');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });

    const token = tokenData.data;
    console.log('[Push] Token obtained:', token.slice(0, 30) + '...');
    return token;
  } catch (err) {
    console.warn('[Push] registerForPushNotifications error:', err.message);
    return null;
  }
}

// ── Save token to backend ─────────────────────────────────────────────────────
export async function savePushTokenToBackend(token, userId = null, userType = 'guest') {
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/push-tokens/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId, platform: Platform.OS, userType }),
    });
    if (res.ok) {
      await AsyncStorage.setItem('pushToken', token);
      await AsyncStorage.setItem('pushTokenUserType', userType);
      if (userId) await AsyncStorage.setItem('pushTokenUserId', userId);
      console.log(`[Push] Token saved (userType: ${userType})`);
    } else {
      console.warn('[Push] Failed to save token:', res.status);
    }
  } catch (err) {
    console.warn('[Push] savePushTokenToBackend error:', err.message);
  }
}

// ── Link token to logged-in user ──────────────────────────────────────────────
export async function linkPushTokenToUser(userId) {
  if (!userId || IS_WEB) return;
  try {
    const token = await AsyncStorage.getItem('pushToken');
    if (token) {
      await savePushTokenToBackend(token, userId, 'user');
    } else {
      const newToken = await registerForPushNotifications();
      if (newToken) await savePushTokenToBackend(newToken, userId, 'user');
    }
    console.log('[Push] Token linked to user:', userId);
  } catch (err) {
    console.warn('[Push] linkPushTokenToUser error:', err.message);
  }
}

// ── Unlink token on logout ────────────────────────────────────────────────────
export async function unlinkPushTokenFromUser() {
  if (IS_WEB) return;
  try {
    const token = await AsyncStorage.getItem('pushToken');
    if (token) await savePushTokenToBackend(token, null, 'guest');
    await AsyncStorage.removeItem('pushTokenUserId');
    await AsyncStorage.setItem('pushTokenUserType', 'guest');
    console.log('[Push] Token unlinked (reset to guest)');
  } catch (err) {
    console.warn('[Push] unlinkPushTokenFromUser error:', err.message);
  }
}

// ── Clear token (on logout / uninstall) ───────────────────────────────────────
export async function clearPushToken() {
  try {
    await AsyncStorage.removeItem('pushToken');
    await AsyncStorage.removeItem('pushTokenUserId');
    await AsyncStorage.removeItem('pushTokenUserType');
  } catch (err) {
    console.warn('[Push] clearPushToken error:', err.message);
  }
}

// ── Notification listeners ────────────────────────────────────────────────────
export function setupNotificationListeners(onNotification, onNotificationResponse) {
  if (IS_WEB || !Notifications) return () => {};

  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Push] Received:', notification.request.content.title);
    onNotification?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Push] Tapped:', response.notification.request.content.title);
    onNotificationResponse?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

// ── Initialize everything (call once on app start) ────────────────────────────
export async function initPushNotifications(onNotification, onNotificationResponse) {
  if (IS_WEB) return () => {};

  try {
    const token = await registerForPushNotifications();
    if (token) {
      const userRaw = await AsyncStorage.getItem('userData') || await AsyncStorage.getItem('currentUser');
      const userId = userRaw ? (JSON.parse(userRaw)?._id || JSON.parse(userRaw)?.id || null) : null;
      await savePushTokenToBackend(token, userId, userId ? 'user' : 'guest');
    }
    return setupNotificationListeners(onNotification, onNotificationResponse);
  } catch (err) {
    console.warn('[Push] initPushNotifications error:', err.message);
    return () => {};
  }
}

// ── Send local notification ───────────────────────────────────────────────────
export async function sendLocalNotification(title, body, data = {}, channelId = 'default') {
  if (IS_WEB || !Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Push] sendLocalNotification error:', err.message);
  }
}
