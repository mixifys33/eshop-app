import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const { width } = Dimensions.get('window');

const SellerLogin = ({ navigation }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  
  // Initialize toast hook
  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    
    // Show toast for validation errors
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showWarning(firstError);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return; // validateForm now shows its own toast message
    }

    showInfo('Attempting to log in...', 2000);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/sellers/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save seller data to AsyncStorage for dashboard use
        try {
          await AsyncStorage.setItem('currentSeller', JSON.stringify(data.seller));
          showSuccess('Login successful! Redirecting to dashboard...', 2000);
        } catch (storageError) {
          showWarning('Login successful but failed to save session data');
        }
        
        setLoading(false);
        
        // Navigate to dashboard
        try {
          navigation.navigate('SellerDashboard');
          
          // Show welcome message after navigation
          setTimeout(() => {
            showSuccess(`Welcome back! ${data.message || 'Access granted to seller dashboard'}`, 4000);
          }, 500);
        } catch (navError) {
          showError('Navigation error. Please try refreshing the app.');
          return;
        }
      } else {
        setLoading(false);
        
        // Handle different error types with appropriate messages
        if (response.status === 401) {
          showError('Invalid email or password. Please check your credentials.');
        } else if (response.status === 404) {
          showError('Seller account not found. Please check your email or sign up.');
        } else if (response.status === 429) {
          showError('Too many login attempts. Please try again later.');
        } else {
          showError(data.error || data.message || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      setLoading(false);
      
      // Handle network errors with helpful messages
      if (error.message.includes('fetch')) {
        showError('Network error. Please check your internet connection and ensure the server is running.');
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="storefront" size={64} color="#3498db" />
          <Text style={styles.title}>Seller Login</Text>
          <Text style={styles.subtitle}>Access your seller dashboard</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.formContainer}>
            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setPasswordVisible(!passwordVisible)}
              >
                <Ionicons
                  name={passwordVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => {
                showInfo('Redirecting to password recovery...');
                navigation.navigate('SellerForgotPassword');
              }}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <Text style={styles.signupLink}>
              Don't have a seller account?{' '}
              <Text 
                style={styles.linkText} 
                onPress={() => {
                  showInfo('Redirecting to seller registration...');
                  navigation.navigate('SellerSignup');
                }}
              >
                Sign Up
              </Text>
            </Text>
          </View>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingTop: width > 1200 ? 80 : width > 768 ? 70 : 60,
    paddingHorizontal: width > 1200 ? 60 : width > 768 ? 40 : 20,
    alignItems: 'center',
    minHeight: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: width > 768 ? 50 : 40,
  },
  title: {
    fontSize: width > 1200 ? 36 : width > 768 ? 32 : 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: width > 768 ? 20 : 15,
    marginBottom: width > 768 ? 8 : 5,
  },
  subtitle: {
    fontSize: width > 1200 ? 20 : width > 768 ? 18 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: width > 768 ? 26 : 22,
  },
  card: {
    width: width > 1200 ? 500 : width > 768 ? 450 : width > 480 ? 380 : '100%',
    maxWidth: '100%',
    backgroundColor: 'white',
    borderRadius: width > 768 ? 16 : 12,
    padding: width > 1200 ? 40 : width > 768 ? 35 : 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width > 768 ? 4 : 2 },
    shadowOpacity: 0.1,
    shadowRadius: width > 768 ? 12 : 8,
    elevation: width > 768 ? 8 : 5,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: width > 768 ? 10 : 8,
    marginTop: width > 768 ? 20 : 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: width > 768 ? 10 : 8,
    paddingHorizontal: width > 768 ? 18 : 15,
    paddingVertical: width > 1200 ? 16 : width > 768 ? 14 : 12,
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    backgroundColor: '#fff',
    minHeight: width > 768 ? 50 : 44,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: width > 768 ? 10 : 8,
    paddingHorizontal: width > 768 ? 18 : 15,
    paddingVertical: width > 1200 ? 16 : width > 768 ? 14 : 12,
    paddingRight: width > 768 ? 55 : 50,
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    backgroundColor: '#fff',
    minHeight: width > 768 ? 50 : 44,
  },
  eyeButton: {
    position: 'absolute',
    right: width > 768 ? 18 : 15,
    top: width > 1200 ? 16 : width > 768 ? 14 : 12,
    padding: width > 768 ? 8 : 5,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    marginTop: width > 768 ? 8 : 5,
    lineHeight: width > 768 ? 18 : 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: width > 768 ? 15 : 10,
    paddingVertical: width > 768 ? 8 : 5,
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: width > 768 ? 10 : 8,
    paddingVertical: width > 1200 ? 18 : width > 768 ? 16 : 15,
    alignItems: 'center',
    marginTop: width > 768 ? 30 : 25,
    minHeight: width > 768 ? 54 : 48,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: width > 1200 ? 20 : width > 768 ? 18 : 16,
    fontWeight: 'bold',
  },
  signupLink: {
    textAlign: 'center',
    marginTop: width > 768 ? 25 : 20,
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    lineHeight: width > 768 ? 22 : 20,
  },
  linkText: {
    color: '#3498db',
    fontWeight: '500',
  },
});

export default SellerLogin;
