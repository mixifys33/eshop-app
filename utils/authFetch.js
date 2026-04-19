/**
 * authFetch — drop-in replacement for fetch() on authenticated endpoints.
 * Automatically refreshes an expired JWT and retries the request once.
 * Usage: same as fetch(), just import authFetch instead.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../config';

export async function authFetch(url, options = {}) {
  const token = await AsyncStorage.getItem('userToken');

  const makeRequest = (t) => fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });

  let res = await makeRequest(token);

  // If expired, try to refresh once then retry
  if (res.status === 401) {
    let body = {};
    try { body = await res.clone().json(); } catch (_) {}

    if (body.error === 'token_expired' || body.message === 'Session expired') {
      const newToken = await refreshToken(token);
      if (newToken) {
        res = await makeRequest(newToken);
      }
    }
  }

  return res;
}

async function refreshToken(oldToken) {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oldToken}`,
      },
    });

    if (!res.ok) {
      // Refresh failed — clear stored credentials so user is prompted to log in
      await AsyncStorage.multiRemove(['userToken', 'userData', 'currentUser']);
      return null;
    }

    const data = await res.json();
    if (data.token) {
      await AsyncStorage.setItem('userToken', data.token);
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        await AsyncStorage.setItem('currentUser', JSON.stringify({ ...data.user, _id: data.user.id }));
      }
      return data.token;
    }
    return null;
  } catch (_) {
    return null;
  }
}
