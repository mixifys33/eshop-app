// Import URL polyfill for React Native
import 'react-native-url-polyfill/auto';
import API_BASE from '../constants/api';

// Custom ImageKit implementation for React Native/Expo compatibility
class ImageKitWeb {
  constructor(config) {
    this.urlEndpoint = config.urlEndpoint;
    this.publicKey = config.publicKey;
    this.authenticationEndpoint = config.authenticationEndpoint;
  }

  // Generate ImageKit URL with transformations
  url(options) {
    const { src, path, transformation = [] } = options;
    
    let baseUrl;
    if (src) {
      baseUrl = src;
    } else if (path) {
      baseUrl = this.urlEndpoint + (path.startsWith('/') ? path : '/' + path);
    } else {
      throw new Error('Either src or path must be provided');
    }

    if (transformation.length === 0) {
      return baseUrl;
    }

    // Convert transformation array to ImageKit transformation string
    const transformationString = transformation.map(t => {
      return Object.entries(t).map(([key, value]) => {
        // Map common transformation names to ImageKit parameters
        const paramMap = {
          width: 'w',
          height: 'h',
          quality: 'q',
          format: 'f',
          crop: 'c',
          cropMode: 'cm',
          focus: 'fo',
          radius: 'r',
          background: 'bg',
          border: 'b',
          rotation: 'rt',
          blur: 'bl',
          grayscale: 'e-grayscale',
          progressive: 'pr',
          lossless: 'lo'
        };
        
        const param = paramMap[key] || key;
        return `${param}-${value}`;
      }).join(',');
    }).join(':');

    // Add transformation as query parameter
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}tr=${transformationString}`;
  }

  // Upload file to ImageKit
  async upload(options) {
    const {
      file,
      fileName,
      folder = '',
      useUniqueFileName = true,
      tags = [],
      ...otherOptions
    } = options;

    // Get authentication parameters
    const authResponse = await fetch(this.authenticationEndpoint);
    if (!authResponse.ok) {
      throw new Error('Failed to get authentication parameters');
    }
    const authData = await authResponse.json();

    // Prepare form data
    const formData = new FormData();
    
    // Convert file to blob if it's base64
    let fileBlob;
    if (typeof file === 'string' && file.startsWith('data:')) {
      // Convert base64 to blob
      const response = await fetch(file);
      fileBlob = await response.blob();
    } else if (typeof file === 'string') {
      // Assume it's base64 without data URL prefix
      const byteCharacters = atob(file);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      fileBlob = new Blob([byteArray], { type: 'image/jpeg' });
    } else {
      fileBlob = file;
    }

    formData.append('file', fileBlob, fileName);
    formData.append('fileName', fileName);
    formData.append('publicKey', this.publicKey);
    formData.append('signature', authData.signature);
    formData.append('expire', authData.expire);
    formData.append('token', authData.token);
    
    if (folder) {
      formData.append('folder', folder);
    }
    
    if (useUniqueFileName) {
      formData.append('useUniqueFileName', 'true');
    }
    
    if (tags.length > 0) {
      formData.append('tags', Array.isArray(tags) ? tags.join(',') : tags);
    }

    // Add other options
    Object.entries(otherOptions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    // Upload to ImageKit
    const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    return await uploadResponse.json();
  }

  // Delete file from ImageKit
  async deleteFile(fileId) {
    // This would typically require server-side implementation
    // as it needs private key authentication
    throw new Error('Delete operation must be performed server-side');
  }
}

// Initialize ImageKit with error handling
let imagekit;
try {
  imagekit = new ImageKitWeb({
    publicKey: "public_Wp2PajROZzbK4H5oQ1ZgvC6e6Uw=",
    urlEndpoint: "https://ik.imagekit.io/easyshop",
    authenticationEndpoint: `${API_BASE}/imagekit/auth`
  });
  console.log('✅ ImageKit service initialized successfully');
} catch (error) {
  console.error('ImageKit initialization error:', error);
  imagekit = null;
}

/**
 * Upload image to ImageKit
 * @param {Object} imageData - Image data with uri, fileName, etc.
 * @param {string} folder - Folder path in ImageKit (e.g., 'sellers/logos', 'products')
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result with URL and other metadata
 */
export const uploadToImageKit = async (imageData, folder = 'uploads', options = {}) => {
  try {
    if (!imageData || !imageData.uri) {
      throw new Error('Invalid image data provided');
    }

    // If ImageKit client is not available, use server-side upload
    if (!imagekit) {
      console.log('Using server-side upload (ImageKit client not available)');
      return await uploadViaServer(imageData, folder, options);
    }

    // Convert image to base64 if not already
    let base64Data = imageData.base64;
    if (!base64Data) {
      // If no base64, we need to fetch it from the URI
      const response = await fetch(imageData.uri);
      const blob = await response.blob();
      base64Data = await blobToBase64(blob);
    }

    // Remove data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log('Uploading to ImageKit:', {
      fileName: imageData.fileName || `image_${Date.now()}.jpg`,
      folder: folder,
      fileSize: Math.round(cleanBase64.length * 0.75) // Approximate file size
    });

    const result = await imagekit.upload({
      file: cleanBase64,
      fileName: imageData.fileName || `image_${Date.now()}.jpg`,
      folder: folder,
      useUniqueFileName: true,
      tags: options.tags || [],
      ...options
    });
    
    console.log('ImageKit upload successful:', {
      fileId: result.fileId,
      url: result.url,
      name: result.name
    });

    return {
      success: true,
      fileId: result.fileId,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      name: result.name,
      size: result.size,
      filePath: result.filePath,
      tags: result.tags,
      metadata: result.metadata
    };

  } catch (error) {
    console.error('ImageKit upload error:', error);
    
    // Try server-side upload as fallback
    try {
      console.log('Trying server-side upload as fallback...');
      const serverUploadResult = await uploadViaServer(imageData, folder, options);
      return serverUploadResult;
    } catch (serverError) {
      console.error('Server-side upload also failed:', serverError);
      return {
        success: false,
        error: error.message || 'Failed to upload image'
      };
    }
  }
};

/**
 * Fallback server-side upload
 * @param {Object} imageData - Image data
 * @param {string} folder - Folder path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadViaServer = async (imageData, folder, options) => {
  const response = await fetch(`${API_BASE}/imagekit/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: imageData.base64,
      fileName: imageData.fileName || `image_${Date.now()}.jpg`,
      folder: folder,
      tags: options.tags || []
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Server upload failed');
  }

  const result = await response.json();
  return result;
};

/**
 * Delete image from ImageKit
 * @param {string} fileId - ImageKit file ID
 * @returns {Promise<Object>} Delete result
 */
export const deleteFromImageKit = async (fileId) => {
  try {
    if (!imagekit) {
      // If client-side SDK not available, use server-side delete
      const response = await fetch(`${API_BASE}/imagekit/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Server delete failed');
      }

      return { success: true };
    }

    // Client-side delete is not supported with our custom implementation
    // Always use server-side delete for security
    const response = await fetch(`${API_BASE}/imagekit/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Server delete failed');
    }

    return { success: true };
  } catch (error) {
    console.error('ImageKit delete error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete image'
    };
  }
};

/**
 * Get optimized image URL with transformations
 * @param {string} url - Original ImageKit URL
 * @param {Object} transformations - ImageKit transformations
 * @returns {string} Optimized URL
 */
export const getOptimizedImageUrl = (url, transformations = {}) => {
  if (!url) return null;
  
  // If ImageKit client not available, return original URL
  if (!imagekit) {
    console.warn('ImageKit client not available, returning original URL');
    return url;
  }
  
  const defaultTransformations = {
    quality: 80,
    format: 'auto',
    ...transformations
  };

  try {
    return imagekit.url({
      src: url,
      transformation: [defaultTransformations]
    });
  } catch (error) {
    console.error('Error generating optimized URL:', error);
    return url; // Return original URL as fallback
  }
};

/**
 * Convert blob to base64
 * @param {Blob} blob - Blob object
 * @returns {Promise<string>} Base64 string
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default {
  uploadToImageKit,
  deleteFromImageKit,
  getOptimizedImageUrl
};