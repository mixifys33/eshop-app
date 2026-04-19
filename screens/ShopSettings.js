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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const ShopSettings = ({ navigation }) => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopData, setShopData] = useState({
    shopName: '',
    shopDescription: '',
    businessType: '',
    businessAddress: '',
    city: '',
    website: '',
    businessLicense: '',
    taxId: '',
  });
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  useEffect(() => {
    loadSellerInfo();
  }, []);

  const loadSellerInfo = async () => {
    try {
      console.log('🔍 Loading seller info for shop settings...');
      const savedSellerData = await AsyncStorage.getItem('currentSeller');
      if (savedSellerData) {
        const seller = JSON.parse(savedSellerData);
        console.log('📱 Local seller data:', seller);
        setSellerInfo(seller);
        
        // Fetch complete seller profile from backend
        console.log('🌐 Fetching profile from API...');
        const response = await fetch(`${API_BASE}/sellers/profile/${seller.id}`);
        const data = await response.json();
        
        console.log('📡 API Response:', { status: response.status, data });
        
        if (response.ok && data.success) {
          const profile = data.profile;
          console.log('✅ Profile fetched successfully:', profile);
          
          // Update seller info with fresh data
          setSellerInfo(profile);
          
          // Prefill shop data with existing information
          const shopData = {
            shopName: profile.shop?.shopName || '',
            shopDescription: profile.shop?.shopDescription || '',
            businessType: profile.shop?.businessType || '',
            businessAddress: profile.shop?.businessAddress || '',
            city: profile.shop?.city || '',
            website: profile.shop?.website || '',
            businessLicense: profile.shop?.businessLicense || '',
            taxId: profile.shop?.taxId || '',
          };
          
          console.log('🏪 Setting shop data:', shopData);
          setShopData(shopData);
          
        } else {
          console.log('❌ Failed to fetch seller profile:', data.error);
          // Fallback to local data if API fails
          if (seller.shop) {
            const fallbackData = {
              shopName: seller.shop.shopName || '',
              shopDescription: seller.shop.shopDescription || '',
              businessType: seller.shop.businessType || '',
              businessAddress: seller.shop.businessAddress || '',
              city: seller.shop.city || '',
              website: seller.shop.website || '',
              businessLicense: seller.shop.businessLicense || '',
              taxId: seller.shop.taxId || '',
            };
            console.log('🔄 Using fallback shop data:', fallbackData);
            setShopData(fallbackData);
          }
        }
      } else {
        console.log('❌ No seller data in AsyncStorage');
        showError('Please log in to access shop settings');
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('SellerLogin');
        }
      }
    } catch (error) {
      console.error('❌ Error loading seller info:', error);
      showError('Failed to load seller information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!shopData.shopName.trim()) {
      showError('Shop name is required');
      return;
    }

    if (!shopData.shopDescription.trim()) {
      showError('Shop description is required');
      return;
    }

    if (!shopData.businessType.trim()) {
      showError('Business type is required');
      return;
    }

    if (!shopData.businessAddress.trim()) {
      showError('Business address is required');
      return;
    }

    if (!shopData.city.trim()) {
      showError('City is required');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/sellers/shop-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: sellerInfo.id,
          ...shopData,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local storage with new shop data
        const updatedSeller = {
          ...sellerInfo,
          shop: {
            ...sellerInfo.shop,
            ...shopData,
            isSetup: true,
          },
        };
        
        await AsyncStorage.setItem('currentSeller', JSON.stringify(updatedSeller));
        setSellerInfo(updatedSeller);
        
        showSuccess('Shop settings saved successfully!');
      } else {
        showError(data.error || 'Failed to save shop settings');
      }
    } catch (error) {
      console.error('Error saving shop settings:', error);
      showError('Failed to save shop settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
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
            // Reset to original data
            if (sellerInfo?.shop) {
              setShopData({
                shopName: sellerInfo.shop.shopName || '',
                shopDescription: sellerInfo.shop.shopDescription || '',
                businessType: sellerInfo.shop.businessType || '',
                businessAddress: sellerInfo.shop.businessAddress || '',
                city: sellerInfo.shop.city || '',
                website: sellerInfo.shop.website || '',
                businessLicense: sellerInfo.shop.businessLicense || '',
                taxId: sellerInfo.shop.taxId || '',
              });
            } else {
              setShopData({
                shopName: '',
                shopDescription: '',
                businessType: '',
                businessAddress: '',
                city: '',
                website: '',
                businessLicense: '',
                taxId: '',
              });
            }
            showWarning('Changes reset');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading shop settings...</Text>
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
        <Text style={styles.headerTitle}>Shop Settings</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Shop Name *</Text>
            <TextInput
              style={styles.input}
              value={shopData.shopName}
              onChangeText={(text) => setShopData({ ...shopData, shopName: text })}
              placeholder="Enter your shop name"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Shop Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={shopData.shopDescription}
              onChangeText={(text) => setShopData({ ...shopData, shopDescription: text })}
              placeholder="Describe your shop and what you sell"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>
              {shopData.shopDescription.length}/500
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Type *</Text>
            <TextInput
              style={styles.input}
              value={shopData.businessType}
              onChangeText={(text) => setShopData({ ...shopData, businessType: text })}
              placeholder="e.g., Electronics, Fashion, Food"
              maxLength={30}
            />
          </View>
        </View>

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={shopData.businessAddress}
              onChangeText={(text) => setShopData({ ...shopData, businessAddress: text })}
              placeholder="Enter your complete business address"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={shopData.city}
              onChangeText={(text) => setShopData({ ...shopData, city: text })}
              placeholder="Enter your city"
              maxLength={30}
            />
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website (Optional)</Text>
            <TextInput
              style={styles.input}
              value={shopData.website}
              onChangeText={(text) => setShopData({ ...shopData, website: text })}
              placeholder="https://yourwebsite.com"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business License (Optional)</Text>
            <TextInput
              style={styles.input}
              value={shopData.businessLicense}
              onChangeText={(text) => setShopData({ ...shopData, businessLicense: text })}
              placeholder="Enter your business license number"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax ID (Optional)</Text>
            <TextInput
              style={styles.input}
              value={shopData.taxId}
              onChangeText={(text) => setShopData({ ...shopData, taxId: text })}
              placeholder="Enter your tax identification number"
              maxLength={30}
            />
          </View>
        </View>

        {/* Required Fields Note */}
        <View style={styles.noteSection}>
          <Ionicons name="information-circle-outline" size={16} color="#f39c12" />
          <Text style={styles.noteText}>
            Fields marked with * are required
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
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
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noteText: {
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
});

export default ShopSettings;
