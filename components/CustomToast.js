import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const CustomToast = ({ type, text1, text2 }) => {
  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          colors: ['#10B981', '#059669'],
          icon: 'checkmark-circle',
          iconColor: '#FFFFFF',
        };
      case 'error':
        return {
          colors: ['#EF4444', '#DC2626'],
          icon: 'close-circle',
          iconColor: '#FFFFFF',
        };
      case 'info':
        return {
          colors: ['#3B82F6', '#2563EB'],
          icon: 'information-circle',
          iconColor: '#FFFFFF',
        };
      case 'warning':
        return {
          colors: ['#F59E0B', '#D97706'],
          icon: 'warning',
          iconColor: '#FFFFFF',
        };
      default:
        return {
          colors: ['#6B7280', '#4B5563'],
          icon: 'information-circle',
          iconColor: '#FFFFFF',
        };
    }
  };

  const config = getToastConfig();

  return (
    <LinearGradient
      colors={config.colors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.content}>
        <Ionicons 
          name={config.icon} 
          size={24} 
          color={config.iconColor} 
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{text1}</Text>
          {text2 && <Text style={styles.subtitle}>{text2}</Text>}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default CustomToast;