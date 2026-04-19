import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import API_BASE from '../constants/api';

const SellerSettings = ({ navigation }) => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
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
        
        // Fetch complete seller profile from backend for fresh data
        try {
          const response = await fetch(`${API_BASE}/sellers/profile/${seller.id}`);
          const data = await response.json();
          
          if (response.ok && data.success) {
            const profile = data.profile;
            
            // Update seller info with fresh data from backend
            setSellerInfo(profile);
            
            // Update AsyncStorage with fresh data
            await AsyncStorage.setItem('currentSeller', JSON.stringify(profile));
            
            console.log('Seller profile refreshed:', profile);
          } else {
            console.log('Failed to fetch seller profile:', data.error);
            // Continue with local data if API fails
          }
        } catch (apiError) {
          console.log('API call failed, using local data:', apiError);
          // Continue with local data if API call fails
        }
      } else {
        showError('Please log in to access settings');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading seller info:', error);
      showError('Failed to load seller information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('currentSeller');
              showSuccess('Logged out successfully');
              navigation.navigate('SellerLogin');
            } catch (error) {
              console.error('Error during logout:', error);
              showError('Failed to logout');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
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
              navigation.navigate('SellerDashboard');
            } else {
              console.error('Navigation not available');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            {sellerInfo?.profileImage?.url ? (
              <Image 
                source={{ uri: sellerInfo.profileImage.url }} 
                style={styles.userAvatarImage}
                onError={() => console.log('Failed to load profile image')}
              />
            ) : (
              <Ionicons name="person" size={32} color="#3498db" />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{sellerInfo?.name || 'Seller'}</Text>
            <Text style={styles.userEmail}>{sellerInfo?.email || 'No email'}</Text>
            <View style={styles.statusContainer}>
              <Text style={styles.userStatus}>
                {sellerInfo?.verified ? '✅ Verified Seller' : '⚠️ Unverified'}
              </Text>
              {sellerInfo?.shop?.isSetup && (
                <Text style={styles.shopStatus}>🏪 Shop Setup Complete</Text>
              )}
            </View>
            {sellerInfo?.shop?.shopName && (
              <Text style={styles.shopName}>Shop: {sellerInfo.shop.shopName}</Text>
            )}
          </View>
        </View>

        {/* Shop Management */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Shop Management</Text>
          
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('ShopSettings')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: '#3498db15' }]}>
              <Ionicons name="storefront-outline" size={20} color="#3498db" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Shop Information</Text>
              <Text style={styles.settingsSubtitle}>Manage your shop details and branding</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('SellerPaymentSettings')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: '#27ae6015' }]}>
              <Ionicons name="card-outline" size={20} color="#27ae60" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Payment Methods</Text>
              <Text style={styles.settingsSubtitle}>Configure payment and banking details</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Account Settings</Text>
          
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('ProfileSettings')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: '#9b59b615' }]}>
              <Ionicons name="person-outline" size={20} color="#9b59b6" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Profile Settings</Text>
              <Text style={styles.settingsSubtitle}>Update your personal information</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('ChangePassword')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: '#e74c3c15' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#e74c3c" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Change Password</Text>
              <Text style={styles.settingsSubtitle}>Update your account password</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Notifications</Text>
          
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: '#16a08515' }]}>
              <Ionicons name="notifications-outline" size={20} color="#16a085" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Push Notifications</Text>
              <Text style={styles.settingsSubtitle}>Receive notifications on your device</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e1e8ed', true: '#3498db' }}
              thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => setEmailNotifications(!emailNotifications)}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: '#2980b915' }]}>
              <Ionicons name="mail-outline" size={20} color="#2980b9" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Email Notifications</Text>
              <Text style={styles.settingsSubtitle}>Receive updates via email</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#e1e8ed', true: '#3498db' }}
              thumbColor={emailNotifications ? '#ffffff' : '#f4f3f4'}
            />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  statusContainer: {
    marginTop: 4,
  },
  shopStatus: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
    marginTop: 2,
  },
  shopName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  settingsGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  dangerZone: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 16,
    color: '#e74c3c',
    marginLeft: 15,
    fontWeight: '500',
  },
});

export default SellerSettings;
