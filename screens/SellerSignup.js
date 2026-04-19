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
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ImageUploader from '../components/ImageUploader';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const { width } = Dimensions.get('window');

// Business Type Selector Component
const BusinessTypeSelector = ({ selectedValue, onValueChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);

  const businessTypes = [
    { value: '', label: 'Select Business Type', disabled: true },
    { value: 'electronics', label: '📱 Electronics & Technology' },
    { value: 'fashion', label: '👕 Fashion & Clothing' },
    { value: 'home-garden', label: '🏠 Home & Garden' },
    { value: 'sports', label: '⚽ Sports & Fitness' },
    { value: 'books', label: '📚 Books & Education' },
    { value: 'automotive', label: '🚗 Automotive & Parts' },
    { value: 'health-beauty', label: '💄 Health & Beauty' },
    { value: 'toys-games', label: '🎮 Toys & Games' },
    { value: 'food-beverages', label: '🍕 Food & Beverages' },
    { value: 'jewelry', label: '💎 Jewelry & Accessories' },
    { value: 'art-crafts', label: '🎨 Art & Crafts' },
    { value: 'services', label: '🔧 Services' },
    { value: 'other', label: '📦 Other' }
  ];

  const selectedType = businessTypes.find(type => type.value === selectedValue);
  const displayLabel = selectedType ? selectedType.label : 'Select Business Type';

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          error && styles.inputError,
          isOpen && styles.dropdownButtonOpen
        ]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[
          styles.dropdownButtonText,
          !selectedValue && styles.dropdownPlaceholder
        ]}>
          {displayLabel}
        </Text>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Select Business Type</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              {businessTypes.map((type, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dropdownItem,
                    type.disabled && styles.dropdownItemDisabled,
                    selectedValue === type.value && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    if (!type.disabled) {
                      onValueChange(type.value);
                      setIsOpen(false);
                    }
                  }}
                  disabled={type.disabled}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    type.disabled && styles.dropdownItemTextDisabled,
                    selectedValue === type.value && styles.dropdownItemTextSelected
                  ]}>
                    {type.label}
                  </Text>
                  {selectedValue === type.value && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const SellerSignup = ({ navigation }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [showOtp, setShowOtp] = useState(false);
  const [sellerData, setSellerData] = useState(null);
  const [sellerId, setSellerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [signupButtonText, setSignupButtonText] = useState('Sign up');
  const [showSpinner, setShowSpinner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize toast hook
  const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  const inputRefs = useRef([]);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [validationStatus, setValidationStatus] = useState({
    email: null, // null, 'checking', 'available', 'conflict'
    phoneNumber: null
  });

  // Real-time credential validation
  const validateCredentials = async (field, value) => {
    if (!value || value.length < 3) {
      setValidationStatus(prev => ({ ...prev, [field]: null }));
      return;
    }

    setValidationStatus(prev => ({ ...prev, [field]: 'checking' }));

    try {
      const payload = {};
      payload[field] = value;

      const response = await fetch(`${API_BASE}/sellers/validate-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Response is 200 - credentials are available
        setValidationStatus(prev => ({ ...prev, [field]: 'available' }));
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
        
        // Show success toast for available credentials
        if (field === 'email') {
          showSuccess('Email is available!', 2000);
        } else if (field === 'phoneNumber') {
          showSuccess('Phone number is available!', 2000);
        }
      } else if (response.status === 409) {
        // Response is 409 - conflicts detected
        const fieldConflicts = data.conflicts?.filter(c => c.field === field) || [];
        if (fieldConflicts.length > 0) {
          setValidationStatus(prev => ({ ...prev, [field]: 'conflict' }));
          setErrors(prev => ({
            ...prev,
            [field]: fieldConflicts.map(c => c.message).join('. ')
          }));
          
          // Show error toast for conflicts
          if (field === 'email') {
            showError('Email already in use', 3000);
          } else if (field === 'phoneNumber') {
            showError('Phone number already in use', 3000);
          }
        } else {
          setValidationStatus(prev => ({ ...prev, [field]: null }));
        }
      } else {
        // Other error responses
        setValidationStatus(prev => ({ ...prev, [field]: null }));
        if (data.error) {
          setErrors(prev => ({
            ...prev,
            [field]: data.error
          }));
        }
      }
    } catch (error) {
      console.log('Validation error:', error);
      setValidationStatus(prev => ({ ...prev, [field]: null }));
    }
  };

  // Debounced validation
  const debounceValidation = (field, value) => {
    clearTimeout(window[`${field}ValidationTimeout`]);
    window[`${field}ValidationTimeout`] = setTimeout(() => {
      validateCredentials(field, value);
    }, 1000); // Wait 1 second after user stops typing
  };

  // Form data for shop setup
  const [shopData, setShopData] = useState({
    shopName: '',
    shopDescription: '',
    businessType: '',
    businessAddress: '',
    city: '',
    website: '',
    shopLogo: null,
    shopBanner: null,
    businessLicense: '',
    taxId: '',
    businessHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: true }
    }
  });

  const [shopErrors, setShopErrors] = useState({});

  // Progress persistence - Load saved data on component mount
  useEffect(() => {
    loadSavedProgress();
    showInfo('Welcome to seller registration! Fill out the form to get started.', 3000);
  }, []);

  // Save progress whenever important state changes
  useEffect(() => {
    saveProgress();
  }, [activeStep, formData, shopData, showOtp, sellerData]);

  const saveProgress = async () => {
    try {
      // Create a lightweight version of shopData without large image objects
      const lightShopData = {
        ...shopData,
        shopLogo: shopData.shopLogo ? {
          fileName: shopData.shopLogo.fileName,
          uploaded: shopData.shopLogo.uploaded,
          imagekitUrl: shopData.shopLogo.imagekitUrl
        } : null,
        shopBanner: shopData.shopBanner ? {
          fileName: shopData.shopBanner.fileName,
          uploaded: shopData.shopBanner.uploaded,
          imagekitUrl: shopData.shopBanner.imagekitUrl
        } : null
      };

      const progressData = {
        activeStep,
        formData: {
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber
          // Don't save password for security
        },
        shopData: lightShopData,
        showOtp,
        sellerData: sellerData ? {
          name: sellerData.name,
          email: sellerData.email,
          phoneNumber: sellerData.phoneNumber
          // Don't save password for security
        } : null,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('sellerSignupProgress', JSON.stringify(progressData));
    } catch (error) {
      console.log('Error saving progress:', error);
      // If quota exceeded, clear old data and try again with minimal data
      if (error.name === 'QuotaExceededError') {
        try {
          await AsyncStorage.removeItem('sellerSignupProgress');
          console.log('Cleared AsyncStorage due to quota exceeded');
        } catch (clearError) {
          console.log('Error clearing AsyncStorage:', clearError);
        }
      }
    }
  };

  const loadSavedProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem('sellerSignupProgress');
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        
        // Check if the saved data is not too old (24 hours)
        const isDataFresh = Date.now() - progressData.timestamp < 24 * 60 * 60 * 1000;
        
        if (isDataFresh && progressData.activeStep && (progressData.showOtp || progressData.activeStep > 1)) {
          // Only show continue option if there's meaningful progress (OTP step or shop setup)
          Alert.alert(
            'Continue Previous Registration? 🔄',
            'We found a previous registration in progress. Would you like to continue where you left off?',
            [
              {
                text: 'Start Fresh',
                style: 'destructive',
                onPress: async () => {
                  await AsyncStorage.removeItem('sellerSignupProgress');
                  console.log('Starting fresh registration');
                }
              },
              {
                text: 'Continue',
                style: 'default',
                onPress: () => {
                  setActiveStep(progressData.activeStep || 1);
                  setFormData(progressData.formData || {
                    name: '',
                    email: '',
                    phoneNumber: '',
                    password: ''
                  });
                  setShopData(progressData.shopData || {
                    shopName: '',
                    shopDescription: '',
                    businessType: '',
                    businessAddress: '',
                    city: '',
                    website: '',
                    shopLogo: null,
                    shopBanner: null,
                    businessLicense: '',
                    taxId: '',
                    businessHours: {
                      monday: { open: '09:00', close: '18:00', closed: false },
                      tuesday: { open: '09:00', close: '18:00', closed: false },
                      wednesday: { open: '09:00', close: '18:00', closed: false },
                      thursday: { open: '09:00', close: '18:00', closed: false },
                      friday: { open: '09:00', close: '18:00', closed: false },
                      saturday: { open: '09:00', close: '18:00', closed: false },
                      sunday: { open: '09:00', close: '18:00', closed: true }
                    }
                  });
                  setShowOtp(progressData.showOtp || false);
                  setSellerData(progressData.sellerData || null);
                  
                  console.log('Progress restored from previous session');
                }
              }
            ]
          );
        } else {
          // Clear old or minimal data
          await AsyncStorage.removeItem('sellerSignupProgress');
        }
      }
    } catch (error) {
      console.log('Error loading saved progress:', error);
    }
  };

  const clearProgress = async () => {
    try {
      await AsyncStorage.removeItem('sellerSignupProgress');
      console.log('Progress cleared');
    } catch (error) {
      console.log('Error clearing progress:', error);
    }
  };

  const validateShopForm = () => {
    const newErrors = {};

    if (!shopData.shopName.trim()) {
      newErrors.shopName = 'Shop name is required';
    } else if (shopData.shopName.length < 3) {
      newErrors.shopName = 'Shop name must be at least 3 characters';
    }

    if (!shopData.shopDescription.trim()) {
      newErrors.shopDescription = 'Shop description is required';
    } else if (shopData.shopDescription.length < 20) {
      newErrors.shopDescription = 'Description must be at least 20 characters';
    }

    if (!shopData.businessType) {
      newErrors.businessType = 'Business type is required';
    }

    if (!shopData.businessAddress.trim()) {
      newErrors.businessAddress = 'Business address is required';
    }

    if (!shopData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (shopData.website && !/^https?:\/\/.+\..+/.test(shopData.website)) {
      newErrors.website = 'Please enter a valid website URL (include http:// or https://)';
    }

    setShopErrors(newErrors);
    
    // Show toast for validation errors
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showWarning(firstError);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleShopSubmit = async () => {
    if (!validateShopForm()) return;

    // Prevent multiple submissions
    if (loading || isSubmitting) {
      console.log('Already processing, ignoring duplicate submission');
      return;
    }

    showInfo('Setting up your shop...', 3000);
    setLoading(true);
    setIsSubmitting(true);

    try {
      // Make sure we have seller data
      if (!sellerData || !sellerData.email) {
        showError('Session expired. Please start the registration process again.');
        setLoading(false);
        return;
      }

      console.log('Looking for seller with email:', sellerData.email);

      // Find the seller ID from the backend
      const sellersResponse = await fetch(`${API_BASE}/sellers/admin/sellers`);
      
      if (!sellersResponse.ok) {
        throw new Error(`Failed to fetch sellers: ${sellersResponse.status}`);
      }
      
      const sellersData = await sellersResponse.json();
      console.log('Sellers data received:', sellersData);
      
      const currentSeller = sellersData.sellers.find(seller => seller.email === sellerData.email);
      
      if (!currentSeller) {
        showError('Account not found. Please try registering again.');
        Alert.alert(
          'Account Not Found', 
          'Your seller account was not found. This might happen if:\n\n• The account was not properly created\n• The backend data was cleared\n\nPlease try registering again.',
          [
            {
              text: 'Start Over',
              onPress: async () => {
                await clearProgress();
                setActiveStep(1);
                setShowOtp(false);
                setSellerData(null);
                showInfo('Registration reset. Please start over.');
              }
            }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('Found seller:', currentSeller);

      // Prepare shop data for submission
      const shopSubmissionData = {
        sellerId: currentSeller.id,
        shopName: shopData.shopName.trim(),
        shopDescription: shopData.shopDescription.trim(),
        businessType: shopData.businessType.trim(),
        businessAddress: shopData.businessAddress.trim(),
        city: shopData.city.trim(),
        website: shopData.website ? shopData.website.trim() : '',
        businessLicense: shopData.businessLicense ? shopData.businessLicense.trim() : '',
        taxId: shopData.taxId ? shopData.taxId.trim() : '',
        shopLogo: shopData.shopLogo,
        shopBanner: shopData.shopBanner
      };

      console.log('Submitting shop data:', shopSubmissionData);

      // Submit shop data to backend
      const response = await fetch(`${API_BASE}/sellers/shop-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shopSubmissionData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      let data;
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        showError('Invalid server response. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('Shop setup response:', data);

      if (response.ok) {
        // Save seller data to AsyncStorage for dashboard use
        try {
          const sellerDataForStorage = {
            id: currentSeller.id,
            name: currentSeller.name,
            email: currentSeller.email,
            phoneNumber: currentSeller.phoneNumber
          };
          await AsyncStorage.setItem('currentSeller', JSON.stringify(sellerDataForStorage));
          console.log('Seller data saved to AsyncStorage:', sellerDataForStorage);
        } catch (storageError) {
          console.error('Error saving seller data:', storageError);
        }
        
        // Clear progress since registration is complete
        await clearProgress();
        
        console.log('SUCCESS: Shop setup completed, navigating to login');
        
        // Show success message and navigate
        showSuccess(`Shop "${shopData.shopName}" created successfully! You can now login.`, 5000);
        
        // Navigate to login screen after a short delay
        setTimeout(() => {
          navigation.navigate('SellerLogin');
        }, 2000);
        
      } else {
        console.error('Shop setup failed:', data);
        showError(data.error || data.message || 'Failed to set up shop. Please try again.');
      }
    } catch (error) {
      console.error('Shop setup error:', error);
      
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        showError('Could not connect to server. Please check if the backend is running.');
      } else {
        showError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Helper function to clear backend seller data (for development)
  const clearBackendData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/sellers/admin/clear-all`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccess('All backend data cleared successfully. You can now register with any email.', 4000);
        Alert.alert(
          'Success! 🧹', 
          'All backend data cleared successfully. You can now register with any email.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form to clean state
                setFormData({
                  name: '',
                  email: '',
                  phoneNumber: '',
                  password: ''
                });
                setErrors({});
                showInfo('Registration form reset. You can start fresh now.');
              }
            }
          ]
        );
      } else {
        showError('Failed to clear backend data: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Clear backend data error:', error);
      showError('Could not connect to backend server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+\d{10,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must start with + and contain 10-15 digits';
    }

    // Strong password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordErrors = [];
      
      if (formData.password.length < 8) {
        passwordErrors.push('at least 8 characters');
      }
      
      if (!/[a-z]/.test(formData.password)) {
        passwordErrors.push('one lowercase letter');
      }
      
      if (!/[A-Z]/.test(formData.password)) {
        passwordErrors.push('one uppercase letter');
      }
      
      if (!/\d/.test(formData.password)) {
        passwordErrors.push('one number');
      }
      
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
        passwordErrors.push('one special character');
      }
      
      if (passwordErrors.length > 0) {
        newErrors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }

    setErrors(newErrors);
    
    // Show toast for validation errors
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showWarning(firstError);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    showInfo('Creating your account...', 2000);
    setLoading(true);
    setShowSpinner(true);
    setSignupButtonText('');

    try {
      const response = await fetch(`${API_BASE}/sellers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSpinner(false);
        setSignupButtonText('Creating your account...');
        
        setTimeout(() => {
          console.log('Setting sellerData:', formData);
          setSellerData(formData);
          setShowOtp(true);
          setCanResend(false);
          setAttemptsRemaining(5);
          setIsAccountLocked(false);
          startResendTimer(180);
          setLoading(false);
          setSignupButtonText('Sign up');
          showSuccess('Account created successfully! Please check your email for verification code.', 4000);
        }, 1500);
      } else {
        setShowSpinner(false);
        setLoading(false);
        setSignupButtonText('Sign up');
        
        // Handle specific error cases
        if (response.status === 409) {
          const conflictData = data.conflicts || [];
          const hasUserConflict = conflictData.some(c => c.type === 'user');
          const hasSellerConflict = conflictData.some(c => c.type === 'seller');
          
          if (hasUserConflict && hasSellerConflict) {
            showError('These credentials are registered in both customer and seller accounts. Please use different email and phone number.', 5000);
          } else if (hasUserConflict) {
            showError('These credentials are already registered as a customer account. Please use different credentials.', 5000);
          } else if (hasSellerConflict) {
            showError('These credentials are already registered as a seller account.', 4000);
          } else {
            showError(data.error || 'Credentials already in use.', 4000);
          }
          
          Alert.alert(
            'Registration Conflict',
            'What would you like to do?',
            [
              { 
                text: 'Try Different Email', 
                style: 'default',
                onPress: () => {
                  setFormData({
                    ...formData,
                    email: ''
                  });
                  setErrors({});
                  showInfo('Please enter a different email address', 3000);
                }
              },
              {
                text: 'Use Test Email',
                style: 'default',
                onPress: () => {
                  const testEmail = 'seller' + Date.now() + '@example.com';
                  const testPhone = '+256' + Math.floor(Math.random() * 900000000 + 700000000);
                  setFormData({
                    ...formData,
                    email: testEmail,
                    phoneNumber: testPhone
                  });
                  setErrors({});
                  showSuccess(`Test credentials set: ${testEmail}`, 4000);
                }
              },
              {
                text: 'Clear All Data',
                style: 'destructive',
                onPress: clearBackendData
              },
              { 
                text: 'Go to Login', 
                style: 'default',
                onPress: () => navigation.navigate('SellerLogin')
              }
            ]
          );
        } else {
          showError(data.error || data.message || 'Registration failed. Please try again.', 4000);
        }
      }
    } catch (error) {
      setShowSpinner(false);
      setLoading(false);
      setSignupButtonText('Sign up');
      console.error('Registration error:', error);
      
      if (error.message.includes('fetch')) {
        showError('Could not connect to server. Please check your connection and try again.', 5000);
      } else {
        showError('Network error. Please check your internet connection and try again.');
      }
    }
  };

  const startResendTimer = (cooldownTime = 180) => {
    setResendCooldown(cooldownTime);
    setCanResend(false);
    
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startLockoutTimer = (lockoutTime) => {
    setIsAccountLocked(true);
    setLockoutTimer(lockoutTime);
    
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsAccountLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Show helpful message when OTP is complete
    if (value && index === 3) {
      const completeOtp = [...newOtp];
      completeOtp[index] = value;
      if (completeOtp.every(digit => digit !== '')) {
        showInfo('OTP entered. Tap verify to continue.', 2000);
      }
    }
  };

  const handleOtpKeyDown = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    if (otp.join('').length !== 4) {
      showWarning('Please enter complete OTP');
      return;
    }

    if (!sellerData || !sellerData.email) {
      showError('Session expired. Please register again.');
      return;
    }

    if (isAccountLocked) {
      const minutes = Math.floor(lockoutTimer / 60);
      const seconds = lockoutTimer % 60;
      showError(`Account temporarily locked. Please wait ${minutes}m ${seconds}s before trying again.`);
      return;
    }

    showInfo('Verifying code...', 2000);
    setLoading(true);
    
    const requestData = {
      email: sellerData.email,
      otp: otp.join('')
    };
    
    try {
      const response = await fetch(`${API_BASE}/sellers/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        setSellerId(data.seller.id);
        setActiveStep(2);
        setLoading(false);
        showSuccess('Email verified successfully! Now set up your shop.', 4000);
      } else {
        setLoading(false);
        
        if (data.isWrongOtp) {
          setAttemptsRemaining(data.attemptsRemaining);
          showError(`Wrong verification code. ${data.attemptsRemaining} attempts remaining. Please check your email.`, 4000);
        } else if (data.lockedUntil) {
          const lockoutSeconds = Math.ceil((data.lockedUntil - Date.now()) / 1000);
          startLockoutTimer(lockoutSeconds);
          showError('Account locked due to too many failed attempts.', 4000);
        } else {
          showError(data.error || data.message || 'Verification failed');
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('OTP verification error:', error);
      showError('Network error. Please check your connection and try again.');
    }
  };

  const resendOtp = async () => {
    if (!sellerData) return;
    
    if (isAccountLocked) {
      const minutes = Math.floor(lockoutTimer / 60);
      const seconds = lockoutTimer % 60;
      showError(`Account temporarily locked. Please wait ${minutes}m ${seconds}s before trying again.`);
      return;
    }
    
    if (!canResend) {
      const minutes = Math.floor(resendCooldown / 60);
      const seconds = resendCooldown % 60;
      showWarning(`Please wait ${minutes}m ${seconds}s before requesting a new code`);
      return;
    }

    showInfo('Sending new verification code...', 2000);

    try {
      const response = await fetch(`${API_BASE}/sellers/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sellerData.email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAttemptsRemaining(5);
        startResendTimer(180);
        showSuccess('New verification code sent to your email!', 4000);
      } else {
        if (data.cooldownUntil) {
          const cooldownSeconds = Math.ceil((data.cooldownUntil - Date.now()) / 1000);
          startResendTimer(cooldownSeconds);
        }
        showError(data.error || data.message || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      showError('Network error. Please check your connection and try again.');
    }
  };
  const renderSignupForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Create Account</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        placeholder="eg. John Doe"
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input, 
            errors.email && styles.inputError,
            validationStatus.email === 'available' && styles.inputSuccess,
            validationStatus.email === 'conflict' && styles.inputError
          ]}
          placeholder="eg. john@example.com"
          value={formData.email}
          onChangeText={(text) => {
            setFormData({ ...formData, email: text });
            debounceValidation('email', text);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {validationStatus.email === 'checking' && (
          <View style={styles.validationIcon}>
            <ActivityIndicator size="small" color="#3498db" />
          </View>
        )}
        {validationStatus.email === 'available' && (
          <View style={styles.validationIcon}>
            <Text style={styles.successIcon}>✅</Text>
          </View>
        )}
        {validationStatus.email === 'conflict' && (
          <View style={styles.validationIcon}>
            <Text style={styles.errorIcon}>❌</Text>
          </View>
        )}
      </View>
      {validationStatus.email === 'available' && (
        <Text style={styles.successText}>✅ Email is available</Text>
      )}
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <Text style={styles.label}>Phone Number (must have +)</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input, 
            errors.phoneNumber && styles.inputError,
            validationStatus.phoneNumber === 'available' && styles.inputSuccess,
            validationStatus.phoneNumber === 'conflict' && styles.inputError
          ]}
          placeholder="e.g. +256 772 123456"
          value={formData.phoneNumber}
          onChangeText={(text) => {
            setFormData({ ...formData, phoneNumber: text });
            debounceValidation('phoneNumber', text);
          }}
          keyboardType="phone-pad"
        />
        {validationStatus.phoneNumber === 'checking' && (
          <View style={styles.validationIcon}>
            <ActivityIndicator size="small" color="#3498db" />
          </View>
        )}
        {validationStatus.phoneNumber === 'available' && (
          <View style={styles.validationIcon}>
            <Text style={styles.successIcon}>✅</Text>
          </View>
        )}
        {validationStatus.phoneNumber === 'conflict' && (
          <View style={styles.validationIcon}>
            <Text style={styles.errorIcon}>❌</Text>
          </View>
        )}
      </View>
      {validationStatus.phoneNumber === 'available' && (
        <Text style={styles.successText}>✅ Phone number is available</Text>
      )}
      {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, errors.password && styles.inputError]}
          placeholder="Create a strong password"
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
      
      {formData.password && (
        <View style={styles.passwordStrength}>
          <Text style={styles.passwordStrengthTitle}>Password Requirements:</Text>
          <View style={styles.requirementsList}>
            <View style={styles.requirement}>
              <Text style={[styles.requirementIcon, formData.password.length >= 8 ? styles.valid : styles.invalid]}>
                {formData.password.length >= 8 ? '✅' : '❌'}
              </Text>
              <Text style={[styles.requirementText, formData.password.length >= 8 ? styles.valid : styles.invalid]}>
                At least 8 characters
              </Text>
            </View>
            <View style={styles.requirement}>
              <Text style={[styles.requirementIcon, /[a-z]/.test(formData.password) ? styles.valid : styles.invalid]}>
                {/[a-z]/.test(formData.password) ? '✅' : '❌'}
              </Text>
              <Text style={[styles.requirementText, /[a-z]/.test(formData.password) ? styles.valid : styles.invalid]}>
                One lowercase letter
              </Text>
            </View>
            <View style={styles.requirement}>
              <Text style={[styles.requirementIcon, /[A-Z]/.test(formData.password) ? styles.valid : styles.invalid]}>
                {/[A-Z]/.test(formData.password) ? '✅' : '❌'}
              </Text>
              <Text style={[styles.requirementText, /[A-Z]/.test(formData.password) ? styles.valid : styles.invalid]}>
                One uppercase letter
              </Text>
            </View>
            <View style={styles.requirement}>
              <Text style={[styles.requirementIcon, /\d/.test(formData.password) ? styles.valid : styles.invalid]}>
                {/\d/.test(formData.password) ? '✅' : '❌'}
              </Text>
              <Text style={[styles.requirementText, /\d/.test(formData.password) ? styles.valid : styles.invalid]}>
                One number
              </Text>
            </View>
            <View style={styles.requirement}>
              <Text style={[styles.requirementIcon, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? styles.valid : styles.invalid]}>
                {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✅' : '❌'}
              </Text>
              <Text style={[styles.requirementText, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? styles.valid : styles.invalid]}>
                One special character
              </Text>
            </View>
          </View>
        </View>
      )}
      
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSignup}
        disabled={loading}
      >
        {showSpinner ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>
            {signupButtonText || 'Sign up'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.loginLink}>
        Already have a seller account?{' '}
        <Text style={styles.linkText} onPress={() => navigation.navigate('SellerLogin')}>
          Login
        </Text>
      </Text>
    </View>
  );

  const renderOtpForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Enter OTP</Text>
      <Text style={styles.otpSubtitle}>
        We've sent a 4-digit code to {sellerData?.email}
      </Text>

      {isAccountLocked ? (
        <View style={styles.lockoutWarning}>
          <Text style={styles.lockoutIcon}>🔒</Text>
          <Text style={styles.lockoutTitle}>Account Temporarily Locked</Text>
          <Text style={styles.lockoutText}>
            Too many failed attempts. Please wait {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
          </Text>
        </View>
      ) : (
        <View style={styles.securityStatus}>
          <Text style={styles.securityText}>
            {attemptsRemaining === 5 ? '🔐 Enter your verification code' : 
             attemptsRemaining > 1 ? `⚠️ ${attemptsRemaining} attempts remaining` :
             '🚨 Last attempt before lockout!'}
          </Text>
        </View>
      )}

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            style={[
              styles.otpInput,
              isAccountLocked && styles.otpInputDisabled,
              attemptsRemaining <= 2 && !isAccountLocked && styles.otpInputWarning
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleOtpKeyDown(index, nativeEvent.key)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            editable={!isAccountLocked}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton, 
          (loading || isAccountLocked) && styles.disabledButton
        ]}
        onPress={verifyOtp}
        disabled={loading || isAccountLocked}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isAccountLocked ? 'Account Locked' : 'Verify OTP'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendSection}>
        {isAccountLocked ? (
          <Text style={styles.resendText}>
            Account locked. Wait {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
          </Text>
        ) : canResend ? (
          <TouchableOpacity onPress={resendOtp}>
            <Text style={styles.linkText}>Resend OTP</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.resendText}>
            Resend available in {Math.floor(resendCooldown / 60)}m {resendCooldown % 60}s
          </Text>
        )}
      </View>

      <View style={styles.helpSection}>
        <Text style={styles.helpText}>
          💡 Tip: Check your spam folder if you don't see the email
        </Text>
        <Text style={styles.helpText}>
          🔒 Your account will be locked for 30 minutes after 5 failed attempts
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.backToRegistrationButton}
        onPress={() => {
          setShowOtp(false);
          setSellerData(null);
          setOtp(['', '', '', '']);
          setAttemptsRemaining(5);
          setIsAccountLocked(false);
          setCanResend(false);
          setResendCooldown(0);
        }}
      >
        <Text style={styles.backToRegistrationText}>← Back to Registration Form</Text>
      </TouchableOpacity>
    </View>
  );
  const renderShopSetup = () => (
    <View style={styles.formContainer}>
      <View style={styles.shopHeaderSection}>
        <Text style={styles.formTitle}>Setup Your Shop</Text>
        <Text style={styles.subtitle}>Create your professional online store presence</Text>
        <View style={styles.progressIndicator}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 2 of 2</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.shopScrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.shopScrollContent}
      >
        {/* Basic Information Section */}
        <View style={styles.shopSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="storefront-outline" size={24} color="#3498db" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>Essential details about your shop</Text>
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Shop Name *</Text>
                <TextInput
                  style={[styles.input, shopErrors.shopName && styles.inputError]}
                  placeholder="e.g. Tech World Uganda"
                  value={shopData.shopName}
                  onChangeText={(text) => setShopData({ ...shopData, shopName: text })}
                  placeholderTextColor="#999"
                />
                {shopErrors.shopName && <Text style={styles.errorText}>{shopErrors.shopName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Type *</Text>
                <BusinessTypeSelector
                  selectedValue={shopData.businessType}
                  onValueChange={(value) => setShopData({ ...shopData, businessType: value })}
                  error={shopErrors.businessType}
                />
                {shopErrors.businessType && <Text style={styles.errorText}>{shopErrors.businessType}</Text>}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Description *</Text>
              <TextInput
                style={[styles.textArea, shopErrors.shopDescription && styles.inputError]}
                placeholder="Describe your business, products, and what makes you unique..."
                value={shopData.shopDescription}
                onChangeText={(text) => setShopData({ ...shopData, shopDescription: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
              <Text style={styles.inputHint}>Tell customers about your business (minimum 50 characters)</Text>
              {shopErrors.shopDescription && <Text style={styles.errorText}>{shopErrors.shopDescription}</Text>}
            </View>
          </View>
        </View>

        {/* Location Information Section */}
        <View style={styles.shopSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="location-outline" size={24} color="#e74c3c" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Location Information</Text>
              <Text style={styles.sectionSubtitle}>Where customers can find you</Text>
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Address *</Text>
              <TextInput
                style={[styles.input, shopErrors.businessAddress && styles.inputError]}
                placeholder="e.g. Plot 123, Kampala Road"
                value={shopData.businessAddress}
                onChangeText={(text) => setShopData({ ...shopData, businessAddress: text })}
                placeholderTextColor="#999"
              />
              {shopErrors.businessAddress && <Text style={styles.errorText}>{shopErrors.businessAddress}</Text>}
            </View>

            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={[styles.input, shopErrors.city && styles.inputError]}
                  placeholder="e.g. Kampala"
                  value={shopData.city}
                  onChangeText={(text) => setShopData({ ...shopData, city: text })}
                  placeholderTextColor="#999"
                />
                {shopErrors.city && <Text style={styles.errorText}>{shopErrors.city}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website (Optional)</Text>
                <TextInput
                  style={[styles.input, shopErrors.website && styles.inputError]}
                  placeholder="https://yourwebsite.com"
                  value={shopData.website}
                  onChangeText={(text) => setShopData({ ...shopData, website: text })}
                  keyboardType="url"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
                {shopErrors.website && <Text style={styles.errorText}>{shopErrors.website}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* Business Documentation Section */}
        <View style={styles.shopSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="document-text-outline" size={24} color="#f39c12" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Business Documentation</Text>
              <Text style={styles.sectionSubtitle}>Legal information (optional but recommended)</Text>
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business License Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. BL123456789"
                  value={shopData.businessLicense}
                  onChangeText={(text) => setShopData({ ...shopData, businessLicense: text })}
                  placeholderTextColor="#999"
                />
                <Text style={styles.inputHint}>Helps build customer trust</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tax ID / TIN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1234567890"
                  value={shopData.taxId}
                  onChangeText={(text) => setShopData({ ...shopData, taxId: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                <Text style={styles.inputHint}>For tax compliance</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shop Images Section */}
        <View style={styles.shopSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="image-outline" size={24} color="#9b59b6" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Shop Branding</Text>
              <Text style={styles.sectionSubtitle}>Make your shop visually appealing</Text>
            </View>
          </View>

          <View style={styles.imageUploadGrid}>
            <View style={styles.imageUploadItem}>
              <ImageUploader
                preset="logo"
                label="Shop Logo"
                hint="Square format - Auto-compressed"
                currentImage={shopData.shopLogo}
                onImageSelected={(image) => setShopData({ ...shopData, shopLogo: image })}
                showCompressionInfo={true}
              />
            </View>

            <View style={styles.imageUploadItem}>
              <ImageUploader
                preset="banner"
                label="Shop Banner"
                hint="Wide format - Auto-compressed"
                currentImage={shopData.shopBanner}
                onImageSelected={(image) => setShopData({ ...shopData, shopBanner: image })}
                showCompressionInfo={true}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.shopActionButtons}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('SellerLogin')}
        >
          <Text style={styles.skipButtonText}>Complete Later</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleShopSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="white" size="small" />
              <Text style={[styles.submitButtonText, { marginLeft: 8 }]}>Setting up shop...</Text>
            </>
          ) : (
            <>
              <Text style={styles.submitButtonText}>Complete Setup</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.card}>
          {activeStep === 1 && !showOtp && renderSignupForm()}
          {activeStep === 1 && showOtp && renderOtpForm()}
          {activeStep === 2 && renderShopSetup()}
          
          {/* Fallback if nothing renders */}
          {!(activeStep === 1 || activeStep === 2) && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: 'red' }}>
                Error: Invalid activeStep value: {activeStep}
              </Text>
              <TouchableOpacity 
                style={{ marginTop: 10, padding: 10, backgroundColor: '#3498db', borderRadius: 5 }}
                onPress={() => setActiveStep(1)}
              >
                <Text style={{ color: 'white' }}>Reset to Step 1</Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingTop: width > 1200 ? 60 : width > 768 ? 50 : 40,
    paddingHorizontal: width > 1200 ? 60 : width > 768 ? 40 : 20,
    alignItems: 'center',
    minHeight: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    width: width > 1200 ? 600 : width > 768 ? 500 : width > 480 ? 400 : '100%',
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
  formTitle: {
    fontSize: width > 1200 ? 32 : width > 768 ? 28 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: width > 768 ? 12 : 8,
    color: '#333',
  },
  subtitle: {
    fontSize: width > 1200 ? 18 : width > 768 ? 16 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: width > 768 ? 25 : 20,
    lineHeight: width > 768 ? 24 : 20,
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
  inputContainer: {
    position: 'relative',
  },
  inputSuccess: {
    borderColor: '#27ae60',
    backgroundColor: '#f8fff8',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  validationIcon: {
    position: 'absolute',
    right: width > 768 ? 15 : 12,
    top: width > 1200 ? 16 : width > 768 ? 14 : 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: width > 768 ? 16 : 14,
  },
  errorIcon: {
    fontSize: width > 768 ? 16 : 14,
  },
  successText: {
    color: '#27ae60',
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    marginTop: width > 768 ? 5 : 3,
    fontWeight: '500',
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
  loginLink: {
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
  otpSubtitle: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: width > 768 ? 25 : 20,
    lineHeight: width > 768 ? 22 : 20,
  },
  securityStatus: {
    backgroundColor: '#f8f9fa',
    borderRadius: width > 768 ? 10 : 8,
    padding: width > 768 ? 15 : 12,
    marginBottom: width > 768 ? 20 : 15,
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
  },
  securityText: {
    fontSize: width > 768 ? 14 : 13,
    color: '#495057',
    textAlign: 'center',
    fontWeight: '500',
  },
  lockoutWarning: {
    backgroundColor: '#f8d7da',
    borderRadius: width > 768 ? 10 : 8,
    padding: width > 768 ? 20 : 15,
    marginBottom: width > 768 ? 20 : 15,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    alignItems: 'center',
  },
  lockoutIcon: {
    fontSize: width > 768 ? 32 : 28,
    marginBottom: width > 768 ? 10 : 8,
  },
  lockoutTitle: {
    fontSize: width > 768 ? 16 : 15,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: width > 768 ? 8 : 6,
    textAlign: 'center',
  },
  lockoutText: {
    fontSize: width > 768 ? 14 : 13,
    color: '#721c24',
    textAlign: 'center',
    lineHeight: width > 768 ? 20 : 18,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: width > 1200 ? 20 : width > 768 ? 18 : 15,
    marginBottom: width > 768 ? 25 : 20,
    flexWrap: 'wrap',
  },
  otpInput: {
    width: width > 1200 ? 60 : width > 768 ? 55 : 50,
    height: width > 1200 ? 60 : width > 768 ? 55 : 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: width > 768 ? 10 : 8,
    fontSize: width > 1200 ? 24 : width > 768 ? 22 : 18,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  otpInputDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    color: '#6c757d',
  },
  otpInputWarning: {
    borderColor: '#ffc107',
    backgroundColor: '#fff3cd',
  },
  resendSection: {
    alignItems: 'center',
    marginTop: width > 768 ? 20 : 15,
    marginBottom: width > 768 ? 15 : 10,
  },
  resendText: {
    fontSize: width > 768 ? 14 : 13,
    color: '#666',
    textAlign: 'center',
  },
  helpSection: {
    backgroundColor: '#e7f3ff',
    borderRadius: width > 768 ? 10 : 8,
    padding: width > 768 ? 15 : 12,
    marginTop: width > 768 ? 20 : 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  helpText: {
    fontSize: width > 768 ? 12 : 11,
    color: '#004085',
    textAlign: 'center',
    marginBottom: width > 768 ? 5 : 3,
    lineHeight: width > 768 ? 16 : 14,
  },
  passwordStrength: {
    backgroundColor: '#f8f9fa',
    borderRadius: width > 768 ? 10 : 8,
    padding: width > 768 ? 15 : 12,
    marginTop: width > 768 ? 10 : 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  passwordStrengthTitle: {
    fontSize: width > 768 ? 14 : 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: width > 768 ? 10 : 8,
  },
  requirementsList: {
    gap: width > 768 ? 6 : 4,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width > 768 ? 8 : 6,
  },
  requirementIcon: {
    fontSize: width > 768 ? 14 : 12,
  },
  requirementText: {
    fontSize: width > 768 ? 13 : 11,
    flex: 1,
  },
  valid: {
    color: '#28a745',
  },
  invalid: {
    color: '#dc3545',
  },
  shopFormLayout: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: width > 768 ? 30 : 0,
    marginBottom: width > 768 ? 30 : 20,
  },
  shopFormColumn: {
    flex: width > 768 ? 1 : 0,
    marginBottom: width > 768 ? 0 : 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: width > 768 ? 10 : 8,
    paddingHorizontal: width > 768 ? 18 : 15,
    paddingVertical: width > 1200 ? 16 : width > 768 ? 14 : 12,
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    backgroundColor: '#fff',
    minHeight: width > 768 ? 100 : 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: width > 1200 ? 12 : width > 768 ? 11 : 10,
    color: '#999',
    marginTop: width > 768 ? 5 : 3,
    marginBottom: width > 768 ? 15 : 10,
    fontStyle: 'italic',
  },
  imageUploadSection: {
    marginTop: width > 768 ? 25 : 20,
    marginBottom: width > 768 ? 20 : 15,
  },
  sectionTitle: {
    fontSize: width > 1200 ? 20 : width > 768 ? 18 : 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: width > 768 ? 15 : 12,
  },
  sectionSubtitle: {
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    color: '#666',
    marginBottom: width > 768 ? 15 : 12,
    lineHeight: width > 768 ? 18 : 16,
  },
  businessHoursSection: {
    marginTop: width > 768 ? 25 : 20,
  },
  businessHoursContainer: {
    gap: width > 768 ? 12 : 10,
  },
  dayRow: {
    flexDirection: width > 768 ? 'row' : 'column',
    alignItems: width > 768 ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: width > 768 ? 12 : 10,
    paddingHorizontal: width > 768 ? 15 : 12,
    backgroundColor: '#f8f9fa',
    borderRadius: width > 768 ? 8 : 6,
    gap: width > 768 ? 15 : 8,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width > 768 ? 15 : 12,
    minWidth: width > 768 ? 120 : 100,
  },
  dayName: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '500',
    color: '#333',
    minWidth: width > 768 ? 80 : 70,
  },
  closedToggle: {
    paddingHorizontal: width > 768 ? 12 : 10,
    paddingVertical: width > 768 ? 6 : 5,
    borderRadius: width > 768 ? 6 : 5,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  closedToggleActive: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  closedText: {
    fontSize: width > 768 ? 12 : 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  closedActive: {
    color: 'white',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width > 768 ? 10 : 8,
  },
  timeButton: {
    paddingHorizontal: width > 768 ? 12 : 10,
    paddingVertical: width > 768 ? 8 : 6,
    backgroundColor: 'white',
    borderRadius: width > 768 ? 6 : 5,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: width > 768 ? 70 : 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: width > 768 ? 14 : 12,
    color: '#333',
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: width > 768 ? 14 : 12,
    color: '#666',
    fontWeight: '500',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: width > 768 ? 20 : 15,
    paddingVertical: width > 768 ? 12 : 10,
  },
  skipButtonText: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  paymentInfo: {
    backgroundColor: '#e3f2fd',
    borderRadius: width > 768 ? 12 : 8,
    padding: width > 1200 ? 20 : width > 768 ? 18 : 15,
    marginBottom: width > 768 ? 25 : 20,
  },
  paymentInfoTitle: {
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: width > 768 ? 12 : 10,
  },
  paymentInfoItem: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#1976d2',
    marginBottom: width > 768 ? 8 : 5,
    lineHeight: width > 768 ? 22 : 20,
  },
  paymentButtons: {
    gap: width > 768 ? 15 : 12,
  },
  paymentButton: {
    paddingVertical: width > 1200 ? 18 : width > 768 ? 16 : 15,
    borderRadius: width > 768 ? 10 : 8,
    alignItems: 'center',
    minHeight: width > 768 ? 54 : 48,
    justifyContent: 'center',
  },
  paymentButtonText: {
    color: 'white',
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    fontWeight: 'bold',
  },
  stripeButton: {
    backgroundColor: '#635BFF',
  },
  flutterwaveButton: {
    backgroundColor: '#F5A623',
  },
  pesapalButton: {
    backgroundColor: '#00A651',
  },
  paypalButton: {
    backgroundColor: '#003087',
  },
  mobileMoneyButton: {
    backgroundColor: '#FF6B00',
  },
  skipSection: {
    marginTop: width > 768 ? 30 : 25,
    paddingTop: width > 768 ? 25 : 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  skipText: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    marginBottom: width > 768 ? 10 : 8,
    textAlign: 'center',
  },
  skipSubtext: {
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    color: '#999',
    textAlign: 'center',
    marginTop: width > 768 ? 10 : 8,
    lineHeight: width > 768 ? 18 : 16,
    maxWidth: width > 768 ? 300 : 250,
  },

  // New Shop Setup Styles - Professional & Responsive
  shopHeaderSection: {
    marginBottom: width > 768 ? 30 : 25,
    alignItems: 'center',
  },
  progressIndicator: {
    width: '100%',
    marginTop: width > 768 ? 20 : 15,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: width > 768 ? 8 : 6,
    backgroundColor: '#e9ecef',
    borderRadius: width > 768 ? 4 : 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: width > 768 ? 4 : 3,
  },
  progressText: {
    fontSize: width > 768 ? 14 : 12,
    color: '#666',
    marginTop: width > 768 ? 8 : 6,
    fontWeight: '500',
  },
  shopScrollContainer: {
    flex: 1,
    maxHeight: width > 768 ? 600 : 500,
  },
  shopScrollContent: {
    paddingBottom: width > 768 ? 20 : 15,
  },
  shopSection: {
    backgroundColor: '#fff',
    borderRadius: width > 768 ? 12 : 10,
    padding: width > 768 ? 20 : 16,
    marginBottom: width > 768 ? 20 : 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: width > 768 ? 20 : 16,
    paddingBottom: width > 768 ? 15 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  sectionIconContainer: {
    width: width > 768 ? 48 : 40,
    height: width > 768 ? 48 : 40,
    borderRadius: width > 768 ? 24 : 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: width > 768 ? 15 : 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  formGrid: {
    width: '100%',
  },
  formRow: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: width > 768 ? 16 : 0,
  },
  inputGroup: {
    flex: 1,
    marginBottom: width > 768 ? 20 : 16,
  },
  imageUploadGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: width > 768 ? 20 : 16,
  },
  imageUploadItem: {
    flex: 1,
  },
  businessHoursGrid: {
    width: '100%',
  },
  businessHourRow: {
    flexDirection: width > 768 ? 'row' : 'column',
    alignItems: width > 768 ? 'center' : 'flex-start',
    paddingVertical: width > 768 ? 12 : 10,
    paddingHorizontal: width > 768 ? 16 : 12,
    backgroundColor: '#f8f9fa',
    borderRadius: width > 768 ? 8 : 6,
    marginBottom: width > 768 ? 8 : 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dayColumn: {
    width: width > 768 ? 100 : '100%',
    marginBottom: width > 768 ? 0 : 8,
  },
  dayName: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  statusColumn: {
    width: width > 768 ? 80 : '100%',
    marginBottom: width > 768 ? 0 : 8,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width > 768 ? 12 : 10,
    paddingVertical: width > 768 ? 6 : 5,
    borderRadius: width > 768 ? 20 : 16,
    gap: width > 768 ? 6 : 4,
  },
  statusOpen: {
    backgroundColor: '#27ae60',
  },
  statusClosed: {
    backgroundColor: '#e74c3c',
  },
  statusText: {
    fontSize: width > 768 ? 12 : 11,
    fontWeight: '500',
    color: 'white',
  },
  timeColumn: {
    flex: 1,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width > 768 ? 12 : 8,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: width > 768 ? 8 : 6,
    paddingHorizontal: width > 768 ? 12 : 10,
    paddingVertical: width > 768 ? 8 : 6,
    gap: width > 768 ? 8 : 6,
    minWidth: width > 768 ? 80 : 70,
  },
  timeText: {
    fontSize: width > 768 ? 14 : 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: width > 768 ? 14 : 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  shopActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: width > 768 ? 25 : 20,
    paddingTop: width > 768 ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: width > 768 ? 16 : 12,
  },
  backToRegistrationButton: {
    alignItems: 'center',
    marginTop: width > 768 ? 20 : 15,
    paddingVertical: width > 768 ? 12 : 10,
  },
  backToRegistrationText: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#3498db',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },

  // Business Type Dropdown Styles
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: width > 768 ? 10 : 8,
    paddingHorizontal: width > 768 ? 18 : 15,
    paddingVertical: width > 1200 ? 16 : width > 768 ? 14 : 12,
    backgroundColor: '#fff',
    minHeight: width > 768 ? 50 : 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonOpen: {
    borderColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width > 768 ? 40 : 20,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: width > 768 ? 16 : 12,
    width: '100%',
    maxWidth: width > 768 ? 500 : 350,
    maxHeight: width > 768 ? 500 : 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: width > 768 ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  dropdownHeaderText: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dropdownList: {
    maxHeight: width > 768 ? 400 : 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width > 768 ? 20 : 16,
    paddingVertical: width > 768 ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  dropdownItemDisabled: {
    backgroundColor: '#f8f9fa',
    opacity: 0.6,
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: width > 768 ? 16 : 14,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextDisabled: {
    color: '#999',
    fontWeight: 'bold',
  },
  dropdownItemTextSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
});

export default SellerSignup;
