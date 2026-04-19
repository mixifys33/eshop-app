import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Modal,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImagePlaceHolder from '../components/ImagePlaceHolder';
import RichTextEditor from '../components/RichTextEditor';
import CurrencySelector from '../components/CurrencySelector';
import CategorySelector from '../components/CategorySelector';
import SubCategorySelector from '../components/SubCategorySelector';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { formatFileSize } from '../utils/imageCompression';
import API_BASE from '../constants/api';

const { width, height } = Dimensions.get('window');

const CreateProduct = ({ navigation }) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    detailedDescription: '',
    tags: '',
    warranty: '',
    slug: '',
    brand: '',
    category: '',
    subCategory: '',
    regularPrice: '',
    salePrice: '',
    stock: '',
    videoUrl: '',
    cashOnDelivery: 'Yes'
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [images, setImages] = useState([null]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [customSpecs, setCustomSpecs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [currency, setCurrency] = useState('UGX');
  const [errors, setErrors] = useState({});

  // Modal states
  const [showInfoModal, setShowInfoModal] = useState({ visible: false, type: '', content: '' });

  // Toast hook
  const { toast, showSuccess, showError, showWarning, showInfo: showToast, hideToast } = useToast();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    startAnimations();
    fetchCategories();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  };
  const fetchCategories = async () => {
    try {
      // For React Native, we'll use the backend API directly
      const BACKEND_URL = API_BASE.replace('/api', ''); // Adjust this to your backend URL
      const response = await fetch(`${API_BASE}/categories`);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories || []);
        setSubCategories(data.subCategories || {});
      } else {
        // Fallback to default categories
        setCategories(['Electronics', 'Fashion', 'Home & Garden', 'Health & Beauty', 'Sports & Outdoors', 'Automotive', 'Food & Beverages', 'Office Supplies', 'Industrial', 'Agriculture']);
        setSubCategories({
          'Electronics': ['Phones', 'Laptops', 'Tablets', 'Accessories', 'Gaming', 'Audio & Video'],
          'Fashion': ['Men\'s Clothing', 'Women\'s Clothing', 'Shoes', 'Bags', 'Jewelry', 'Watches'],
          'Home & Garden': ['Furniture', 'Kitchen', 'Bedding', 'Decor', 'Garden Tools', 'Lighting'],
          'Health & Beauty': ['Skincare', 'Makeup', 'Hair Care', 'Personal Care', 'Supplements', 'Medical'],
          'Sports & Outdoors': ['Fitness', 'Camping', 'Cycling', 'Team Sports', 'Water Sports', 'Winter Sports'],
          'Automotive': ['Car Parts', 'Accessories', 'Tools', 'Oils & Fluids', 'Tires', 'Electronics'],
          'Food & Beverages': ['Snacks', 'Beverages', 'Groceries', 'Organic', 'Frozen', 'Dairy'],
          'Office Supplies': ['Stationery', 'Furniture', 'Electronics', 'Storage', 'Paper', 'Writing'],
          'Industrial': ['Tools', 'Safety Equipment', 'Raw Materials', 'Machinery', 'Electrical', 'Plumbing'],
          'Agriculture': ['Seeds', 'Fertilizers', 'Equipment', 'Livestock', 'Irrigation', 'Pesticides']
        });
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to default categories
      setCategories(['Electronics', 'Fashion', 'Home & Garden', 'Health & Beauty', 'Sports & Outdoors', 'Automotive', 'Food & Beverages', 'Office Supplies', 'Industrial', 'Agriculture']);
      setSubCategories({
        'Electronics': ['Phones', 'Laptops', 'Tablets', 'Accessories', 'Gaming', 'Audio & Video'],
        'Fashion': ['Men\'s Clothing', 'Women\'s Clothing', 'Shoes', 'Bags', 'Jewelry', 'Watches'],
        'Home & Garden': ['Furniture', 'Kitchen', 'Bedding', 'Decor', 'Garden Tools', 'Lighting'],
        'Health & Beauty': ['Skincare', 'Makeup', 'Hair Care', 'Personal Care', 'Supplements', 'Medical'],
        'Sports & Outdoors': ['Fitness', 'Camping', 'Cycling', 'Team Sports', 'Water Sports', 'Winter Sports'],
        'Automotive': ['Car Parts', 'Accessories', 'Tools', 'Oils & Fluids', 'Tires', 'Electronics'],
        'Food & Beverages': ['Snacks', 'Beverages', 'Groceries', 'Organic', 'Frozen', 'Dairy'],
        'Office Supplies': ['Stationery', 'Furniture', 'Electronics', 'Storage', 'Paper', 'Writing'],
        'Industrial': ['Tools', 'Safety Equipment', 'Raw Materials', 'Machinery', 'Electrical', 'Plumbing'],
        'Agriculture': ['Seeds', 'Fertilizers', 'Equipment', 'Livestock', 'Irrigation', 'Pesticides']
      });
    }
  };

  const handleImagePicker = async (imageData, index) => {
    try {
      const newImages = [...images];
      newImages[index] = imageData;
      
      // Add new placeholder if needed
      if (index === images.length - 1 && images.length < 8) {
        newImages.push(null);
      }
      
      setImages(newImages);
      
      // Log compression info if available and show toast
      if (imageData?.compressionRatio) {
        console.log(`✅ Image ${index + 1} compressed: ${imageData.compressionRatio}% size reduction`);
        if (imageData.originalSize && imageData.fileSize) {
          console.log(`📊 Size: ${formatFileSize(imageData.originalSize)} → ${formatFileSize(imageData.fileSize)}`);
          console.log(`📐 Dimensions: ${imageData.width} x ${imageData.height} (preserved)`);
          showSuccess(`Image compressed: ${imageData.compressionRatio}% size reduction (dimensions preserved)`, 3000);
        }
      }
    } catch (error) {
      console.error('Error handling image:', error);
      showError('Failed to process image');
    }
  };

  const removeImage = async (index) => {
    try {
      const imageToRemove = images[index];
      
      if (!imageToRemove) {
        console.log('No image to remove at index:', index);
        return;
      }
      
      // Show confirmation dialog for uploaded images
      if (imageToRemove.imagekitFileId || imageToRemove.fileId || imageToRemove.uploaded) {
        Alert.alert(
          'Remove Image',
          'Are you sure you want to remove this image? This action cannot be undone.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => performImageRemoval(index, imageToRemove)
            }
          ]
        );
      } else {
        // For local images, remove immediately
        performImageRemoval(index, imageToRemove);
      }
      
    } catch (error) {
      console.error('Error in removeImage:', error);
      showError('Failed to remove image. Please try again.');
    }
  };

  const performImageRemoval = async (index, imageToRemove) => {
    try {
      console.log('Removing image at index:', index, 'Image data:', {
        hasImagekitFileId: !!(imageToRemove.imagekitFileId || imageToRemove.fileId),
        hasImagekitUrl: !!(imageToRemove.imagekitUrl || imageToRemove.url),
        fileName: imageToRemove.fileName,
        uploaded: imageToRemove.uploaded
      });
      
      // If image was uploaded to ImageKit, delete it from ImageKit
      if (imageToRemove.imagekitFileId || imageToRemove.fileId) {
        const fileIdToDelete = imageToRemove.imagekitFileId || imageToRemove.fileId;
        
        try {
          showToast('Removing image from cloud...', 2000);
          console.log('Deleting from ImageKit:', fileIdToDelete);
          
          const deleteResponse = await fetch(`${API_BASE}/imagekit/delete/${fileIdToDelete}`, {
            method: 'DELETE'
          });
          
          if (deleteResponse.ok) {
            const deleteResult = await deleteResponse.json();
            console.log('✅ Image deleted from ImageKit:', deleteResult);
            showToast('Image removed from cloud storage', 1500);
          } else {
            const errorData = await deleteResponse.json();
            console.warn('⚠️ Failed to delete image from ImageKit:', errorData);
            
            // If it's a 404 (not found), that's okay - image might already be deleted
            if (deleteResponse.status === 404) {
              console.log('Image was already deleted from ImageKit');
            } else {
              showWarning('Image removed locally but may still exist in cloud storage');
            }
          }
        } catch (deleteError) {
          console.warn('Error deleting image from ImageKit:', deleteError);
          showWarning('Image removed locally but cloud deletion failed');
          // Continue with removal even if ImageKit deletion fails
        }
      } else {
        console.log('Image not uploaded to ImageKit, removing locally only');
      }
      
      // Remove the image from the array
      const newImages = [...images];
      
      // If this is the only image, replace with null placeholder
      if (newImages.length === 1) {
        newImages[0] = null;
        console.log('Replaced single image with null placeholder');
      } else {
        // Remove the specific image
        newImages.splice(index, 1);
        console.log('Removed image at index:', index, 'New length:', newImages.length);
        
        // Ensure we always have at least one placeholder at the end
        if (!newImages.includes(null) && newImages.length < 8) {
          newImages.push(null);
          console.log('Added null placeholder at end');
        }
      }
      
      setImages(newImages);
      showSuccess('Image removed successfully', 1500);
      
    } catch (error) {
      console.error('Error removing image:', error);
      showError('Failed to remove image. Please try again.');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.subCategory) newErrors.subCategory = 'Subcategory is required';
    if (!formData.regularPrice) newErrors.regularPrice = 'Regular price is required';
    if (!formData.salePrice) newErrors.salePrice = 'Sale price is required';
    if (!formData.stock) newErrors.stock = 'Stock is required';

    // Validate prices
    if (formData.regularPrice && formData.salePrice) {
      const regular = parseFloat(formData.regularPrice);
      const sale = parseFloat(formData.salePrice);
      if (sale >= regular) {
        newErrors.salePrice = 'Sale price must be less than regular price';
      }
    }

    // Validate images
    const validImages = images.filter(img => img !== null);
    if (validImages.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    setErrors(newErrors);
    
    // Show toast for first validation error
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showWarning(firstError);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const validateImages = (imageArray) => {
    for (let i = 0; i < imageArray.length; i++) {
      const image = imageArray[i];
      if (!image) continue;
      
      // Check if image has base64 data that's too large
      if (image.base64 && image.base64.length > 1000000) { // 1MB limit for base64
        throw new Error(`Image ${i + 1} is too large. Please compress the image or use a smaller file.`);
      }
      
      // Check if image is uploaded to ImageKit
      if (!(image.imagekitUrl || image.url) && !image.base64) {
        throw new Error(`Image ${i + 1} is not properly processed. Please re-select the image.`);
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showError('Please fix the validation errors and try again');
      return;
    }

    // Validate images before processing
    try {
      const validImages = images.filter(img => img !== null);
      validateImages(validImages);
    } catch (imageError) {
      showError(imageError.message);
      return;
    }

    showToast('Creating product...', 2000);
    setLoading(true);
    
    try {
      // Get current seller from AsyncStorage
      const sellerData = await AsyncStorage.getItem('currentSeller');
      if (!sellerData) {
        showError('Please log in as a seller to create products');
        return;
      }
      
      const seller = JSON.parse(sellerData);
      
      // Upload images to ImageKit first
      showToast('Uploading images...', 3000);
      const uploadedImages = [];
      const validImages = images.filter(img => img !== null);
      
      for (let i = 0; i < validImages.length; i++) {
        const image = validImages[i];
        
        // Skip if image is already uploaded to ImageKit
        if ((image.imagekitUrl || image.url) && image.uploaded) {
          uploadedImages.push({
            url: image.imagekitUrl || image.url,
            fileId: image.imagekitFileId || image.fileId,
            thumbnailUrl: image.imagekitThumbnail || image.thumbnailUrl,
            fileName: image.fileName,
            uploaded: true
          });
          continue;
        }
        
        // Upload image to ImageKit
        try {
          showToast(`Uploading image ${i + 1} of ${validImages.length}...`, 2000);
          
          const uploadResponse = await fetch(`${API_BASE}/imagekit/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file: image.base64,
              fileName: image.fileName || `product_image_${Date.now()}_${i}.jpg`,
              folder: 'products/images',
              tags: ['product', 'image']
            })
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload image ${i + 1}`);
          }
          
          const uploadResult = await uploadResponse.json();
          
          uploadedImages.push({
            url: uploadResult.url,
            fileId: uploadResult.fileId,
            thumbnailUrl: uploadResult.thumbnailUrl,
            fileName: uploadResult.name,
            uploaded: true
          });
          
        } catch (uploadError) {
          console.error(`Error uploading image ${i + 1}:`, uploadError);
          showError(`Failed to upload image ${i + 1}. Please try again.`);
          setLoading(false);
          return;
        }
      }
      
      // Prepare product data with uploaded image URLs
      const productData = {
        ...formData,
        images: uploadedImages,
        colors,
        sizes,
        customSpecs,
        currency,
        regularPrice: parseFloat(formData.regularPrice),
        salePrice: parseFloat(formData.salePrice),
        stock: parseInt(formData.stock),
        sellerId: seller._id || seller.id
      };

      console.log('Creating product with data:');
      console.log('- Title:', productData.title);
      console.log('- Description:', productData.description);
      console.log('- Category:', productData.category);
      console.log('- SubCategory:', productData.subCategory);
      console.log('- Regular Price:', productData.regularPrice);
      console.log('- Sale Price:', productData.salePrice);
      console.log('- Stock:', productData.stock);
      console.log('- Seller ID:', productData.sellerId);
      console.log('- Images count:', productData.images.length);
      console.log('- Uploaded images:', productData.images.map(img => ({ url: img.url, fileName: img.fileName })));
      
      // API call to create product
      showToast('Saving product details...', 2000);
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });

      console.log('Product creation response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Product creation error details:');
        console.error('- Status:', response.status);
        console.error('- Error data:', errorData);
        console.error('- Error message:', errorData.message);
        
        // Parse validation errors if available
        if (errorData.message && errorData.message.includes('validation failed')) {
          const validationErrors = errorData.message.split(',').map(err => err.trim());
          console.error('- Validation errors:', validationErrors);
        }
        
        showError(errorData.message || 'Failed to create product');
        return;
      }

      const result = await response.json();
      console.log('Product created successfully:', result);
      
      showSuccess(`Product "${result.product.title}" created successfully! 🎉`, 4000);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          title: '', description: '', detailedDescription: '', tags: '',
          warranty: '', slug: '', brand: '', category: '', subCategory: '',
          regularPrice: '', salePrice: '', stock: '', videoUrl: '', cashOnDelivery: 'Yes'
        });
        setImages([null]);
        setColors([]);
        setSizes([]);
        setCustomSpecs([]);
        setErrors({});
        
        // Navigate to products list to view the created product
        showToast('Product created successfully! Redirecting to products...', 2000);
        setTimeout(() => {
          navigation.navigate('AllProducts');
        }, 2000);
      }, 1000);
      
    } catch (error) {
      console.error('Error creating product:', error);
      if (error.message.includes('fetch')) {
        showError('Network error. Please check your internet connection and ensure the server is running.');
      } else if (error.message.includes('upload')) {
        showError('Failed to upload images. Please check your images and try again.');
      } else {
        showError('Failed to create product. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = async () => {
    console.log('Save as Draft button clicked');
    console.log('Current form data:', formData);
    console.log('Current images:', images);
    
    // Basic validation for draft - only require title
    if (!formData.title.trim()) {
      showWarning('Please enter a product title to save as draft');
      return;
    }

    showToast('Saving draft...', 2000);
    setSavingDraft(true);
    
    try {
      // Get current seller from AsyncStorage
      const sellerData = await AsyncStorage.getItem('currentSeller');
      if (!sellerData) {
        showError('Please log in as a seller to save drafts');
        return;
      }
      
      const seller = JSON.parse(sellerData);
      
      // First test if backend is reachable
      const BACKEND_URL = API_BASE.replace('/api', '');
      console.log('Testing backend connection...');
      
      try {
        const healthResponse = await fetch(`${API_BASE}/health`);
        console.log('Health check response:', healthResponse.status);
        if (!healthResponse.ok) {
          throw new Error('Backend server not reachable');
        }
        const healthData = await healthResponse.json();
        console.log('Health check data:', healthData);
      } catch (healthError) {
        console.error('Backend health check failed:', healthError);
        showError('Cannot connect to backend server. Please make sure the server is running on port 3000.');
        return;
      }

      // Prepare draft data (don't include large base64 images in drafts)
      const processedImages = images.filter(img => img !== null).map(img => {
        if ((img.imagekitUrl || img.url) && img.uploaded) {
          // Image already uploaded to ImageKit
          return {
            url: img.imagekitUrl || img.url,
            fileId: img.imagekitFileId || img.fileId,
            thumbnailUrl: img.imagekitThumbnail || img.thumbnailUrl,
            fileName: img.fileName,
            uploaded: true
          };
        } else {
          // For drafts, just save metadata without base64
          return {
            fileName: img.fileName,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
            uploaded: false,
            isDraft: true
          };
        }
      });

      const draftData = {
        ...formData,
        images: processedImages,
        colors,
        sizes,
        customSpecs,
        currency,
        regularPrice: formData.regularPrice ? parseFloat(formData.regularPrice) : 0,
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : 0,
        stock: formData.stock ? parseInt(formData.stock) : 0,
        sellerId: seller._id || seller.id,
        isDraft: true,
        draftExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
      };

      console.log('Saving draft with data:', {
        ...draftData,
        images: `${draftData.images.length} images`
      });
      
      // API call to save draft
      const apiUrl = `${API_BASE}/products/draft`;
      console.log('Making API call to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData)
      });

      console.log('API Response status:', response.status);
      console.log('API Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error response:', errorData);
        showError(errorData.message || `Failed to save draft: ${response.status}`);
        return;
      }

      const result = await response.json();
      console.log('API Success response:', result);
      
      showSuccess(`Draft saved successfully! Draft ID: ${result.draft?.id || 'Unknown'}. Drafts expire after 14 days.`, 4000);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      if (error.message.includes('fetch')) {
        showError('Network error. Please check your internet connection.');
      } else {
        showError(`Failed to save draft: ${error.message}`);
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const openInfoModal = (type, content) => {
    setShowInfoModal({ visible: true, type, content });
  };

  const InfoModal = () => (
    <Modal
      visible={showInfoModal.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowInfoModal({ visible: false, type: '', content: '' })}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[
          styles.infoModal,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>{showInfoModal.type}</Text>
            <TouchableOpacity
              onPress={() => setShowInfoModal({ visible: false, type: '', content: '' })}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.infoContent}>
            <Text style={styles.infoText}>{showInfoModal.content}</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
  const renderImageUploader = () => (
    <View style={styles.imageSection}>
      <Text style={styles.sectionTitle}>Product Images *</Text>
      <Text style={styles.sectionSubtitle}>Upload up to 8 high-quality images</Text>
      
      <View style={styles.imageGrid}>
        {/* Main Image */}
        <ImagePlaceHolder
          size="765 x 850"
          small={false}
          images={images}
          index={0}
          onImageChange={handleImagePicker}
          onRemove={removeImage}
          pictureUploadingLoader={loading}
          uploadProgress={0}
        />
        
        {/* Additional Images */}
        <View style={styles.additionalImages}>
          {images.slice(1).map((_, index) => (
            <ImagePlaceHolder
              key={index + 1}
              size="765 x 850"
              small={true}
              images={images}
              index={index + 1}
              onImageChange={handleImagePicker}
              onRemove={removeImage}
              pictureUploadingLoader={loading}
              uploadProgress={0}
            />
          ))}
        </View>
      </View>
      
      {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
    </View>
  );

  const renderColorSelector = () => {
    const defaultColors = [
      '#FF0000', '#FF7F00', '#FFD700', '#00FF00', 
      '#0000FF', '#800080', '#FFC0CB', '#000000', '#FFFFFF'
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Colors</Text>
        <View style={styles.colorGrid}>
          {defaultColors.map((color, index) => {
            const isSelected = colors.includes(color);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  isSelected && styles.selectedColor,
                  color === '#FFFFFF' && styles.whiteColorBorder
                ]}
                onPress={() => {
                  if (isSelected) {
                    setColors(colors.filter(c => c !== color));
                  } else {
                    setColors([...colors, color]);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderSizeSelector = () => {
    const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sizes</Text>
        <View style={styles.sizeGrid}>
          {availableSizes.map((size) => {
            const isSelected = sizes.includes(size);
            return (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeOption,
                  isSelected && styles.selectedSize
                ]}
                onPress={() => {
                  if (isSelected) {
                    setSizes(sizes.filter(s => s !== size));
                  } else {
                    setSizes([...sizes, size]);
                  }
                }}
              >
                <Text style={[
                  styles.sizeText,
                  isSelected && styles.selectedSizeText
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCustomSpecs = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Custom Specifications</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setCustomSpecs([...customSpecs, { name: '', value: '' }])}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Spec</Text>
        </TouchableOpacity>
      </View>
      
      {customSpecs.map((spec, index) => (
        <View key={index} style={styles.specRow}>
          <TextInput
            style={[styles.input, styles.specInput]}
            placeholder="Specification name"
            placeholderTextColor="#666"
            value={spec.name}
            onChangeText={(text) => {
              const newSpecs = [...customSpecs];
              newSpecs[index].name = text;
              setCustomSpecs(newSpecs);
            }}
          />
          <TextInput
            style={[styles.input, styles.specInput]}
            placeholder="Value"
            placeholderTextColor="#666"
            value={spec.value}
            onChangeText={(text) => {
              const newSpecs = [...customSpecs];
              newSpecs[index].value = text;
              setCustomSpecs(newSpecs);
            }}
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => {
              const newSpecs = customSpecs.filter((_, i) => i !== index);
              setCustomSpecs(newSpecs);
            }}
          >
            <Ionicons name="trash" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
  const isDesktop = width > 1024;

  const renderLeftColumn = () => (
    <View style={isDesktop ? styles.leftColumn : null}>
      {/* Image Upload Section */}
      {renderImageUploader()}

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        {/* Product Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Enter product title"
            placeholderTextColor="#666"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Short Description *</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="Brief product description (max 150 words)"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Tags */}
        <View style={styles.inputGroup}>
          <View style={styles.labelWithInfo}>
            <Text style={styles.label}>Tags *</Text>
            <TouchableOpacity
              onPress={() => openInfoModal('Tags', 'Tags are keywords that help customers find your product. Use relevant words separated by commas. Example: smartphone, android, 5G, camera')}
            >
              <Ionicons name="information-circle-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, errors.tags && styles.inputError]}
            placeholder="smartphone, electronics, mobile"
            placeholderTextColor="#666"
            value={formData.tags}
            onChangeText={(text) => setFormData({ ...formData, tags: text })}
          />
          {errors.tags && <Text style={styles.errorText}>{errors.tags}</Text>}
        </View>

        {/* Warranty */}
        <View style={styles.inputGroup}>
          <View style={styles.labelWithInfo}>
            <Text style={styles.label}>Warranty *</Text>
            <TouchableOpacity
              onPress={() => openInfoModal('Warranty', 'Warranty period tells customers how long the product is guaranteed. Examples: "1 year", "6 months", "No warranty"')}
            >
              <Ionicons name="information-circle-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, errors.warranty && styles.inputError]}
            placeholder="1 year / No warranty"
            placeholderTextColor="#666"
            value={formData.warranty}
            onChangeText={(text) => setFormData({ ...formData, warranty: text })}
          />
          {errors.warranty && <Text style={styles.errorText}>{errors.warranty}</Text>}
        </View>

        {/* Brand */}
        <View style={styles.inputGroup}>
          <View style={styles.labelWithInfo}>
            <Text style={styles.label}>Brand</Text>
            <TouchableOpacity
              onPress={() => openInfoModal('Brand', 'The company or manufacturer that makes your product. Examples: Apple, Samsung, Nike, Sony')}
            >
              <Ionicons name="information-circle-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Apple, Samsung, etc."
            placeholderTextColor="#666"
            value={formData.brand}
            onChangeText={(text) => setFormData({ ...formData, brand: text })}
          />
        </View>

        {/* Detailed Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Detailed Description * (min 100 words)</Text>
          <RichTextEditor
            value={formData.detailedDescription}
            onChange={(text) => setFormData({ ...formData, detailedDescription: text })}
            placeholder="Write a comprehensive product description with features, benefits, and specifications..."
          />
          {errors.detailedDescription && <Text style={styles.errorText}>{errors.detailedDescription}</Text>}
        </View>
      </View>
    </View>
  );

  const renderRightColumn = () => (
    <View style={isDesktop ? styles.rightColumn : null}>
      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category & Classification</Text>
        
        {/* Category */}
        <CategorySelector
          categories={categories}
          value={formData.category}
          onChange={(category) => {
            setFormData({ ...formData, category, subCategory: '' });
            setErrors({ ...errors, category: null });
          }}
          label="Category"
          placeholder="Select or enter category"
          required={true}
          allowCustom={true}
        />
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

        {/* Subcategory */}
        <SubCategorySelector
          subCategories={formData.category ? (subCategories[formData.category] || []) : []}
          value={formData.subCategory}
          onChange={(subCategory) => {
            setFormData({ ...formData, subCategory });
            setErrors({ ...errors, subCategory: null });
          }}
          label="Subcategory"
          placeholder="Select or enter subcategory"
          required={true}
          allowCustom={true}
          disabled={!formData.category}
        />
        {errors.subCategory && <Text style={styles.errorText}>{errors.subCategory}</Text>}
      </View>

      {/* Colors and Sizes */}
      {renderColorSelector()}
      {renderSizeSelector()}

      {/* Custom Specifications */}
      {renderCustomSpecs()}

      {/* Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing & Stock</Text>
        
        {/* Currency */}
        <CurrencySelector
          value={currency}
          onChange={setCurrency}
          label="Product Currency"
          placeholder="Select currency for this product"
          required={true}
        />

        {/* Regular Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Regular Price ({currency}) *</Text>
          <TextInput
            style={[styles.input, errors.regularPrice && styles.inputError]}
            placeholder={currency === 'UGX' ? '35000' : '45.99'}
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={formData.regularPrice}
            onChangeText={(text) => setFormData({ ...formData, regularPrice: text })}
          />
          {errors.regularPrice && <Text style={styles.errorText}>{errors.regularPrice}</Text>}
        </View>

        {/* Sale Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sale Price ({currency}) *</Text>
          <TextInput
            style={[styles.input, errors.salePrice && styles.inputError]}
            placeholder={currency === 'UGX' ? '29900' : '39.99'}
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={formData.salePrice}
            onChangeText={(text) => setFormData({ ...formData, salePrice: text })}
          />
          {errors.salePrice && <Text style={styles.errorText}>{errors.salePrice}</Text>}
        </View>

        {/* Stock */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Stock Quantity *</Text>
          <TextInput
            style={[styles.input, errors.stock && styles.inputError]}
            placeholder="47"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={formData.stock}
            onChangeText={(text) => setFormData({ ...formData, stock: text })}
          />
          {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
        </View>
      </View>

      {/* Additional Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Options</Text>
        
        {/* Cash on Delivery */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cash on Delivery *</Text>
          <View style={styles.toggleRow}>
            {['Yes', 'No'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.toggleOption,
                  formData.cashOnDelivery === option && styles.selectedToggle
                ]}
                onPress={() => setFormData({ ...formData, cashOnDelivery: option })}
              >
                <Text style={[
                  styles.toggleText,
                  formData.cashOnDelivery === option && styles.selectedToggleText
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Video URL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Video URL (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://www.youtube.com/watch?v=xyz123"
            placeholderTextColor="#666"
            value={formData.videoUrl}
            onChangeText={(text) => setFormData({ ...formData, videoUrl: text })}
          />
        </View>
      </View>

      {/* Submit Buttons */}
      <View style={styles.submitSection}>
        <View style={styles.submitButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.draftSubmitButton, 
              (loading || savingDraft) && styles.disabledButton,
              isDesktop && styles.desktopSubmitButton
            ]}
            onPress={() => {
              console.log('Draft button pressed!');
              handleSaveAsDraft();
            }}
            disabled={loading || savingDraft}
          >
            {savingDraft ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="document-outline" size={24} color="white" />
                <Text style={styles.submitButtonText}>Save as Draft</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton, 
              (loading || savingDraft) && styles.disabledButton,
              isDesktop && styles.desktopSubmitButton
            ]}
            onPress={handleSubmit}
            disabled={loading || savingDraft}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.submitButtonText}>Create Product</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('SellerDashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create Product</Text>
          <Text style={styles.headerSubtitle}>Add a new product to your shop</Text>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.draftButton, isDesktop && styles.desktopSaveButton]}
            onPress={handleSaveAsDraft}
            disabled={savingDraft || loading}
          >
            {savingDraft ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="document-outline" size={20} color="white" />
                <Text style={styles.draftButtonText}>Draft</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, isDesktop && styles.desktopSaveButton]}
            onPress={handleSubmit}
            disabled={loading || savingDraft}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.ScrollView
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Draft Info Banner */}
        <View style={styles.draftInfoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#3498db" />
          <View style={styles.draftInfoText}>
            <Text style={styles.draftInfoTitle}>Save as Draft</Text>
            <Text style={styles.draftInfoSubtitle}>
              Save your progress anytime. Drafts expire after 14 days.
            </Text>
          </View>
        </View>

        {isDesktop ? (
          <View style={styles.desktopLayout}>
            {renderLeftColumn()}
            {renderRightColumn()}
          </View>
        ) : (
          <View>
            {renderLeftColumn()}
            {renderRightColumn()}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </Animated.ScrollView>

      {/* Info Modal */}
      <InfoModal />
      
      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2c2c2c',
    paddingTop: width > 768 ? 60 : 50,
    paddingHorizontal: width > 768 ? 30 : 20,
    paddingBottom: width > 768 ? 25 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  headerContent: {
    flex: 1,
    marginLeft: 20,
  },
  headerTitle: {
    fontSize: width > 768 ? 28 : 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: width > 768 ? 16 : 14,
    color: '#ccc',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#95a5a6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  draftButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: width > 1024 ? 40 : (width > 768 ? 30 : 20),
  },

  // Draft Info Banner
  draftInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 25,
    gap: 12,
  },
  draftInfoText: {
    flex: 1,
  },
  draftInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
    marginBottom: 4,
  },
  draftInfoSubtitle: {
    fontSize: 14,
    color: '#7fb3d3',
    lineHeight: 20,
  },

  // Desktop Layout
  desktopLayout: {
    flexDirection: 'row',
    gap: 50,
    alignItems: 'flex-start',
    minHeight: '100%',
  },
  leftColumn: {
    flex: 1.1,
    minWidth: 0,
  },
  rightColumn: {
    flex: 0.9,
    minWidth: 0,
  },
  desktopSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  desktopSubmitButton: {
    paddingVertical: 14,
    maxWidth: 300,
    alignSelf: 'center',
  },
  
  // Image Section
  imageSection: {
    marginBottom: width > 1024 ? 35 : 30,
  },
  imageGrid: {
    marginTop: 15,
  },
  additionalImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15,
    justifyContent: 'flex-start',
  },
  imageContainer: {
    marginRight: 15,
  },
  imageWrapper: {
    position: 'relative',
  },
  productImage: {
    width: width > 768 ? 200 : 150,
    height: width > 768 ? 200 : 150,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: width > 768 ? 200 : 150,
    height: width > 768 ? 200 : 150,
    backgroundColor: '#333',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  // Sections
  section: {
    backgroundColor: '#2c2c2c',
    borderRadius: 16,
    padding: width > 768 ? 25 : 20,
    marginBottom: width > 1024 ? 25 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: width > 768 ? 22 : 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Form Elements
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  labelWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 5,
  },

  // Colors
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  whiteColorBorder: {
    borderColor: '#666',
  },

  // Sizes
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  sizeOption: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedSize: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  sizeText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedSizeText: {
    color: '#fff',
  },

  // Custom Specs
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  specInput: {
    flex: 1,
  },
  removeButton: {
    padding: 10,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  // Currency
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  currencyOption: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedCurrency: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  currencyText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedCurrencyText: {
    color: '#fff',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  toggleOption: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedToggle: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  toggleText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedToggleText: {
    color: '#fff',
  },

  // Submit
  submitSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  submitButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    flex: 1,
  },
  draftSubmitButton: {
    backgroundColor: '#95a5a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#95a5a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#666',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModal: {
    backgroundColor: '#2c2c2c',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  infoContent: {
    padding: 20,
    maxHeight: 300,
  },
  infoText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
});

export default CreateProduct;
