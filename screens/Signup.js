import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import CustomToast from '../components/CustomToast';
import API_BASE from '../constants/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const Signup = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [signupButtonText, setSignupButtonText] = useState('Sign up');
  const [showSpinner, setShowSpinner] = useState(false);
  
  // OTP related states
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [timer, setTimer] = useState(60);
  const otpInputRefs = useRef([]);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!name) {
      newErrors.name = 'Name is required';
      Toast.show({
        type: 'error',
        text1: 'Name Required',
        text2: 'Please enter your full name',
        position: 'top',
        visibilityTime: 3000,
      });
    }
    
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
    
    if (!password) {
      newErrors.password = 'Password is required';
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please create a secure password',
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const startResendTimer = () => {
    setTimer(60);
    setCanResend(false);
    
    Toast.show({
      type: 'info',
      text1: 'OTP Sent',
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
              text2: 'You can now request a new verification code',
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

  useEffect(() => {
    let interval;
    let textIndex = 0;
    let dotIndex = 0;
    let currentText = '';
    const firstMessage = 'Creating your Easy Shop account';
    const secondMessage = 'Sending your OTP to your email';

    if (loading) {
      // Step 1: show spinner for 1.5 seconds
      setShowSpinner(true);
      setSignupButtonText(''); // hide text while spinner shows

      const spinnerTimer = setTimeout(() => {
        setShowSpinner(false);
        let message = firstMessage;

        interval = setInterval(() => {
          // Typewriter logic
          if (textIndex < message.length) {
            currentText += message[textIndex];
            textIndex++;
          } else {
            // Blink dots after typing full message
            dotIndex = (dotIndex + 1) % 4;
            const dots = '.'.repeat(dotIndex);
            currentText = message + dots;
          }

          setSignupButtonText(currentText);

          // Switch to second message after finishing first message + 3 cycles of dots
          if (textIndex === message.length && dotIndex === 3 && message === firstMessage) {
            message = secondMessage;
            textIndex = 0;
            currentText = '';
            dotIndex = 0;
          }
        }, 150);
      }, 1500); // spinner duration

      return () => {
        clearTimeout(spinnerTimer);
        clearInterval(interval);
      };
    } else {
      setShowSpinner(false);
      setSignupButtonText('Sign up');
    }
  }, [loading]);

  const handleSignup = async () => {
    if (!validateForm()) return;

    // Show initial loading toast
    Toast.show({
      type: 'info',
      text1: 'Creating Account...',
      text2: 'Please wait while we set up your account',
      position: 'top',
      visibilityTime: 2000,
    });

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful, show OTP screen
        Toast.show({
          type: 'success',
          text1: 'Account Created!',
          text2: 'Please check your email for verification code',
          position: 'top',
          visibilityTime: 4000,
        });
        
        setShowOtp(true);
        startResendTimer();
      } else {
        // Handle different error types
        if (data.message && data.message.includes('already exists')) {
          Toast.show({
            type: 'warning',
            text1: 'Account Exists',
            text2: 'An account with this email already exists',
            position: 'top',
            visibilityTime: 4000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Registration Failed',
            text2: data.message || data.error || 'Something went wrong',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
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
          text2: 'Keep entering the verification code',
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
          text2: 'Tap verify to confirm your account',
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

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Incomplete Code',
        text2: 'Please enter the complete 6-digit verification code',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Verifying Code...',
      text2: 'Please wait while we verify your code',
      position: 'top',
      visibilityTime: 2000,
    });

    setOtpLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
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
        // ── Pre-link push token so new user gets notifications immediately ──
        try {
          const { linkPushTokenToUser } = require('../services/pushNotificationService');
          // response may include userId — use email as fallback identifier
          const newUserId = data.user?._id || data.user?.id || null;
          if (newUserId) await linkPushTokenToUser(newUserId);
        } catch (pushErr) {
          console.warn('[Signup] Push token link failed (non-fatal):', pushErr.message);
        }

        Toast.show({
          type: 'success',
          text1: 'Account Verified!',
          text2: 'Welcome to EasyShop! Redirecting to login...',
          position: 'top',
          visibilityTime: 3000,
        });
        
        // Navigate after showing success message
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      } else {
        if (data.isWrongOtp) {
          Toast.show({
            type: 'error',
            text1: 'Invalid Code',
            text2: 'The verification code you entered is incorrect',
            position: 'top',
            visibilityTime: 4000,
          });
        } else if (data.message && data.message.includes('Too many failed attempts')) {
          Toast.show({
            type: 'warning',
            text1: 'Too Many Attempts',
            text2: 'Please request a new verification code',
            position: 'top',
            visibilityTime: 4000,
          });
          // Reset to signup form if too many attempts
          setShowOtp(false);
          setOtp(['', '', '', '', '', '']);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Verification Failed',
            text2: data.message || data.error || 'Something went wrong',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet connection and try again',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!canResend) return;

    Toast.show({
      type: 'info',
      text1: 'Sending New Code...',
      text2: 'Please wait while we send a new verification code',
      position: 'top',
      visibilityTime: 2000,
    });

    try {
      console.log('Resending OTP for email:', email);
      
      const response = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log('Resend OTP response:', { status: response.status, data });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'New Code Sent!',
          text2: 'Please check your email for the new verification code',
          position: 'top',
          visibilityTime: 4000,
        });
        setOtp(['', '', '', '', '', '']); // Clear current OTP
        startResendTimer();
      } else {
        // Handle specific error cases
        if (data.message && data.message.includes('No verification request found')) {
          Toast.show({
            type: 'warning',
            text1: 'Session Expired',
            text2: 'Please start the registration process again',
            position: 'top',
            visibilityTime: 4000,
          });
          // Navigate back to signup form
          setTimeout(() => {
            setShowOtp(false);
            setOtp(['', '', '', '', '', '']);
          }, 2000);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Failed to Resend',
            text2: data.message || data.error || 'Could not send new code',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet connection and try again',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const handleGoogleSignup = () => {
    Toast.show({
      type: 'info',
      text1: 'Coming Soon!',
      text2: 'Google signup will be available in the next update',
      position: 'top',
      visibilityTime: 3000,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent"
        translucent={true}
      />
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
        <View style={[styles.headerSection, { paddingTop: insets.top + 20 }]}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#FF6B6B', '#4ECDC4']}
              style={styles.logoGradient}
            >
              <MaterialIcons name="shopping-bag" size={32} color="white" />
            </LinearGradient>
            <Text style={styles.brandName}>EasyShop</Text>
          </View>
          <Text style={styles.welcomeText}>Join EasyShop!</Text>
          <Text style={styles.subtitleText}>Create your account to start shopping</Text>
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContainer, {
            paddingBottom: insets.bottom + 20,
            flexGrow: 1,
          }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === 'android'}
        >
          {/* Main Form Card */}
          <View style={styles.formCard}>
            {!showOtp ? (
              <>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Create Account</Text>
                  <Text style={styles.formSubtitle}>
                    Already have an account?{' '}
                    <Text 
                      style={styles.linkText}
                      onPress={() => navigation.navigate('Login')}
                    >
                      Sign In
                    </Text>
                  </Text>
                </View>

                {/* Social Signup */}
                <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignup}>
                  <View style={styles.socialIconContainer}>
                    <Ionicons name="logo-google" size={20} color="#4285F4" />
                  </View>
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                    <MaterialIcons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your full name"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        // Clear error when user starts typing
                        if (errors.name) {
                          setErrors(prev => ({ ...prev, name: null }));
                        }
                      }}
                      autoCorrect={false}
                    />
                  </View>
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
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
                        // Clear error when user starts typing
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

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                    <MaterialIcons name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Create a secure password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        // Clear error when user starts typing
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

                {/* Signup Button */}
                <TouchableOpacity 
                  style={[styles.signupButton, loading && styles.buttonDisabled]}
                  onPress={handleSignup}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.buttonGradient}
                  >
                    <View style={styles.signupButtonContent}>
                      {showSpinner && (
                        <ActivityIndicator color="white" size="small" style={styles.spinner} />
                      )}
                      {loading && !showSpinner ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>{signupButtonText || 'Create Account'}</Text>
                          {!loading && <Ionicons name="arrow-forward" size={18} color="white" style={styles.buttonIcon} />}
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.formFooter}>
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

                  <Text style={styles.footerText}>
                    By creating an account, you agree to our{' '}
                    <Text style={styles.linkText}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.linkText}>Privacy Policy</Text>
                  </Text>

                  {/* Special Guest */}
                  <TouchableOpacity
                    style={styles.specialGuestButton}
                    onPress={() => navigation.navigate('SpecialGuest')}
                  >
                    <Ionicons name="shield-checkmark-outline" size={16} color="#115061" />
                    <Text style={styles.specialGuestText}>Continue with special guest credentials</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* OTP Verification Section */
              <View style={styles.otpSection}>
                <View style={styles.otpHeader}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.otpIconGradient}
                  >
                    <MaterialIcons name="mark-email-read" size={32} color="white" />
                  </LinearGradient>
                  <Text style={styles.otpTitle}>Verify Your Email</Text>
                  <Text style={styles.otpSubtitle}>
                    We've sent a 6-digit verification code to{'\n'}
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
                  style={[styles.verifyButton, otpLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.buttonGradient}
                  >
                    {otpLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Verify Account</Text>
                        <Ionicons name="checkmark-circle" size={18} color="white" style={styles.buttonIcon} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    Didn't receive the code?{' '}
                    {canResend ? (
                      <Text style={styles.resendLink} onPress={resendOtp}>
                        Resend Code
                      </Text>
                    ) : (
                      <Text style={styles.timerText}>Resend in {timer}s</Text>
                    )}
                  </Text>
                </View>
              </View>
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
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  linkText: {
    color: '#667eea',
    fontWeight: '600',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  socialIconContainer: {
    width: 24,
    alignItems: 'center',
  },
  socialButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
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
  signupButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    marginTop: 8,
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
  signupButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
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
  formFooter: {
    alignItems: 'center',
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
    marginBottom: 20,
    width: '100%',
  },
  guestButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  specialGuestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#115061',
    borderRadius: 12,
    width: '100%',
  },
  specialGuestText: {
    color: '#115061',
    fontSize: 14,
    fontWeight: '600',
  },
  // OTP Styles
  otpSection: {
    alignItems: 'center',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  otpIconGradient: {
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
  otpTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  otpSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
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
  verifyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 24,
  },
  resendContainer: {
    alignItems: 'center',
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

export default Signup;
