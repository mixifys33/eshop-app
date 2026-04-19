import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const Toast = ({ visible, message, type = 'info', duration = 3000, onHide }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide && onHide();
    });
  };

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#27ae60',
          borderColor: '#2ecc71',
        };
      case 'error':
        return {
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
        };
      case 'warning':
        return {
          backgroundColor: '#f39c12',
          borderColor: '#e67e22',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        getToastStyle(),
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={hideToast}
        activeOpacity={0.8}
      >
        <Ionicons name={getIcon()} size={24} color="white" style={styles.icon} />
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 60,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default Toast;