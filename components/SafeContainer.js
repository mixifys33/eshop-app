import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';

/**
 * SafeContainer - Properly handles safe areas for all devices
 * Fixes the "floating" feeling and ensures content fits perfectly on screen
 */
const SafeContainer = ({ children, style, edges = ['top', 'bottom'] }) => {
  // Get safe area insets for different devices
  const getTopInset = () => {
    if (Platform.OS === 'ios') {
      // iPhone with notch: 44, iPhone without notch: 20
      return Platform.Version >= 11 ? 44 : 20;
    }
    // Android: Use StatusBar height
    return StatusBar.currentHeight || 0;
  };

  const getBottomInset = () => {
    if (Platform.OS === 'ios') {
      // iPhone with home indicator: 34, without: 0
      return Platform.Version >= 11 ? 34 : 0;
    }
    // Android with gesture navigation: 20, with buttons: 0
    return 20;
  };

  const paddingTop = edges.includes('top') ? getTopInset() : 0;
  const paddingBottom = edges.includes('bottom') ? getBottomInset() : 0;

  return (
    <View style={[styles.container, { paddingTop, paddingBottom }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeContainer;
