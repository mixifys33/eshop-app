import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const { width } = Dimensions.get('window');

const ForgotPassword = ({ navigation }) => {
  const inputRefs = useRef([]);
  const [timer, setTimer] = useState(180); // 3 minutes = 180 seconds
  const [canResend, setCanResend] = useState(false);
  const [sellerEmail, setSellerEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('email'); // 'email', 'otp', 'reset'
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Toast hook
  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  // Timer effect for resend countdown
  useEffect(() => {
    let interval;
    if (!canResend && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [canResend, timer]);

  // Lockout timer effect
  useEffect(() => {
    let interval;
    if (isLocked && lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setOtpAttempts(0);
            showInfo('Account unlocked. You can try again.', 3000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockoutTimer]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startResendTimer = () => {
    setCanResend(false);
    setTimer(180); // 3 minutes
  };

  const lockAccount = () => {
    setIsLocked(true);
    setLockoutTimer(1800); // 30 minutes = 1800 seconds
    showError('Too many failed attempts! Account locked for 30 minutes.', 5000);
  };

  const validateEmail = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      showError('Please enter your email address', 3000);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
      showError('Please enter a valid email address', 3000);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
      showError('Please enter a new password', 3000);
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      showError('Password must be at least 6 characters long', 3000);
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      showError('Please confirm your new password', 3000);
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      showError('Passwords do not match', 3000);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    showInfo('Sending reset code to your email...', 2000);
    
    try {
      const response = await fetch(`${API_BASE}/sellers/forgot-password-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSellerEmail(formData.email);
        setStep('otp');
        startResendTimer();
        showSuccess('Reset code sent to your email! Check your inbox.', 4000);
      } else {
        if (response.status === 404) {
          showError('No account found with this email address', 4000);
        } else if (response.status === 400 && data.error?.includes('not verified')) {
          showError('Please verify your account first before resetting password', 4000);
        } else {
          showError(data.message || 'Failed to send reset code. Please try again.', 4000);
        }
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      showError('Network error. Please check your connection and try again.', 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isLocked) {
      showWarning(`Account locked. Try again in ${formatTime(lockoutTimer)}`, 3000);
      return;
    }

    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, key) => {
    if (isLocked) return;
    
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    if (isLocked) {
      showWarning(`Account locked. Try again in ${formatTime(lockoutTimer)}`, 3000);
      return;
    }

    if (otp.join('').length !== 4) {
      showError('Please enter the complete 4-digit code', 3000);
      return;
    }

    setLoading(true);
    showInfo('Verifying reset code...', 2000);
    
    try {
      const response = await fetch(`${API_BASE}/sellers/verify-forgot-password-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sellerEmail,
          otp: otp.join('')
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('reset');
        setOtpAttempts(0); // Reset attempts on success
        showSuccess('Code verified successfully! Now create your new password.', 4000);
      } else {
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        
        if (newAttempts >= 8) {
          lockAccount();
          setOtp(['', '', '', '']); // Clear OTP inputs
        } else {
          const remainingAttempts = 8 - newAttempts;
          showError(`Invalid code. ${remainingAttempts} attempts remaining before lockout.`, 4000);
          
          // Clear OTP inputs for retry
          setOtp(['', '', '', '']);
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      showError('Network error. Please check your connection and try again.', 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) {
      showWarning(`Please wait ${formatTime(timer)} before requesting a new code`, 3000);
      return;
    }

    if (isLocked) {
      showWarning(`Account locked. Try again in ${formatTime(lockoutTimer)}`, 3000);
      return;
    }

    setLoading(true);
    showInfo('Sending new reset code...', 2000);
    
    try {
      const response = await fetch(`${API_BASE}/sellers/forgot-password-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: sellerEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtp(['', '', '', '']);
        setOtpAttempts(0); // Reset attempts on new OTP
        startResendTimer();
        showSuccess('New reset code sent to your email!', 4000);
        
        // Focus first input
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      } else {
        showError(data.message || 'Failed to send new code. Please try again.', 4000);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      showError('Network error. Please check your connection and try again.', 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    showInfo('Updating your password...', 2000);
    
    try {
      const response = await fetch(`${API_BASE}/sellers/reset-password-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sellerEmail,
          newPassword: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('Password reset successfully! Redirecting to login...', 4000);
        
        // Reset all states
        setStep('email');
        setOtp(['', '', '', '']);
        setOtpAttempts(0);
        setIsLocked(false);
        setLockoutTimer(0);
        setFormData({ email: '', password: '', confirmPassword: '' });
        setErrors({});
        
        // Navigate to login after a short delay
        setTimeout(() => {
          navigation.navigate('SellerLogin');
        }, 2000);
      } else {
        if (response.status === 400 && data.error?.includes('not authorized')) {
          showError('Session expired. Please start the password reset process again.', 4000);
          setStep('email');
        } else {
          showError(data.message || 'Failed to reset password. Please try again.', 4000);
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      showError('Network error. Please check your connection and try again.', 4000);
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="mail-outline" size={48} color="#3498db" />
      </View>
      
      <Text style={styles.title}>Recover Your Account</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you an OTP to reset your password.
      </Text>

      <Text style={styles.label}>Email Address</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="seller@example.com"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleSendOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons name="key-outline" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Send OTP to Email</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('SellerLogin')}
      >
        <Ionicons name="arrow-back" size={16} color="#3498db" />
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={isLocked ? "lock-closed" : "shield-checkmark-outline"} 
          size={48} 
          color={isLocked ? "#e74c3c" : "#3498db"} 
        />
      </View>
      
      <Text style={styles.title}>
        {isLocked ? 'Account Temporarily Locked' : 'Verify Reset Code'}
      </Text>
      <Text style={styles.subtitle}>
        {isLocked ? (
          <>
            Too many failed attempts. Account locked for{'\n'}
            <Text style={styles.lockoutHighlight}>{formatTime(lockoutTimer)}</Text>
          </>
        ) : (
          <>
            We've sent a 4-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{sellerEmail}</Text>
            {otpAttempts > 0 && (
              <>
                {'\n\n'}
                <Text style={styles.attemptsWarning}>
                  {8 - otpAttempts} attempts remaining
                </Text>
              </>
            )}
          </>
        )}
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            style={[
              styles.otpInput,
              isLocked && styles.otpInputLocked,
              otpAttempts > 5 && styles.otpInputWarning
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleOtpKeyDown(index, nativeEvent.key)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            editable={!isLocked}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton, 
          (loading || otp.join('').length !== 4 || isLocked) && styles.disabledButton
        ]}
        onPress={handleVerifyOTP}
        disabled={loading || otp.join('').length !== 4 || isLocked}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons name="shield-checkmark-outline" size={20} color="white" />
            <Text style={styles.primaryButtonText}>
              {isLocked ? 'Account Locked' : 'Verify Code'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        {isLocked ? (
          <Text style={styles.lockoutText}>
            Account locked for <Text style={styles.lockoutHighlight}>{formatTime(lockoutTimer)}</Text>
          </Text>
        ) : canResend ? (
          <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
            <Text style={styles.resendText}>
              {loading ? 'Sending...' : 'Send New Code'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.timerText}>
            Resend code in <Text style={styles.timerHighlight}>{formatTime(timer)}</Text>
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setStep('email');
          setOtp(['', '', '', '']);
          setOtpAttempts(0);
          setIsLocked(false);
          setLockoutTimer(0);
          setErrors({});
        }}
      >
        <Ionicons name="arrow-back" size={16} color="#666" />
        <Text style={styles.backButtonText}>Use different email</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResetStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed-outline" size={48} color="#27ae60" />
      </View>
      
      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>
        Your new password must be different from your previous password.
      </Text>

      <Text style={styles.label}>New Password</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="Enter new password"
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

      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, errors.confirmPassword && styles.inputError]}
          placeholder="Confirm new password"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          secureTextEntry={!confirmPasswordVisible}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
        >
          <Ionicons
            name={confirmPasswordVisible ? 'eye' : 'eye-off'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

      <TouchableOpacity
        style={[styles.resetButton, loading && styles.disabledButton]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons name="lock-closed-outline" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Reset Password</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.mainTitle}>Forgot Password</Text>
          
          <View style={styles.card}>
            {step === 'email' && renderEmailStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'reset' && renderResetStep()}
          </View>
        </View>
      </ScrollView>

      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: width > 768 ? 40 : 20,
    alignItems: 'center',
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  mainTitle: {
    fontSize: width > 1200 ? 48 : width > 768 ? 40 : 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: width > 768 ? 30 : 20,
    color: '#3498db',
  },
  card: {
    width: width > 1200 ? 500 : width > 768 ? 450 : width > 480 ? 400 : '100%',
    maxWidth: '100%',
    backgroundColor: 'white',
    borderRadius: width > 768 ? 20 : 16,
    padding: width > 1200 ? 40 : width > 768 ? 35 : 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width > 768 ? 8 : 4 },
    shadowOpacity: 0.15,
    shadowRadius: width > 768 ? 20 : 12,
    elevation: width > 768 ? 12 : 8,
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: width > 768 ? 80 : 70,
    height: width > 768 ? 80 : 70,
    borderRadius: width > 768 ? 40 : 35,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: width > 768 ? 25 : 20,
  },
  title: {
    fontSize: width > 1200 ? 28 : width > 768 ? 24 : 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: width > 768 ? 12 : 8,
    color: '#333',
  },
  subtitle: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: width > 768 ? 30 : 25,
    lineHeight: width > 768 ? 24 : 20,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  label: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: width > 768 ? 8 : 6,
    alignSelf: 'flex-start',
    width: '100%',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: width > 768 ? 20 : 15,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderRadius: width > 768 ? 12 : 10,
    paddingHorizontal: width > 768 ? 50 : 45,
    paddingVertical: width > 1200 ? 16 : width > 768 ? 14 : 12,
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    backgroundColor: '#fff',
    minHeight: width > 768 ? 54 : 48,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  inputIcon: {
    position: 'absolute',
    left: width > 768 ? 18 : 15,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: width > 768 ? 18 : 15,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 5,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    marginTop: -10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: width > 768 ? 15 : 12,
    marginBottom: width > 768 ? 30 : 25,
    width: '100%',
  },
  otpInput: {
    width: width > 768 ? 60 : 50,
    height: width > 768 ? 60 : 50,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderRadius: width > 768 ? 12 : 10,
    fontSize: width > 768 ? 24 : 20,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#3498db',
    borderRadius: width > 768 ? 12 : 10,
    paddingVertical: width > 1200 ? 18 : width > 768 ? 16 : 14,
    paddingHorizontal: width > 768 ? 30 : 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginBottom: width > 768 ? 20 : 15,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButton: {
    backgroundColor: '#27ae60',
    borderRadius: width > 768 ? 12 : 10,
    paddingVertical: width > 1200 ? 18 : width > 768 ? 16 : 14,
    paddingHorizontal: width > 768 ? 30 : 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginBottom: width > 768 ? 20 : 15,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: width > 1200 ? 18 : width > 768 ? 16 : 15,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: width > 768 ? 12 : 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: '500',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: width > 768 ? 20 : 15,
  },
  resendText: {
    color: '#3498db',
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: '600',
  },
  timerText: {
    color: '#666',
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
  },
  timerHighlight: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  otpInputLocked: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e74c3c',
    opacity: 0.6,
  },
  otpInputWarning: {
    borderColor: '#f39c12',
    borderWidth: 2,
  },
  attemptsWarning: {
    color: '#f39c12',
    fontWeight: 'bold',
    fontSize: width > 768 ? 14 : 12,
  },
  lockoutText: {
    color: '#e74c3c',
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    textAlign: 'center',
  },
  lockoutHighlight: {
    fontWeight: 'bold',
    color: '#e74c3c',
  },
});

export default ForgotPassword;
