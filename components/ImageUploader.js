import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatFileSize } from '../utils/imageCompression';
import { uploadToImageKit } from '../services/imagekitService';

const { width } = Dimensions.get('window');

const ImageUploader = ({
  preset = 'product',
  onImageSelected,
  currentImage = null,
  label = 'Upload Image',
  hint = 'Tap to select image',
  style = {},
  showPreview = true,
  showCompressionInfo = true
}) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async () => {
    if (uploading) return;

    setUploading(true);
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Pick image without compression
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: preset === 'banner' ? [3, 1] : [1, 1],
        quality: 1, // Maximum quality - no compression
        base64: true, // Get base64 for file size calculation
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0];
        
        // Calculate file size from base64 if not available
        let fileSize = selectedImage.fileSize || 0;
        if (!fileSize && selectedImage.base64) {
          fileSize = Math.round((selectedImage.base64.length * 3) / 4);
        }

        const imageData = {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          base64: selectedImage.base64,
          fileSize: fileSize,
          fileName: selectedImage.fileName || `${preset}_image_${Date.now()}.jpg`,
          mimeType: selectedImage.mimeType || 'image/jpeg',
          type: selectedImage.type || 'image'
        };

        // Upload to ImageKit
        const folder = getFolderPath(preset);
        const uploadResult = await uploadToImageKit(imageData, folder, {
          tags: [preset, 'mobile-upload']
        });

        if (uploadResult.success) {
          const finalImage = {
            ...imageData,
            imagekitUrl: uploadResult.url,
            imagekitFileId: uploadResult.fileId,
            imagekitThumbnail: uploadResult.thumbnailUrl,
            uploaded: true
          };

          onImageSelected(finalImage);
          
          if (showCompressionInfo) {
            Alert.alert(
              'Image Uploaded Successfully! 📸',
              `✅ Uploaded to ImageKit\nFile size: ${formatFileSize(fileSize)}\nDimensions: ${selectedImage.width} x ${selectedImage.height}\n\nYour image is now optimized and ready to use!`,
              [{ text: 'Great!' }]
            );
          }
        } else {
          // Fallback to local image if ImageKit upload fails
          console.warn('ImageKit upload failed, using local image:', uploadResult.error);
          
          const finalImage = {
            ...imageData,
            uploaded: false,
            uploadError: uploadResult.error
          };

          onImageSelected(finalImage);
          
          Alert.alert(
            'Image Selected (Local) 📸',
            `Image selected but cloud upload failed.\nFile size: ${formatFileSize(fileSize)}\nDimensions: ${selectedImage.width} x ${selectedImage.height}\n\nNote: Image will be uploaded when you submit the form.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFolderPath = (preset) => {
    switch (preset) {
      case 'logo':
        return 'sellers/logos';
      case 'banner':
        return 'sellers/banners';
      case 'product':
        return 'products/images';
      case 'thumbnail':
        return 'products/thumbnails';
      default:
        return 'uploads';
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onImageSelected(null) }
      ]
    );
  };

  const getPreviewStyle = () => {
    switch (preset) {
      case 'logo':
        return styles.logoPreview;
      case 'banner':
        return styles.bannerPreview;
      case 'product':
        return styles.productPreview;
      case 'thumbnail':
        return styles.thumbnailPreview;
      default:
        return styles.defaultPreview;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      {/* Image Preview */}
      {showPreview && currentImage && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: currentImage.uri }} style={getPreviewStyle()} />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={removeImage}
          >
            <Ionicons name="close-circle" size={24} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Button */}
      <TouchableOpacity 
        style={[
          styles.uploadButton,
          uploading && styles.uploadButtonDisabled,
          currentImage && styles.uploadButtonWithImage
        ]}
        onPress={handleImageUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#3498db" size="small" />
        ) : (
          <>
            <Ionicons 
              name={getIconName()} 
              size={24} 
              color="#3498db" 
            />
            <Text style={styles.uploadButtonText}>
              {currentImage ? 'Change Image' : label}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Hint Text */}
      {hint && <Text style={styles.hint}>{hint}</Text>}

      {/* Image Info */}
      {currentImage && (
        <View style={styles.imageInfoContainer}>
          <Text style={styles.imageInfo}>
            📸 {currentImage.fileName} • {formatFileSize(currentImage.fileSize || 0)}
          </Text>
          {currentImage.uploaded && (
            <Text style={styles.uploadStatus}>
              ✅ Uploaded to ImageKit
            </Text>
          )}
          {currentImage.uploadError && (
            <Text style={styles.uploadError}>
              ⚠️ Cloud upload failed - will retry on submit
            </Text>
          )}
        </View>
      )}
    </View>
  );

  function getIconName() {
    switch (preset) {
      case 'logo':
        return 'business-outline';
      case 'banner':
        return 'image-outline';
      case 'product':
        return 'cube-outline';
      case 'thumbnail':
        return 'camera-outline';
      default:
        return 'add-outline';
    }
  }
};

const styles = StyleSheet.create({
  container: {
    marginBottom: width > 768 ? 20 : 15,
  },
  label: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: width > 768 ? 8 : 6,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: width > 768 ? 15 : 12,
    alignItems: 'center',
  },
  logoPreview: {
    width: width > 768 ? 120 : 100,
    height: width > 768 ? 120 : 100,
    borderRadius: width > 768 ? 12 : 10,
    backgroundColor: '#f8f9fa',
  },
  bannerPreview: {
    width: '100%',
    height: width > 768 ? 120 : 100,
    borderRadius: width > 768 ? 12 : 10,
    backgroundColor: '#f8f9fa',
  },
  productPreview: {
    width: width > 768 ? 150 : 120,
    height: width > 768 ? 150 : 120,
    borderRadius: width > 768 ? 12 : 10,
    backgroundColor: '#f8f9fa',
  },
  thumbnailPreview: {
    width: width > 768 ? 80 : 60,
    height: width > 768 ? 80 : 60,
    borderRadius: width > 768 ? 8 : 6,
    backgroundColor: '#f8f9fa',
  },
  defaultPreview: {
    width: width > 768 ? 120 : 100,
    height: width > 768 ? 120 : 100,
    borderRadius: width > 768 ? 12 : 10,
    backgroundColor: '#f8f9fa',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    borderRadius: width > 768 ? 10 : 8,
    paddingVertical: width > 768 ? 20 : 15,
    paddingHorizontal: width > 768 ? 15 : 12,
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    marginBottom: width > 768 ? 8 : 6,
  },
  uploadButtonWithImage: {
    borderStyle: 'solid',
    backgroundColor: '#e3f2fd',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#3498db',
    fontWeight: '500',
    marginTop: width > 768 ? 8 : 6,
  },
  hint: {
    fontSize: width > 1200 ? 12 : width > 768 ? 11 : 10,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  imageInfo: {
    fontSize: width > 768 ? 12 : 11,
    color: '#27ae60',
    textAlign: 'center',
    marginTop: width > 768 ? 8 : 6,
    fontWeight: '500',
  },
  imageInfoContainer: {
    alignItems: 'center',
    marginTop: width > 768 ? 8 : 6,
  },
  uploadStatus: {
    fontSize: width > 768 ? 11 : 10,
    color: '#27ae60',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  uploadError: {
    fontSize: width > 768 ? 11 : 10,
    color: '#f39c12',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default ImageUploader;