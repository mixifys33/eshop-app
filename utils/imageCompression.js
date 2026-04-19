import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

/**
 * Image compression utility - preserves original dimensions by default
 * 
 * This function compresses images to reduce file size while maintaining the original
 * width and height dimensions. It uses quality compression instead of resizing.
 * 
 * @param {string} imageUri - The URI of the image to compress
 * @param {Object} options - Compression options
 * @param {number} options.quality - Compression quality (0.0 to 1.0, default: 0.9)
 * @param {string} options.format - Output format (JPEG or PNG, default: JPEG)
 * @param {boolean} options.preserveOriginalDimensions - Keep original dimensions (default: true)
 * @param {number} options.maxWidth - Max width if resizing (only used if preserveOriginalDimensions is false)
 * @param {number} options.maxHeight - Max height if resizing (only used if preserveOriginalDimensions is false)
 * 
 * @returns {Object} Compressed image object with original dimensions preserved
 */
export const compressImage = async (imageUri, options = {}) => {
  const {
    quality = 0.9, // High quality to maintain image quality while reducing file size
    format = ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions = true, // New option to preserve dimensions
    maxWidth = null, // Only used if preserveOriginalDimensions is false
    maxHeight = null // Only used if preserveOriginalDimensions is false
  } = options;

  try {
    console.log('Compressing image:', imageUri);
    console.log('Compression options:', { quality, format, preserveOriginalDimensions });

    // Get original image info first
    const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    });

    console.log('Original image dimensions:', imageInfo.width, 'x', imageInfo.height);

    let manipulationActions = [];

    // Only resize if preserveOriginalDimensions is false and max dimensions are provided
    if (!preserveOriginalDimensions && (maxWidth || maxHeight)) {
      manipulationActions.push({
        resize: {
          width: maxWidth || imageInfo.width,
          height: maxHeight || imageInfo.height,
        },
      });
    }

    // Compress the image (this reduces file size without changing dimensions)
    const compressedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      manipulationActions, // Empty array means no resizing, just compression
      {
        compress: quality,
        format: format,
        base64: true, // Get base64 to calculate file size
      }
    );

    // Calculate file size from base64
    let fileSize = 0;
    if (compressedImage.base64) {
      fileSize = Math.round((compressedImage.base64.length * 3) / 4);
    }

    console.log('Image compressed successfully');
    console.log('Original dimensions:', imageInfo.width, 'x', imageInfo.height);
    console.log('Compressed dimensions:', compressedImage.width, 'x', compressedImage.height);
    console.log('Dimensions preserved:', compressedImage.width === imageInfo.width && compressedImage.height === imageInfo.height);
    console.log('Estimated file size:', fileSize, 'bytes');
    console.log('Quality setting:', quality);

    return {
      ...compressedImage,
      fileSize,
      originalWidth: imageInfo.width,
      originalHeight: imageInfo.height
    };
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to compress image');
  }
};

// Pick and compress image
export const pickAndCompressImage = async (options = {}) => {
  const {
    allowsEditing = true,
    aspect = [1, 1],
    quality = 1,
    mediaTypes = ImagePicker.MediaTypeOptions.Images,
    compressionOptions = {}
  } = options;

  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload images.',
        [{ text: 'OK' }]
      );
      return null;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing,
      aspect,
      quality,
      base64: false,
    });

    if (result.canceled) {
      return null;
    }

    const selectedImage = result.assets[0];
    console.log('Selected image:', selectedImage);

    // Compress the image
    const compressedImage = await compressImage(selectedImage.uri, compressionOptions);

    return {
      ...compressedImage,
      originalSize: selectedImage.fileSize,
      fileName: selectedImage.fileName || `image_${Date.now()}.jpg`,
      mimeType: selectedImage.mimeType || 'image/jpeg'
    };

  } catch (error) {
    console.error('Pick and compress image error:', error);
    Alert.alert('Error', 'Failed to pick and compress image. Please try again.');
    return null;
  }
};

// Specific compression presets
export const compressionPresets = {
  // For shop logos - preserve dimensions, high quality
  logo: {
    quality: 0.95,
    format: ImageManipulator.SaveFormat.PNG,
    preserveOriginalDimensions: true
  },
  
  // For shop banners - preserve dimensions, good quality
  banner: {
    quality: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions: true
  },
  
  // For product images - preserve dimensions, balanced quality
  product: {
    quality: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions: true
  },
  
  // For thumbnails - resize to small dimensions
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions: false // Only thumbnails should be resized
  },

  // High quality preset - minimal compression, preserve dimensions
  highQuality: {
    quality: 0.95,
    format: ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions: true
  },

  // Balanced preset - good compression while preserving dimensions
  balanced: {
    quality: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions: true
  }
};

// Helper to get file size in human readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Calculate compression ratio
export const getCompressionRatio = (originalSize, compressedSize) => {
  if (!originalSize || !compressedSize || originalSize === 0) return 0;
  
  // Ensure we don't get negative ratios
  if (compressedSize >= originalSize) return 0;
  
  const ratio = Math.round(((originalSize - compressedSize) / originalSize) * 100);
  return Math.max(0, Math.min(100, ratio)); // Clamp between 0 and 100
};

// Pick image with specific preset
export const pickImageWithPreset = async (presetName, customOptions = {}) => {
  const preset = compressionPresets[presetName];
  if (!preset) {
    throw new Error(`Unknown compression preset: ${presetName}`);
  }

  const options = {
    compressionOptions: { ...preset, ...customOptions },
    allowsEditing: true,
    aspect: presetName === 'banner' ? [3, 1] : [1, 1]
  };

  return await pickAndCompressImage(options);
};

// Compress image with preserved dimensions (convenience function)
export const compressImagePreserveDimensions = async (imageUri, quality = 0.9) => {
  return await compressImage(imageUri, {
    quality,
    format: ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions: true
  });
};

// Compress image for web use (smaller file size, preserved dimensions)
export const compressImageForWeb = async (imageUri, quality = 0.85) => {
  return await compressImage(imageUri, {
    quality,
    format: ImageManipulator.SaveFormat.JPEG,
    preserveOriginalDimensions: true
  });
};