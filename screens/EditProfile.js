import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import CustomToast from '../components/CustomToast';
import * as ImagePicker from 'expo-image-picker';
import API_BASE from '../constants/api';
import { authFetch } from '../utils/authFetch';

const { width, height } = Dimensions.get('window');

const EditProfile = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarFileId, setAvatarFileId] = useState(null);
  
  // Modal states
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUserData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'warning',
          text1: 'Permission Required',
          text2: 'Camera roll permission is needed to upload profile pictures',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    }
  };
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUser(user);
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setAddress(user.address || '');
        setDateOfBirth(user.dateOfBirth || '');
        setGender(user.gender || '');
        setAvatar(user.avatar || null);
        setAvatarFileId(user.avatarFileId || null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load user data',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ImageKit upload function
  const uploadToImageKit = async (imageUri) => {
    try {
      console.log('Uploading to ImageKit...');
      
      // Convert image to base64 if needed
      let base64Image = imageUri;
      
      if (Platform.OS !== 'web' && !imageUri.startsWith('data:')) {
        // Convert mobile URI to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

      const uploadData = {
        file: base64Data,
        fileName: `profile_${user?.id || Date.now()}_${Date.now()}`,
        folder: 'user-profiles',
        tags: ['profile', 'user']
      };

      console.log('Sending upload request to ImageKit...');
      const response = await fetch(`${API_BASE}/imagekit/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      });

      const result = await response.json();
      console.log('ImageKit upload response:', result);

      if (response.ok && result.success) {
        return {
          success: true,
          url: result.url,
          fileId: result.fileId
        };
      } else {
        throw new Error(result.message || result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('ImageKit upload error:', error);
      throw error;
    }
  };

  // ImageKit delete function
  const deleteFromImageKit = async (fileId) => {
    try {
      console.log('Deleting from ImageKit:', fileId);
      
      const response = await fetch(`${API_BASE}/imagekit/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId })
      });

      const result = await response.json();
      console.log('ImageKit delete response:', result);

      if (response.ok && result.success) {
        return { success: true };
      } else {
        throw new Error(result.message || result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('ImageKit delete error:', error);
      throw error;
    }
  };
  const handleImageSelection = async (imageUri) => {
    setImageUploading(true);
    
    try {
      // Delete old image from ImageKit if it exists (for replace functionality)
      if (avatarFileId && avatarFileId !== `img_${Date.now()}`) {
        try {
          await deleteFromImageKit(avatarFileId);
          console.log('Old image deleted from ImageKit');
        } catch (deleteError) {
          console.warn('Failed to delete old image:', deleteError.message);
          // Continue with upload even if delete fails
        }
      }

      // Upload new image to ImageKit
      const uploadResult = await uploadToImageKit(imageUri);
      
      if (uploadResult.success) {
        // Update state with new image
        setAvatar(uploadResult.url);
        setAvatarFileId(uploadResult.fileId);
        
        // Update database immediately with new image
        try {
          const response = await authFetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              address: address.trim(),
              dateOfBirth: dateOfBirth.trim(),
              gender: gender,
              avatar: uploadResult.url,
              avatarFileId: uploadResult.fileId,
            })
          });

          const data = await response.json();

          if (response.ok) {
            // Update local storage with new user data
            await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            console.log('Profile image updated in database');
          } else {
            console.warn('Failed to update profile image in database:', data.message);
            // Continue anyway since ImageKit upload was successful
          }
        } catch (dbError) {
          console.warn('Database update failed:', dbError);
          // Continue anyway since ImageKit upload was successful
        }
        
        Toast.show({
          type: 'success',
          text1: 'Image Updated',
          text2: 'Profile picture uploaded successfully',
          position: 'top',
          visibilityTime: 2000,
        });
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error handling image selection:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error.message || 'Failed to upload image',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setImageUploading(false);
      setShowImagePicker(false);
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              handleImageSelection(e.target.result);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled) {
          handleImageSelection(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to select image',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Toast.show({
          type: 'info',
          text1: 'Camera Not Available',
          text2: 'Camera access is not available in web browsers',
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'warning',
          text1: 'Permission Required',
          text2: 'Camera permission is needed to take photos',
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        handleImageSelection(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to take photo',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };
  const deleteAvatar = async () => {
    console.log('Delete avatar button clicked');
    console.log('Current avatar:', avatar);
    console.log('Current avatarFileId:', avatarFileId);
    console.log('Platform:', Platform.OS);
    
    // For web, use confirm instead of Alert.alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete your profile picture?');
      if (!confirmed) return;
      
      console.log('Delete confirmed (web), starting deletion process');
      await performDelete();
    } else {
      Alert.alert(
        'Delete Profile Picture',
        'Are you sure you want to delete your profile picture?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              console.log('Delete confirmed (native), starting deletion process');
              await performDelete();
            }
          }
        ]
      );
    }
  };

  const performDelete = async () => {
    setImageUploading(true);
    try {
      // Delete from ImageKit if fileId exists
      if (avatarFileId && avatarFileId !== `img_${Date.now()}`) {
        console.log('Deleting from ImageKit with fileId:', avatarFileId);
        const deleteResult = await deleteFromImageKit(avatarFileId);
        if (deleteResult.success) {
          console.log('Image deleted from ImageKit successfully');
        } else {
          console.warn('Failed to delete image from ImageKit');
        }
      } else {
        console.log('No valid fileId to delete from ImageKit');
      }
      
      // Clear local state
      console.log('Clearing local state');
      setAvatar(null);
      setAvatarFileId(null);
      setShowImageViewer(false);
      
      // Update database immediately to remove avatar
      try {
        console.log('Updating database to remove avatar');
        const response = await authFetch(`${API_BASE}/auth/profile`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            dateOfBirth: dateOfBirth.trim(),
            gender: gender,
            avatar: null,
            avatarFileId: null,
          })
        });

        const data = await response.json();
        console.log('Database update response:', data);

        if (response.ok) {
          // Update local storage with new user data
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
          console.log('Profile image removed from database');
        } else {
          console.warn('Failed to remove profile image from database:', data.message);
          // Continue anyway since ImageKit deletion was successful
        }
      } catch (dbError) {
        console.warn('Database update failed:', dbError);
        // Continue anyway since ImageKit deletion was successful
      }
      
      Toast.show({
        type: 'success',
        text1: 'Image Deleted',
        text2: 'Profile picture removed successfully',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Failed to delete profile picture',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      console.log('Delete process completed');
      setImageUploading(false);
    }
  };

  const saveProfile = async () => {
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

    setSaving(true);
    try {
      const updatedUser = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender: gender,
        avatar: avatar,
        avatarFileId: avatarFileId,
      };

      // Make API call to update profile
      const response = await authFetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        body: JSON.stringify(updatedUser)
      });

      const data = await response.json();

      if (response.ok) {
        // Update local storage with new user data
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        Toast.show({
          type: 'success',
          text1: 'Profile Updated',
          text2: 'Your profile has been updated successfully',
          position: 'top',
          visibilityTime: 2000,
        });

        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: data.message || 'Failed to update profile',
          position: 'top',
          visibilityTime: 3000,
        });
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Please check your connection and try again',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };
  // Render Image Viewer Modal
  const renderImageViewer = () => (
    <Modal
      visible={showImageViewer}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowImageViewer(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.imageViewerContainer}>
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowImageViewer(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.imageViewerContent}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.fullScreenImage} />
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons name="person" size={100} color="#ccc" />
                <Text style={styles.noImageText}>No profile picture</Text>
              </View>
            )}
          </View>
          
          <View style={styles.imageViewerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowImageViewer(false);
                setShowImagePicker(true);
              }}
            >
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.actionButtonText}>Replace</Text>
            </TouchableOpacity>
            
            {avatar && (
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.deleteButton,
                  imageUploading && styles.actionButtonDisabled
                ]}
                onPress={() => {
                  console.log('Delete button pressed, avatar:', avatar, 'avatarFileId:', avatarFileId);
                  console.log('imageUploading:', imageUploading);
                  if (!imageUploading) {
                    deleteAvatar();
                  } else {
                    console.log('Delete button disabled due to imageUploading');
                  }
                }}
                disabled={imageUploading}
                activeOpacity={imageUploading ? 1 : 0.7}
              >
                {imageUploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render Image Picker Modal
  const renderImagePicker = () => (
    <Modal
      visible={showImagePicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowImagePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.imagePickerContainer}>
          <View style={styles.imagePickerHeader}>
            <Text style={styles.imagePickerTitle}>Select Profile Picture</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowImagePicker(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.imagePickerOptions}>
            <TouchableOpacity
              style={styles.imagePickerOption}
              onPress={() => {
                setShowImagePicker(false);
                setTimeout(pickImage, 300);
              }}
            >
              <View style={styles.imagePickerIconContainer}>
                <Ionicons name="images" size={32} color="#667eea" />
              </View>
              <Text style={styles.imagePickerOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={() => {
                  setShowImagePicker(false);
                  setTimeout(takePhoto, 300);
                }}
              >
                <View style={styles.imagePickerIconContainer}>
                  <Ionicons name="camera" size={32} color="#667eea" />
                </View>
                <Text style={styles.imagePickerOptionText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

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
            
            <Text style={styles.headerTitle}>Edit Profile</Text>
            
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="checkmark" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setShowImageViewer(true)}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#FF6B6B', '#4ECDC4']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>
                  {name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
            
            <View style={styles.avatarOverlay}>
              <Ionicons name="eye" size={20} color="white" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cameraButton}
            onPress={() => setShowImagePicker(true)}
            disabled={imageUploading}
          >
            {imageUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="camera" size={16} color="white" />
            )}
          </TouchableOpacity>
          
          <Text style={styles.changePhotoText}>Tap image to view • Tap camera to change</Text>
        </View>
        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <MaterialIcons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) {
                    setErrors(prev => ({ ...prev, name: null }));
                  }
                }}
                autoCapitalize="words"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
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

          {/* Phone Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
              <MaterialIcons name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) {
                    setErrors(prev => ({ ...prev, phone: null }));
                  }
                }}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Address Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="location-on" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Enter your address"
                placeholderTextColor="#9CA3AF"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="cake" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9CA3AF"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Gender Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    gender === option && styles.genderOptionSelected
                  ]}
                  onPress={() => setGender(option)}
                >
                  <Text style={[
                    styles.genderText,
                    gender === option && styles.genderTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.changePasswordButton}
              onPress={() => navigation.navigate('ChangeUserPassword')}
            >
              <MaterialIcons name="lock" size={20} color="#667eea" />
              <Text style={styles.changePasswordText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modals */}
      {renderImageViewer()}
      {renderImagePicker()}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  scrollContainer: {
    flex: 1,
  },
  profileSection: {
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 15,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: 'black',
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  noImageContainer: {
    alignItems: 'center',
  },
  noImageText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 10,
  },
  imageViewerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePickerContainer: {
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  imagePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  imagePickerOptions: {
    padding: 20,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  imagePickerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  imagePickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  // Form Styles
  formSection: {
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
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  genderTextSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  actionSection: {
    marginTop: 10,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  changePasswordText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#667eea',
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 30,
  },
});

export default EditProfile;
