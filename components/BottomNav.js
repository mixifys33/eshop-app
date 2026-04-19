import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native';

const TABS = [
  { label: 'Home',       icon: 'home',                        screen: 'home' },
  { label: 'Categories', icon: 'grid-outline',                screen: 'AllCategories' },
  { label: 'Products',   icon: 'cube-outline',                screen: 'ShopAllProducts' },
  { label: 'AI',         icon: 'chatbubble-ellipses-outline', screen: 'ShopAI' },
  { label: 'Orders',     icon: 'receipt-outline',             screen: 'UserOrders' },
  { label: 'Account',    icon: 'person-circle-outline',       screen: 'Account' },
];

export default function BottomNav({ navigation, activeScreen = '', isLoggedIn = false }) {
  const handlePress = (tab) => {
    const screen = tab.screen === 'Account'
      ? (isLoggedIn ? 'UserProfile' : 'Login')
      : tab.screen;
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        {TABS.map(tab => {
          const isActive = activeScreen === tab.screen ||
            (tab.screen === 'home' && activeScreen === 'home');
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.item}
              onPress={() => handlePress(tab)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.icon.replace('-outline', '') : tab.icon}
                size={24}
                color={isActive ? '#3498db' : '#888'}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    ...Platform.select({
      web: { boxShadow: '0 -3px 12px rgba(0,0,0,0.1)' },
    }),
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    paddingBottom: 8,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  labelActive: {
    color: '#3498db',
  },
});
