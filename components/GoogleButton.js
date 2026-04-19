import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GoogleButton = ({ mode, onSuccess, onError }) => {
  const handleGoogleAuth = async () => {
    try {
      // This is a placeholder for Google authentication
      // You would implement actual Google Sign-In here using expo-auth-session or similar
      
      Alert.alert(
        'Google Authentication',
        `Google ${mode} will be implemented with proper OAuth flow`,
        [
          {
            text: 'Simulate Success',
            onPress: () => {
              if (onSuccess) {
                onSuccess();
              }
            }
          },
          {
            text: 'Simulate Error',
            onPress: () => {
              if (onError) {
                onError('Google authentication failed');
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Google auth error:', error);
      if (onError) {
        onError('Google authentication failed');
      }
    }
  };

  return (
    <TouchableOpacity style={styles.googleButton} onPress={handleGoogleAuth}>
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.googleButtonText}>
        Continue with Google
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
});

export default GoogleButton;