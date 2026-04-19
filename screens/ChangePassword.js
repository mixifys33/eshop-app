import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const ChangePassword = ({ navigation }) => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  useEffect(() => {
    loadSellerInfo();
  }, []);

  const loadSellerInfo = async () => {
    try {
      const savedSellerData = await AsyncStorage.getItem('currentSeller');
      if (savedSellerData) {
        const seller = JSON.parse(savedSellerData);
        setSellerInfo(seller);
      } else {
        showError('Please log in to change password');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading seller info:', error);
      showError('Failed to load seller information');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('One number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('One special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  const getPasswordStrength = (password) => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    
    if (score <= 2) return { strength: 'Weak', color: '#e74c3c' };
    if (score <= 3) return { strength: 'Fair', color: '#f39c12' };
    if (score <= 4) return { strength: 'Good', color: '#f1c40f' };
    return { strength: 'Strong', color: '#27ae60' };
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.currentPassword) {
      showError('Current password is required');
      return;
    }

    if (!passwordData.newPassword) {
      showError('New password is required');
      return;
    }

    if (!passwordData.confirmPassword) {
      showError('Please confirm your new password');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      showError('New password must be different from current password');
      return;
    }

    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      showError(`Password must have: ${passwordValidation.errors.join(', ')}`);
      return;
    }

    setSaving(true);

    try {
      console.log('🔐 Attempting to change password for seller:', sellerInfo.id);
      
      // Call the change password API
      const response = await fetch(`${API_BASE}/sellers/change-password/${sellerInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();
      
      console.log('🔐 Password change response:', { status: response.status, data });

      if (response.ok && data.success) {
        // Clear form on success
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        
        showSuccess('Password changed successfully! Please use your new password for future logins.');
        
        // Optional: Show logout suggestion
        setTimeout(() => {
          Alert.alert(
            'Password Changed',
            'Your password has been changed successfully. For security, you may want to log out and log back in with your new password.',
            [
              {
                text: 'Stay Logged In',
                style: 'cancel',
              },
              {
                text: 'Logout Now',
                onPress: async () => {
                  try {
                    await AsyncStorage.removeItem('currentSeller');
                    if (navigation && typeof navigation.navigate === 'function') {
                      navigation.navigate('SellerLogin');
                    }
                  } catch (error) {
                    console.error('Logout error:', error);
                  }
                },
              },
            ]
          );
        }, 2000);
        
      } else {
        // Handle API errors
        showError(data.error || data.message || 'Failed to change password');
      }
      
    } catch (error) {
      console.error('❌ Error changing password:', error);
      showError('Failed to change password. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Form',
      'Are you sure you want to clear all fields?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
            showWarning('Form cleared');
          },
        },
      ]
    );
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation && typeof navigation.goBack === 'function') {
              navigation.goBack();
            } else if (navigation && typeof navigation.navigate === 'function') {
              navigation.navigate('SellerSettings');
            } else {
              console.error('Navigation not available');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
        >
          <Ionicons name="refresh" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="shield-checkmark" size={20} color="#3498db" />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Security Notice</Text>
            <Text style={styles.noticeText}>
              Choose a strong password to keep your account secure. We recommend using a mix of letters, numbers, and symbols.
            </Text>
          </View>
        </View>

        {/* Password Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Your Password</Text>
          
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                placeholder="Enter your current password"
                secureTextEntry={!showPasswords.current}
                maxLength={128}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => togglePasswordVisibility('current')}
              >
                <Ionicons
                  name={showPasswords.current ? 'eye-off' : 'eye'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                placeholder="Enter your new password"
                secureTextEntry={!showPasswords.new}
                maxLength={128}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => togglePasswordVisibility('new')}
              >
                <Ionicons
                  name={showPasswords.new ? 'eye-off' : 'eye'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Strength Indicator */}
            {passwordData.newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View 
                    style={[
                      styles.strengthFill, 
                      { 
                        width: `${(getPasswordStrength(passwordData.newPassword).strength === 'Weak' ? 25 : 
                                  getPasswordStrength(passwordData.newPassword).strength === 'Fair' ? 50 :
                                  getPasswordStrength(passwordData.newPassword).strength === 'Good' ? 75 : 100)}%`,
                        backgroundColor: passwordStrength.color 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.strength}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                placeholder="Confirm your new password"
                secureTextEntry={!showPasswords.confirm}
                maxLength={128}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => togglePasswordVisibility('confirm')}
              >
                <Ionicons
                  name={showPasswords.confirm ? 'eye-off' : 'eye'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Match Indicator */}
            {passwordData.confirmPassword.length > 0 && (
              <View style={styles.matchContainer}>
                <Ionicons
                  name={passwordData.newPassword === passwordData.confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={passwordData.newPassword === passwordData.confirmPassword ? '#27ae60' : '#e74c3c'}
                />
                <Text style={[
                  styles.matchText,
                  { color: passwordData.newPassword === passwordData.confirmPassword ? '#27ae60' : '#e74c3c' }
                ]}>
                  {passwordData.newPassword === passwordData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsSection}>
          <Text style={styles.requirementsTitle}>Password Requirements</Text>
          
          {[
            { text: 'At least 8 characters long', check: passwordData.newPassword.length >= 8 },
            { text: 'One lowercase letter (a-z)', check: /[a-z]/.test(passwordData.newPassword) },
            { text: 'One uppercase letter (A-Z)', check: /[A-Z]/.test(passwordData.newPassword) },
            { text: 'One number (0-9)', check: /\d/.test(passwordData.newPassword) },
            { text: 'One special character (!@#$%^&*)', check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword) },
          ].map((requirement, index) => (
            <View key={index} style={styles.requirementItem}>
              <Ionicons
                name={requirement.check ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={requirement.check ? '#27ae60' : '#bdc3c7'}
              />
              <Text style={[
                styles.requirementText,
                { color: requirement.check ? '#27ae60' : '#666' }
              ]}>
                {requirement.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size={16} color="white" />
          ) : (
            <Ionicons name="lock-closed" size={18} color="white" />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Changing Password...' : 'Change Password'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  securityNotice: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  noticeContent: {
    flex: 1,
    marginLeft: 10,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#1565c0',
    lineHeight: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e1e8ed',
    borderRadius: 2,
    marginRight: 10,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  matchText: {
    fontSize: 12,
    marginLeft: 5,
  },
  requirementsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePassword;
