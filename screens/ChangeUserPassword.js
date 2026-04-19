import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import CustomToast from '../components/CustomToast';
import API_BASE from '../constants/api';
import { authFetch } from '../utils/authFetch';

const { width, height } = Dimensions.get('window');

const ChangeUserPassword = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Password visibility states
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fix the errors and try again',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Password Changed',
          text2: 'Your password has been updated successfully',
          position: 'top',
          visibilityTime: 2000,
        });

        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Change Failed',
          text2: data.message || 'Failed to change password',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Please check your connection and try again',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Change Password</Text>
            
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <MaterialIcons name="security" size={32} color="#667eea" />
          </View>
          <Text style={styles.infoTitle}>Secure Your Account</Text>
          <Text style={styles.infoText}>
            Choose a strong password with at least 6 characters including uppercase, lowercase, and numbers.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={[styles.inputContainer, errors.currentPassword && styles.inputError]}>
              <MaterialIcons name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (errors.currentPassword) {
                    setErrors(prev => ({ ...prev, currentPassword: null }));
                  }
                }}
                secureTextEntry={!currentPasswordVisible}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setCurrentPasswordVisible(!currentPasswordVisible)}
              >
                <Ionicons 
                  name={currentPasswordVisible ? 'eye' : 'eye-off'} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={[styles.inputContainer, errors.newPassword && styles.inputError]}>
              <MaterialIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) {
                    setErrors(prev => ({ ...prev, newPassword: null }));
                  }
                }}
                secureTextEntry={!newPasswordVisible}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setNewPasswordVisible(!newPasswordVisible)}
              >
                <Ionicons 
                  name={newPasswordVisible ? 'eye' : 'eye-off'} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
              <MaterialIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: null }));
                  }
                }}
                secureTextEntry={!confirmPasswordVisible}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              >
                <Ionicons 
                  name={confirmPasswordVisible ? 'eye' : 'eye-off'} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Password Strength Indicator */}
          <View style={styles.strengthContainer}>
            <Text style={styles.strengthLabel}>Password Strength:</Text>
            <View style={styles.strengthBar}>
              <View style={[
                styles.strengthFill,
                { 
                  width: `${getPasswordStrength(newPassword)}%`,
                  backgroundColor: getPasswordStrengthColor(newPassword)
                }
              ]} />
            </View>
            <Text style={[styles.strengthText, { color: getPasswordStrengthColor(newPassword) }]}>
              {getPasswordStrengthText(newPassword)}
            </Text>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity 
            style={[styles.changeButton, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons name="security" size={18} color="white" />
                  <Text style={styles.buttonText}>Change Password</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Toast Component */}
      <Toast 
        config={{
          success: (props) => <CustomToast {...props} type="success" />,
          error: (props) => <CustomToast {...props} type="error" />,
          info: (props) => <CustomToast {...props} type="info" />,
          warning: (props) => <CustomToast {...props} type="warning" />,
        }}
      />
    </View>
  );
};

// Helper functions for password strength
const getPasswordStrength = (password) => {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 6) strength += 25;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;
  return strength;
};

const getPasswordStrengthColor = (password) => {
  const strength = getPasswordStrength(password);
  if (strength < 25) return '#ef4444';
  if (strength < 50) return '#f59e0b';
  if (strength < 75) return '#eab308';
  return '#10b981';
};

const getPasswordStrengthText = (password) => {
  const strength = getPasswordStrength(password);
  if (strength < 25) return 'Weak';
  if (strength < 50) return 'Fair';
  if (strength < 75) return 'Good';
  return 'Strong';
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 20,
  },
  safeArea: {
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  strengthContainer: {
    marginBottom: 24,
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  changeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 30,
  },
});

export default ChangeUserPassword;
