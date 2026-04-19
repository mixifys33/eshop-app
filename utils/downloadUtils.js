import { Platform, Alert, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Cross-platform file download utility
 * Handles both web and native mobile downloads
 */
export const downloadFile = async (url, fileName, options = {}) => {
  try {
    if (Platform.OS === 'web') {
      // Web download using fetch and blob
      const response = await fetch(url, {
        method: 'GET',
        headers: options.headers || {},
      });
      
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create download link for web
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return {
        success: true,
        message: 'File downloaded successfully!',
        platform: 'web'
      };
      
    } else {
      // Native mobile download using FileSystem
      const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!docDir) {
        throw new Error('Document directory not available on this platform');
      }
      const fileUri = docDir + fileName;
      
      const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
        headers: options.headers || {},
      });
      
      if (downloadResult.status === 200) {
        // Verify file was actually downloaded
        const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
        
        if (!fileInfo.exists) {
          throw new Error('File was not saved properly');
        }
        
        if (fileInfo.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        return {
          success: true,
          message: 'File downloaded successfully!',
          platform: 'native',
          fileInfo,
          uri: downloadResult.uri
        };
        
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    }
    
  } catch (error) {
    // Provide more specific error messages
    let errorMessage = 'Failed to download file';
    if (error.message.includes('Network request failed')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (error.message.includes('500')) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.message.includes('404')) {
      errorMessage = 'File not found. Please contact support.';
    } else if (error.message.includes('UnavailabilityError')) {
      errorMessage = 'Download feature not available on this platform.';
    } else {
      errorMessage = `Download failed: ${error.message}`;
    }
    
    return {
      success: false,
      error: errorMessage,
      originalError: error
    };
  }
};

/**
 * Show native file location alert (mobile only)
 */
export const showFileLocationAlert = (fileName, fileSize) => {
  if (Platform.OS === 'web') {
    return; // No need for alert on web
  }
  
  const fileSizeKB = Math.round(fileSize / 1024);
  
  Alert.alert(
    'File Downloaded Successfully!',
    `File: ${fileName}\nSize: ${fileSizeKB} KB\n\nThe file has been saved to your app's documents folder. You can access it through your device's file manager or by using the "Files" app.`,
    [
      {
        text: 'Open File Location',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('shareddocuments://');
          } else {
            // On Android, we can't directly open file manager to specific location
            Alert.alert('Info', 'Please check your device\'s file manager under the app documents folder.');
          }
        }
      },
      { text: 'OK', style: 'default' }
    ]
  );
};