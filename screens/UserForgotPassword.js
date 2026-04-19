import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import CustomToast from '../components/CustomToast';
import API_BASE from '../constants/api';

const { width, height } = Dimensions.get('window');

const UserForgotPassword = ({ navigation }) => {
  const [step, setStep] = useState('email'); // 'email', 'otp', 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef([]);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
  };
  const startResendTimer = () => {
    setTimer(60);
    setCanResend(false);
    
    Toast.show({
      type: 'info',
      text1: 'Reset Code Sent',
      text2: 'You can request a new code in 60 seconds',
      position: 'top',
      visibilityTime: 3000,
    });
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            Toast.show({
              type: 'info',
              text1: 'Ready to Resend',
              text2: 'You can now request a new reset code',
              position: 'top',
              visibilityTime: 2000,
            });
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateEmailForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
        position: 'top',
        visibilityTime: 3000,
      });
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email address';
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
        position: 'top',
        visibilityTime: 3000,
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter a new password',
        position: 'top',
        visibilityTime: 3000,
      });
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      Toast.show({
        type: 'error',
        text1: 'Password Too Short',
        text2: 'Password must be at least 6 characters long',
        position: 'top',
        visibilityTime: 3000,
      });
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      Toast.show({
        type: 'error',
        text1: 'Confirmation Required',
        text2: 'Please confirm your new password',
        position: 'top',
        visibilityTime: 3000,
      });
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      Toast.show({
        type: 'error',
        text1: 'Passwords Mismatch',
        text2: 'The passwords you entered do not match',
        position: 'top',
        visibilityTime: 3000,
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSendResetCode = async () => {
    if (!validateEmailForm()) return;

    Toast.show({
      type: 'info',
      text1: 'Sending Reset Code...',
      text2: 'Please wait while we send the code to your email',
      position: 'top',
      visibilityTime: 2000,
    });

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Reset Code Sent!',
          text2: 'Please check your email for the 6-digit code',
          position: 'top',
          visibilityTime: 4000,
        });
        
        setStep('otp');
        startResendTimer();
      } else {
        if (data.message && data.message.includes('not found')) {
          Toast.show({
            type: 'error',
            text1: 'Account Not Found',
            text2: 'No account exists with this email address',
            position: 'top',
            visibilityTime: 4000,
          });
        } else if (data.message && data.message.includes('not verified')) {
          Toast.show({
            type: 'warning',
            text1: 'Account Not Verified',
            text2: 'Please verify your account first',
            position: 'top',
            visibilityTime: 4000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Failed to Send Code',
            text2: data.message || 'Something went wrong',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Send reset code error:', error);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet connection and try again',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Show progress toast when user starts entering OTP (use setTimeout to avoid setState during render)
    if (value && newOtp.filter(digit => digit).length === 1) {
      setTimeout(() => {
        Toast.show({
          type: 'info',
          text1: 'Great!',
          text2: 'Keep entering the reset code',
          position: 'top',
          visibilityTime: 2000,
        });
      }, 0);
    }

    // Show completion toast when all digits are entered (use setTimeout to avoid setState during render)
    if (value && newOtp.filter(digit => digit).length === 6) {
      setTimeout(() => {
        Toast.show({
          type: 'success',
          text1: 'Code Complete!',
          text2: 'Tap verify to confirm the reset code',
          position: 'top',
          visibilityTime: 2000,
        });
      }, 0);
    }

    if (value && index < otpInputRefs.current.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };
  const handleVerifyCode = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Incomplete Code',
        text2: 'Please enter the complete 6-digit reset code',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Verifying Code...',
      text2: 'Please wait while we verify your reset code',
      position: 'top',
      visibilityTime: 2000,
    });

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otpString,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Code Verified!',
          text2: 'Now create your new password',
          position: 'top',
          visibilityTime: 3000,
        });
        
        setStep('reset');
      } else {
        if (data.message && data.message.includes('Invalid')) {
          Toast.show({
            type: 'error',
            text1: 'Invalid Code',
            text2: 'The reset code you entered is incorrect',
            position: 'top',
            visibilityTime: 4000,
          });
        } else if (data.message && data.message.includes('expired')) {
          Toast.show({
            type: 'warning',
            text1: 'Code Expired',
            text2: 'Please request a new reset code',
            position: 'top',
            visibilityTime: 4000,
          });
          setStep('email');
        } else {
          Toast.show({
            type: 'error',
            text1: 'Verification Failed',
            text2: data.message || 'Something went wrong',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Verify code error:', error);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet connection and try again',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };
  const handleResetPassword = async () => {
    if (!validatePasswordForm()) return;

    Toast.show({
      type: 'info',
      text1: 'Updating Password...',
      text2: 'Please wait while we update your password',
      position: 'top',
      visibilityTime: 2000,
    });

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Password Updated!',
          text2: 'Your password has been successfully reset',
          position: 'top',
          visibilityTime: 3000,
        });
        
        // Reset form and navigate back to login
        setTimeout(() => {
          setStep('email');
          setEmail('');
          setOtp(['', '', '', '', '', '']);
          setPassword('');
          setConfirmPassword('');
          setErrors({});
          navigation.navigate('Login');
        }, 2000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Reset Failed',
          text2: data.message || 'Failed to reset password',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet connection and try again',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };
  const handleResendCode = async () => {
    if (!canResend) return;

    Toast.show({
      type: 'info',
      text1: 'Sending New Code...',
      text2: 'Please wait while we send a new reset code',
      position: 'top',
      visibilityTime: 2000,
    });

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'New Code Sent!',
          text2: 'Please check your email for the new reset code',
          position: 'top',
          visibilityTime: 4000,
        });
        setOtp(['', '', '', '', '', '']); // Clear current OTP
        startResendTimer();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to Resend',
          text2: data.message || 'Could not send new code',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('Resend code error:', error);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet connection and try again',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };
  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Background Gradient */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.backgroundGradient}
        />
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#FF6B6B', '#4ECDC4']}
              style={styles.logoGradient}
            >
              <MaterialIcons name="shopping-bag" size={32} color="white" />
            </LinearGradient>
            <Text style={styles.brandName}>EasyShop</Text>
          </View>
          <Text style={styles.welcomeText}>Reset Password</Text>
          <Text style={styles.subtitleText}>
            {step === 'email' && 'Enter your email to receive a reset code'}
            {step === 'otp' && 'Enter the 6-digit code sent to your email'}
            {step === 'reset' && 'Create your new secure password'}
          </Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Form Card */}
          <View style={styles.formCard}>
            {step === 'email' && (
              <>
                <View style={styles.formHeader}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.iconGradient}
                  >
                    <MaterialIcons name="email" size={32} color="white" />
                  </LinearGradient>
                  <Text style={styles.formTitle}>Forgot Password?</Text>
                  <Text style={styles.formSubtitle}>
                    No worries! Enter your email and we'll send you a reset code
                  </Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                    <MaterialIcons name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) {
                          setErrors(prev => ({ ...prev, email: null }));
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Send Code Button */}
                <TouchableOpacity 
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSendResetCode}
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
                        <Text style={styles.buttonText}>Send Reset Code</Text>
                        <Ionicons name="mail" size={18} color="white" style={styles.buttonIcon} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Ionicons name="arrow-back" size={16} color="#667eea" />
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>

                {/* Continue as Guest */}
                <TouchableOpacity 
                  style={styles.guestButton}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Welcome Guest!',
                      text2: 'You can browse products without an account',
                      position: 'top',
                      visibilityTime: 2000,
                    });
                    setTimeout(() => {
                      navigation.navigate('home');
                    }, 1000);
                  }}
                >
                  <Ionicons name="person-outline" size={16} color="#667eea" />
                  <Text style={styles.guestButtonText}>Continue as Guest</Text>
                </TouchableOpacity>
              </>
            )}
            {step === 'otp' && (
              <View style={styles.otpSection}>
                <View style={styles.otpHeader}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.iconGradient}
                  >
                    <MaterialIcons name="mark-email-read" size={32} color="white" />
                  </LinearGradient>
                  <Text style={styles.formTitle}>Enter Reset Code</Text>
                  <Text style={styles.formSubtitle}>
                    We've sent a 6-digit reset code to{'\n'}
                    <Text style={styles.emailText}>{email}</Text>
                  </Text>
                </View>
                
                <View style={styles.otpInputContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpInputRefs.current[index] = ref)}
                      style={[
                        styles.otpInput,
                        digit && styles.otpInputFilled
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(index, value)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                      keyboardType="numeric"
                      maxLength={1}
                      textAlign="center"
                    />
                  ))}
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleVerifyCode}
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
                        <Text style={styles.buttonText}>Verify Code</Text>
                        <Ionicons name="checkmark-circle" size={18} color="white" style={styles.buttonIcon} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    Didn't receive the code?{' '}
                    {canResend ? (
                      <Text style={styles.resendLink} onPress={handleResendCode}>
                        Resend Code
                      </Text>
                    ) : (
                      <Text style={styles.timerText}>Resend in {timer}s</Text>
                    )}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => {
                    setStep('email');
                    setOtp(['', '', '', '', '', '']);
                    setErrors({});
                  }}
                >
                  <Ionicons name="arrow-back" size={16} color="#667eea" />
                  <Text style={styles.backButtonText}>Use different email</Text>
                </TouchableOpacity>
              </View>
            )}
            {step === 'reset' && (
              <>
                <View style={styles.formHeader}>
                  <LinearGradient
                    colors={['#27ae60', '#2ecc71']}
                    style={styles.iconGradient}
                  >
                    <MaterialIcons name="lock-reset" size={32} color="white" />
                  </LinearGradient>
                  <Text style={styles.formTitle}>Create New Password</Text>
                  <Text style={styles.formSubtitle}>
                    Your new password must be different from your previous password
                  </Text>
                </View>

                {/* New Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                    <MaterialIcons name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter new password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) {
                          setErrors(prev => ({ ...prev, password: null }));
                        }
                      }}
                      secureTextEntry={!passwordVisible}
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                    >
                      <Ionicons 
                        name={passwordVisible ? 'eye' : 'eye-off'} 
                        size={20} 
                        color="#9CA3AF" 
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                    <MaterialIcons name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
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

                {/* Reset Password Button */}
                <TouchableOpacity 
                  style={[styles.resetButton, loading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#27ae60', '#2ecc71']}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Update Password</Text>
                        <Ionicons name="checkmark-circle" size={18} color="white" style={styles.buttonIcon} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
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
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardContainer: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 40,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
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
    borderRadius: 16,
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
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  resetButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  guestButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // OTP Styles
  otpSection: {
    alignItems: 'center',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emailText: {
    color: '#667eea',
    fontWeight: '600',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  otpInputFilled: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  resendLink: {
    color: '#667eea',
    fontWeight: '600',
  },
  timerText: {
    color: '#9ca3af',
  },
});

export default UserForgotPassword;
