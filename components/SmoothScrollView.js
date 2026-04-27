import React from 'react';
import { ScrollView, Platform } from 'react-native';

/**
 * SmoothScrollView - Enhanced ScrollView with better touch response
 * Fixes the "floating" feeling and makes scrolling feel native
 */
const SmoothScrollView = ({ children, style, contentContainerStyle, ...props }) => {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={[
        {
          flexGrow: 1,
          // Remove any floating by ensuring content fills the space
          minHeight: '100%',
        },
        contentContainerStyle,
      ]}
      // Better scroll performance
      removeClippedSubviews={Platform.OS === 'android'}
      scrollEventThrottle={16}
      // Smoother deceleration
      decelerationRate="normal"
      // Better bounce effect on iOS
      bounces={true}
      bouncesZoom={false}
      // Disable scroll indicator for cleaner look
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      // Better keyboard handling
      keyboardShouldPersistTaps="handled"
      // Snap to content for better feel
      snapToAlignment="start"
      // Disable momentum for more controlled scrolling
      disableIntervalMomentum={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default SmoothScrollView;
