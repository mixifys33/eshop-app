import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatFileSize } from '../utils/imageCompression';
import { uploadToImageKit } from '../services/imagekitService';

const { width } = Dimensions.get('window');

const ImagePlaceHolder = ({
  size = "765 x 850",
  small = false,
  onImageChange,
  pictureUploadingLoader = false,
  onRemove,
  defaultImage = null,
  index = 0,
  images = [],
  setSelectedImage,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [imagePreview, setImagePreview] = useState(defaultImage);
  const [localUploading, setLocalUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const compressionBadgeAnim = useRef(new Animated.Value(0)).current;

  // Sync preview with uploaded image
  useEffect(() => {
    if (images && images[index] && images[index]?.uri) {
      setImagePreview(images[index].uri);
      setLocalUploading(false);
      setImageError(false);
      
      // Animate compression badge if compression info is available
      if (images[index]?.compressionRatio) {
        Animated.sequence([
          Animated.timing(compressionBadgeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(compressionBadgeAnim, {
            toValue: 0.7,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else if (!images[index]) {
      setImagePreview(null);
      setImageError(false);
      compressionBadgeAnim.setValue(0);
    }
  }, [images, index]);

  const handleImagePicker = async () => {
    if (pictureUploadingLoader || localUploading) return;

    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1, // Use max quality - no compression
        base64: true, // Get base64 for file size calculation
      });

      if (!result.canceled) {
        setLocalUploading(true);
        const selectedImage = result.assets[0];
        
        // Show original image immediately
        setImagePreview(selectedImage.uri);
        
        try {
          // Calculate file size from base64 if not available
          let fileSize = selectedImage.fileSize || 0;
          if (!fileSize && selectedImage.base64) {
            fileSize = Math.round((selectedImage.base64.length * 3) / 4);
          }
          
          console.log(`Processing image: ${selectedImage.width} x ${selectedImage.height}, ${formatFileSize(fileSize)}`);

          // Create image data object
          const imageData = {
            uri: selectedImage.uri,
            width: selectedImage.width,
            height: selectedImage.height,
            base64: selectedImage.base64,
            fileSize: fileSize,
            fileName: selectedImage.fileName || `product_image_${Date.now()}.jpg`,
            mimeType: selectedImage.mimeType || 'image/jpeg',
            type: selectedImage.type || 'image'
          };

          // Upload to ImageKit
          const folder = 'products/images';
          const uploadResult = await uploadToImageKit(imageData, folder, {
            tags: ['product', 'mobile-upload']
          });

          let finalImage;
          if (uploadResult.success) {
            // Image successfully uploaded to ImageKit
            finalImage = {
              ...imageData,
              imagekitUrl: uploadResult.url,
              imagekitFileId: uploadResult.fileId,
              imagekitThumbnail: uploadResult.thumbnailUrl,
              // Also set the standard properties for compatibility
              url: uploadResult.url,
              fileId: uploadResult.fileId,
              thumbnailUrl: uploadResult.thumbnailUrl,
              uploaded: true
            };
            
            console.log('✅ Image uploaded to ImageKit:', uploadResult.fileId);
          } else {
            // Fallback to local image if ImageKit upload fails
            console.warn('ImageKit upload failed, using local image:', uploadResult.error);
            finalImage = {
              ...imageData,
              uploaded: false,
              uploadError: uploadResult.error
            };
          }

          onImageChange && onImageChange(finalImage, index);
        } catch (error) {
          console.error('Error processing image:', error);
          // Fallback to basic image object
          const basicImage = {
            uri: selectedImage.uri,
            width: selectedImage.width,
            height: selectedImage.height,
            base64: selectedImage.base64,
            fileSize: selectedImage.fileSize || 0,
            fileName: selectedImage.fileName || `product_image_${Date.now()}.jpg`,
            uploaded: false,
            uploadError: error.message
          };
          onImageChange && onImageChange(basicImage, index);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setLocalUploading(false);
    }
  };

  const canEnhance = Boolean(images[index] && images[index]?.uri);

  const handleEnhance = () => {
    if (!canEnhance || localUploading) return;
    
    const imageUrl = images[index]?.uri;
    if (imageUrl && setSelectedImage) {
      setSelectedImage(imageUrl, index);
    }
  };

  // Determine if currently uploading
  const showUploadingState = localUploading || (pictureUploadingLoader && imagePreview && !images[index]?.uri);

  const containerHeight = small ? 140 : 300;
  const containerWidth = small ? (width - 60) / 3 : width - 40;

  return (
    <View style={[
      styles.container,
      {
        height: containerHeight,
        width: containerWidth,
        borderColor: showUploadingState ? '#3498db' : '#666'
      }
    ]}>
      {/* Upload Loading Overlay with Progress */}
      {showUploadingState && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.progressContainer}>
            {/* Circular progress indicator */}
            <View style={[
              styles.progressCircle,
              { width: small ? 64 : 96, height: small ? 64 : 96 }
            ]}>
              <ActivityIndicator 
                size={small ? "small" : "large"} 
                color="#3498db" 
              />
            </View>
            <Text style={[
              styles.uploadingText,
              { fontSize: small ? 12 : 14 }
            ]}>
              {localUploading ? 'Optimizing image...' : `${uploadProgress}% Uploading`}
            </Text>
          </View>
          
          {/* Progress bar */}
          <View style={[
            styles.progressBar,
            { height: small ? 6 : 8 }
          ]}>
            <View 
              style={[
                styles.progressFill,
                { width: `${uploadProgress}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {imagePreview ? (
        <>
          {/* Action Buttons */}
          {!showUploadingState && (
            <View style={[
              styles.actionButtons,
              { top: small ? 8 : 12, right: small ? 8 : 12 }
            ]}>
              <TouchableOpacity
                style={[styles.actionButton, { padding: small ? 6 : 8 }]}
                onPress={handleImagePicker}
                disabled={pictureUploadingLoader || localUploading}
              >
                <Ionicons name="pencil" size={small ? 14 : 16} color="white" />
              </TouchableOpacity>

              {setSelectedImage && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.enhanceButton,
                    { padding: small ? 6 : 8 }
                  ]}
                  onPress={handleEnhance}
                  disabled={pictureUploadingLoader || !canEnhance || localUploading}
                >
                  <Ionicons name="color-wand" size={small ? 14 : 16} color="white" />
                </TouchableOpacity>
              )}

              {onRemove && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.removeButton,
                    { padding: small ? 6 : 8 }
                  ]}
                  onPress={() => onRemove(index)}
                  disabled={pictureUploadingLoader || localUploading}
                >
                  <Ionicons name="close" size={small ? 14 : 16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {!imageError ? (
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={!showUploadingState ? handleEnhance : undefined}
              disabled={showUploadingState}
            >
              <Image
                source={{ uri: imagePreview }}
                style={[
                  styles.image,
                  { opacity: showUploadingState ? 0.4 : 1 }
                ]}
                onError={() => {
                  setImageError(true);
                  Alert.alert('Error', 'Image failed to load. It may have been deleted.');
                }}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="image-outline" size={small ? 24 : 40} color="#666" />
              <Text style={[
                styles.errorText,
                { fontSize: small ? 12 : 14 }
              ]}>
                Image unavailable
              </Text>
              <TouchableOpacity onPress={handleImagePicker}>
                <Text style={[
                  styles.retryText,
                  { fontSize: small ? 11 : 12 }
                ]}>
                  Upload new image
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Compression info badge */}
          {images[index]?.compressionRatio && !showUploadingState && (
            <Animated.View style={[
              styles.compressionBadge,
              {
                top: small ? 8 : 12,
                left: small ? 8 : 12,
                paddingHorizontal: small ? 4 : 6,
                paddingVertical: small ? 2 : 3,
                opacity: compressionBadgeAnim,
                transform: [{
                  scale: compressionBadgeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }]
              }
            ]}>
              <Text style={[
                styles.compressionText,
                { fontSize: small ? 9 : 10 }
              ]}>
                -{images[index].compressionRatio}%
              </Text>
            </Animated.View>
          )}

          {/* Upload status badge */}
          {images[index] && !showUploadingState && (
            <View style={[
              styles.uploadStatusBadge,
              {
                bottom: small ? 6 : 8,
                right: small ? 6 : 8,
                paddingHorizontal: small ? 4 : 6,
                paddingVertical: small ? 2 : 3,
                backgroundColor: images[index].uploaded ? 'rgba(39, 174, 96, 0.9)' : 'rgba(243, 156, 18, 0.9)'
              }
            ]}>
              <Text style={[
                styles.uploadStatusText,
                { fontSize: small ? 8 : 9 }
              ]}>
                {images[index].uploaded ? '☁️ Uploaded' : '📱 Local'}
              </Text>
            </View>
          )}

          {/* Slot number badge */}
          <View style={[
            styles.slotBadge,
            {
              bottom: small ? 6 : 8,
              left: small ? 6 : 8,
              paddingHorizontal: small ? 6 : 8,
              paddingVertical: small ? 2 : 4
            }
          ]}>
            <Text style={[
              styles.slotText,
              { fontSize: small ? 10 : 12 }
            ]}>
              {index === 0 ? 'Main' : `#${index + 1}`}
            </Text>
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleImagePicker}
          disabled={localUploading}
        >
          <View style={[
            styles.uploadIcon,
            { padding: small ? 8 : 12 }
          ]}>
            <Ionicons 
              name="camera" 
              size={small ? 20 : 32} 
              color="#666" 
            />
          </View>
          <Text style={[
            styles.uploadMainText,
            { fontSize: small ? 12 : 16 }
          ]}>
            {index === 0 ? 'Main Image' : `Image ${index + 1}`}
          </Text>
          <Text style={[
            styles.uploadSubText,
            { fontSize: small ? 10 : 12 }
          ]}>
            {small ? 'Tap to upload' : size}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadingText: {
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 16,
  },
  progressBar: {
    width: '75%',
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  actionButtons: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  enhanceButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.9)',
  },
  removeButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  errorText: {
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
  },
  retryText: {
    color: '#3498db',
  },
  slotBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 6,
  },
  slotText: {
    color: '#ccc',
    fontWeight: '500',
  },
  compressionBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(39, 174, 96, 0.9)',
    borderRadius: 4,
    zIndex: 5,
  },
  compressionText: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadStatusBadge: {
    position: 'absolute',
    borderRadius: 4,
    zIndex: 5,
  },
  uploadStatusText: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 8,
  },
  uploadMainText: {
    color: '#ccc',
    fontWeight: '500',
    marginBottom: 4,
  },
  uploadSubText: {
    color: '#666',
  },
});

export default ImagePlaceHolder;