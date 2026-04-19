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
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { uploadToImageKit, deleteFromImageKit } from '../services/imagekitService';
import API_BASE from '../constants/api';

const ProfileSettings = ({ navigation }) => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
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
        
        // Fetch complete seller profile from backend
        try {
          const response = await fetch(`${API_BASE}/sellers/profile/${seller.id}`);
          const data = await response.json();
          
          if (response.ok && data.success) {
            const profile = data.profile;
            
            // Update seller info with fresh data
            setSellerInfo(profile);
            
            // Prefill profile data with existing information
            const profileData = {
              name: profile.name || '',
              email: profile.email || '',
              phoneNumber: profile.phoneNumber || '',
            };
            
            setProfileData(profileData);
            setOriginalData(profileData);
            
            console.log('Profile data prefilled:', profileData);
          } else {
            console.log('Failed to fetch seller profile:', data.error);
            // Fallback to local data if API fails
            const fallbackData = {
              name: seller.name || '',
              email: seller.email || '',
              phoneNumber: seller.phoneNumber || '',
            };
            
            setProfileData(fallbackData);
            setOriginalData(fallbackData);
          }
        } catch (apiError) {
          console.log('API call failed, using local data:', apiError);
          // Fallback to local data if API call fails
          const fallbackData = {
            name: seller.name || '',
            email: seller.email || '',
            phoneNumber: seller.phoneNumber || '',
          };
          
          setProfileData(fallbackData);
          setOriginalData(fallbackData);
        }
      } else {
        showError('Please log in to access profile settings');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading seller info:', error);
      showError('Failed to load seller information');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phone);
  };

  const hasChanges = () => {
    return (
      profileData.name !== originalData.name ||
      profileData.email !== originalData.email ||
      profileData.phoneNumber !== originalData.phoneNumber
    );
  };

  const handleSave = async () => {
    // Validation
    if (!profileData.name.trim()) {
      showError('Name is required');
      return;
    }

    if (!profileData.email.trim()) {
      showError('Email is required');
      return;
    }

    if (!validateEmail(profileData.email)) {
      showError('Please enter a valid email address');
      return;
    }

    if (!profileData.phoneNumber.trim()) {
      showError('Phone number is required');
      return;
    }

    if (!validatePhone(profileData.phoneNumber)) {
      showError('Phone number must start with + and contain 10-15 digits');
      return;
    }

    if (!hasChanges()) {
      showWarning('No changes to save');
      return;
    }

    setSaving(true);

    try {
      // Update profile via API
      const response = await fetch(`${API_BASE}/sellers/profile/${sellerInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
          email: profileData.email.trim(),
          phoneNumber: profileData.phoneNumber.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local storage with new profile data
        await AsyncStorage.setItem('currentSeller', JSON.stringify(data.profile));
        setSellerInfo(data.profile);
        setOriginalData({ ...profileData });
        
        showSuccess('Profile updated successfully!');
        console.log('Profile updated:', data.profile);
      } else {
        showError(data.error || 'Failed to update profile');
      }
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!hasChanges()) {
      showWarning('No changes to reset');
      return;
    }

    Alert.alert(
      'Reset Changes',
      'Are you sure you want to reset all changes?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setProfileData({ ...originalData });
            showWarning('Changes reset');
          },
        },
      ]
    );
  };

  const handleChangePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('Permission to access photos is required');
        return;
      }

      Alert.alert(
        'Change Profile Photo',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: () => openCamera(),
          },
          {
            text: 'Photo Library',
            onPress: () => openImagePicker(),
          },
          {
            text: 'Remove Photo',
            onPress: () => removeProfilePhoto(),
            style: 'destructive',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      showError('Failed to access camera/photos');
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showError('Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      showError('Failed to open camera');
    }
  };

  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      showError('Failed to open photo library');
    }
  };

  const uploadProfileImage = async (imageAsset) => {
    setUploadingImage(true);
    
    try {
      console.log('Uploading profile image:', imageAsset);
      
      // First, delete the old profile image if it exists (for replace functionality)
      if (sellerInfo.profileImage?.fileId) {
        try {
          console.log('Deleting old profile image:', sellerInfo.profileImage.fileId);
          const deleteResult = await deleteFromImageKit(sellerInfo.profileImage.fileId);
          if (deleteResult.success) {
            console.log('Old profile image deleted successfully');
          } else {
            console.warn('Failed to delete old profile image:', deleteResult.error);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old profile image:', deleteError);
          // Continue with upload even if delete fails
        }
      }
      
      const imageData = {
        uri: imageAsset.uri,
        fileName: `profile_${sellerInfo.id}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      };

      // Upload to ImageKit
      const uploadResult = await uploadToImageKit(imageData, 'sellers/profiles', {
        tags: ['profile', 'seller', sellerInfo.id],
      });

      if (uploadResult.success) {
        // Update seller info with new profile image
        const updatedSeller = {
          ...sellerInfo,
          profileImage: {
            url: uploadResult.url,
            fileId: uploadResult.fileId,
            thumbnailUrl: uploadResult.thumbnailUrl,
            fileName: uploadResult.fileName || uploadResult.name,
            uploaded: true,
          },
        };

        // Update backend with new profile image
        try {
          const response = await fetch(`${API_BASE}/sellers/profile-image/${sellerInfo.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              profileImage: updatedSeller.profileImage,
            }),
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            console.log('Profile image updated in database');
          } else {
            console.warn('Failed to update profile image in database:', data.error);
            // Continue anyway since ImageKit upload was successful
          }
        } catch (dbError) {
          console.warn('Database update failed:', dbError);
          // Continue anyway since ImageKit upload was successful
        }

        // Update local storage
        await AsyncStorage.setItem('currentSeller', JSON.stringify(updatedSeller));
        setSellerInfo(updatedSeller);

        showSuccess('Profile photo updated successfully!');
      } else {
        showError('Failed to upload profile photo');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      showError('Failed to upload profile photo');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfilePhoto = async () => {
    if (!sellerInfo.profileImage?.fileId) {
      showWarning('No profile photo to remove');
      return;
    }

    Alert.alert(
      'Remove Profile Photo',
      'Are you sure you want to remove your profile photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingImage(true);
            
            try {
              // Delete from ImageKit
              console.log('Deleting profile image from ImageKit:', sellerInfo.profileImage.fileId);
              const deleteResult = await deleteFromImageKit(sellerInfo.profileImage.fileId);
              
              if (deleteResult.success) {
                console.log('Profile image deleted from ImageKit successfully');
                
                // Update seller info
                const updatedSeller = {
                  ...sellerInfo,
                  profileImage: null,
                };

                // Update backend to remove profile image
                try {
                  const response = await fetch(`${API_BASE}/sellers/profile-image/${sellerInfo.id}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });

                  const data = await response.json();
                  
                  if (response.ok && data.success) {
                    console.log('Profile image removed from database');
                  } else {
                    console.warn('Failed to remove profile image from database:', data.error);
                    // Continue anyway since ImageKit deletion was successful
                  }
                } catch (dbError) {
                  console.warn('Database update failed:', dbError);
                  // Continue anyway since ImageKit deletion was successful
                }

                // Update local storage
                await AsyncStorage.setItem('currentSeller', JSON.stringify(updatedSeller));
                setSellerInfo(updatedSeller);

                showSuccess('Profile photo removed successfully!');
              } else {
                showError('Failed to remove profile photo from storage');
              }
            } catch (error) {
              console.error('Error removing profile photo:', error);
              showError('Failed to remove profile photo');
            } finally {
              setUploadingImage(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          disabled={!hasChanges()}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={hasChanges() ? "#666" : "#ccc"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {sellerInfo?.profileImage?.url ? (
              <Image 
                source={{ uri: sellerInfo.profileImage.url }} 
                style={styles.avatarImage}
                onError={() => console.log('Failed to load profile image')}
              />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#3498db" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleChangePhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.changeAvatarButton}
            onPress={handleChangePhoto}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={16} color="#3498db" />
            <Text style={styles.changeAvatarText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={profileData.name}
              onChangeText={(text) => setProfileData({ ...profileData, name: text })}
              placeholder="Enter your full name"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text.toLowerCase() })}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
            <Text style={styles.inputNote}>
              This email will be used for login and notifications
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={profileData.phoneNumber}
              onChangeText={(text) => setProfileData({ ...profileData, phoneNumber: text })}
              placeholder="+256700000000"
              keyboardType="phone-pad"
              maxLength={15}
            />
            <Text style={styles.inputNote}>
              Include country code (e.g., +256 for Uganda)
            </Text>
          </View>
        </View>

        {/* Account Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          
          <View style={styles.statusItem}>
            <View style={styles.statusIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>Email Verified</Text>
              <Text style={styles.statusSubtitle}>Your email address is verified</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>Phone Verified</Text>
              <Text style={styles.statusSubtitle}>Your phone number is verified</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusIcon}>
              <Ionicons name="shield-checkmark" size={20} color="#3498db" />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>Seller Account</Text>
              <Text style={styles.statusSubtitle}>Active seller with full access</Text>
            </View>
          </View>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          
          <TouchableOpacity style={styles.privacyItem}>
            <Ionicons name="download-outline" size={20} color="#3498db" />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Download My Data</Text>
              <Text style={styles.privacySubtitle}>Get a copy of your account data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.privacyItem}>
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Delete Account</Text>
              <Text style={styles.privacySubtitle}>Permanently delete your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        {/* Changes Indicator */}
        {hasChanges() && (
          <View style={styles.changesIndicator}>
            <Ionicons name="information-circle" size={16} color="#f39c12" />
            <Text style={styles.changesText}>You have unsaved changes</Text>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton, 
            (!hasChanges() || saving) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!hasChanges() || saving}
        >
          {saving ? (
            <ActivityIndicator size={16} color="white" />
          ) : (
            <Ionicons name="checkmark" size={18} color="white" />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
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

      {/* Image Upload Loading Overlay */}
      {uploadingImage && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadModal}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.uploadText}>Uploading profile photo...</Text>
          </View>
        </View>
      )}
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
  resetButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 20,
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#3498db',
    marginLeft: 5,
    fontWeight: '500',
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
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'white',
  },
  inputNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  statusIcon: {
    marginRight: 15,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  privacyContent: {
    flex: 1,
    marginLeft: 15,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  privacySubtitle: {
    fontSize: 12,
    color: '#666',
  },
  changesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  changesText: {
    fontSize: 14,
    color: '#856404',
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
    backgroundColor: '#3498db',
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
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadModal: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default ProfileSettings;
