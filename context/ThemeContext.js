import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_theme';

export const lightTheme = {
  dark: false,
  bg: '#f8fafc',
  card: '#ffffff',
  cardBorder: '#f1f2f6',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  primary: '#667eea',
  primarySoft: '#667eea20',
  primaryDark: '#5568d3',
  success: '#27ae60',
  successSoft: '#27ae6020',
  danger: '#e74c3c',
  dangerSoft: '#e74c3c20',
  warning: '#f39c12',
  warningSoft: '#f39c1220',
  info: '#3498db',
  infoSoft: '#3498db20',
  headerBg: '#ffffff',
  headerBorder: '#e5e7eb',
  inputBg: '#f8fafc',
  inputBorder: '#e5e7eb',
  inputText: '#1f2937',
  inputPlaceholder: '#9ca3af',
  sectionBg: '#ffffff',
  divider: '#e5e7eb',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  switchTrackFalse: '#e0e0e0',
  switchTrackTrue: '#667eea',
  statusBar: 'dark-content',
  tabBar: '#ffffff',
  tabBarBorder: '#e5e7eb',
  overlay: 'rgba(0,0,0,0.5)',
  shimmer: ['#e8f4fd', '#fef9e7', '#eafaf1'],
  shadow: '#000',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  surface: '#ffffff',
  surfaceSecondary: '#f8fafc',
  icon: '#6b7280',
  iconActive: '#667eea',
  whatsapp: '#25D366',
  call: '#3498db',
};

export const darkTheme = {
  dark: true,
  bg: '#0f172a',
  card: '#1e293b',
  cardBorder: '#334155',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  primary: '#818cf8',
  primarySoft: '#818cf830',
  primaryDark: '#6366f1',
  success: '#34d399',
  successSoft: '#34d39930',
  danger: '#f87171',
  dangerSoft: '#f8717130',
  warning: '#fbbf24',
  warningSoft: '#fbbf2430',
  info: '#60a5fa',
  infoSoft: '#60a5fa30',
  headerBg: '#1e293b',
  headerBorder: '#334155',
  inputBg: '#1e293b',
  inputBorder: '#334155',
  inputText: '#f1f5f9',
  inputPlaceholder: '#64748b',
  sectionBg: '#1e293b',
  divider: '#334155',
  border: '#334155',
  borderLight: '#475569',
  switchTrackFalse: '#475569',
  switchTrackTrue: '#818cf8',
  statusBar: 'light-content',
  tabBar: '#1e293b',
  tabBarBorder: '#334155',
  overlay: 'rgba(0,0,0,0.75)',
  shimmer: ['#1e2a3e', '#2e1e3e', '#1e3e2e'],
  shadow: '#000',
  gradientStart: '#818cf8',
  gradientEnd: '#a78bfa',
  surface: '#1e293b',
  surfaceSecondary: '#0f172a',
  icon: '#94a3b8',
  iconActive: '#818cf8',
  whatsapp: '#25D366',
  call: '#60a5fa',
};

const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
