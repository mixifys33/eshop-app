// Import URL polyfill for React Native (required for ImageKit SDK)
import 'react-native-url-polyfill/auto';

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, Alert, ScrollView, TextInput, Dimensions, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ThemeProvider } from './context/ThemeContext';

// Import screens
import SellerSignup from './screens/SellerSignup';
import SellerLogin from './screens/SellerLogin';
import SellerDashboard from './screens/SellerDashboard';
import SellerForgotPassword from './screens/SellerForgotPassword';
import CreateProduct from './screens/CreateProduct';
import AllProducts from './screens/AllProducts';
import BulkUpload from './screens/BulkUpload';
import BulkEdit from './screens/BulkEdit';
import BulkUploadHistory from './screens/BulkUploadHistory';
import BulkUploadReviewMinimal from './screens/BulkUploadReviewMinimal';
import SellerSettings from './screens/SellerSettings';
import SellerPaymentSettings from './screens/SellerPaymentSettings';
import ShopSettings from './screens/ShopSettings';
import ProfileSettings from './screens/ProfileSettings';
import ChangePassword from './screens/ChangePassword';
import UserHome from './screens/UserHome';
import Login from './screens/Login';
import Signup from './screens/Signup';
import UserForgotPassword from './screens/UserForgotPassword';
import UserProfile from './screens/UserProfile';
import EditProfile from './screens/EditProfile';
import HelpSupport from './screens/HelpSupport';
import ChangeUserPassword from './screens/ChangeUserPassword';
import AllCategories from './screens/AllCategories';
import CategoryProducts from './screens/CategoryProducts';
import Wishlist from './screens/Wishlist';
import Cart from './screens/Cart';
import UserDeliverySettings from './screens/UserDeliverySettings';
import ProductDetails from './screens/ProductDetails';
import Checkout from './screens/Checkout';
import OrderSuccess from './screens/OrderSuccess';
import PaymentScreen from './screens/PaymentScreen';
import UserOrders from './screens/UserOrders';
import SellerOrders from './screens/SellerOrders';
import SellerRefund from './screens/SellerRefund';
import SellerMarketing from './screens/SellerMarketing';
import SellerDrafts from './screens/SellerDrafts';
import ShopAIScreen from './screens/ShopAIScreen';
import ShopAllProducts from './screens/ShopAllProducts';
import SpecialGuest from './screens/SpecialGuest';

const { width } = Dimensions.get('window');
const API_BASE_URL = `${process.env.EXPO_PUBLIC_API_URL}/api`;

// Mock user data
const mockUser = {
  name: "John Doe",
  isLoggedIn: true
};

// Hero banners data
const heroBanners = [
  {
    id: 1,
    title: "Summer Sale",
    subtitle: "Up to 70% Off",
    description: "Get the best deals on electronics",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
    buttonText: "Shop Now"
  },
  {
    id: 2,
    title: "New Arrivals",
    subtitle: "Latest Tech",
    description: "Discover cutting-edge gadgets",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800",
    buttonText: "Explore"
  }
];

// Categories data with proper icons
const categories = [
  { id: 1, name: "Phones", icon: "smartphone", iconSet: "Feather", color: "#3498db" },
  { id: 2, name: "Laptops", icon: "monitor", iconSet: "Feather", color: "#9b59b6" },
  { id: 3, name: "Audio", icon: "headphones", iconSet: "Feather", color: "#e74c3c" },
  { id: 4, name: "Tablets", icon: "tablet", iconSet: "Feather", color: "#f39c12" },
  { id: 5, name: "Gaming", icon: "game-controller", iconSet: "Ionicons", color: "#27ae60" },
  { id: 6, name: "Cameras", icon: "camera", iconSet: "Feather", color: "#34495e" }
];

// Static featured products for better UI
const suggestedProducts = [
  {
    id: 1,
    name: "iPhone 15 Pro",
    price: 999.99,
    originalPrice: 1099.99,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400",
    description: "Latest iPhone with titanium design and advanced camera system",
    category: "Electronics",
    rating: 4.8,
    discount: "9% OFF",
    isNew: false,
    isTrending: true
  },
  {
    id: 2,
    name: "MacBook Air M3",
    price: 1299.99,
    originalPrice: 1399.99,
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400",
    description: "Powerful laptop with M3 chip for work and creativity",
    category: "Computers",
    rating: 4.9,
    discount: "7% OFF",
    isNew: true,
    isTrending: true
  },
  {
    id: 3,
    name: "AirPods Pro 2",
    price: 249.99,
    originalPrice: 279.99,
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400",
    description: "Premium wireless earbuds with active noise cancellation",
    category: "Audio",
    rating: 4.7,
    discount: "11% OFF",
    isNew: false,
    isTrending: true
  },
  {
    id: 4,
    name: "Samsung Galaxy S24",
    price: 899.99,
    originalPrice: 999.99,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
    description: "Flagship Android phone with AI-powered features",
    category: "Electronics",
    rating: 4.6,
    discount: "10% OFF",
    isNew: true,
    isTrending: false
  },
  {
    id: 5,
    name: "iPad Pro 12.9",
    price: 1099.99,
    originalPrice: 1199.99,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400",
    description: "Professional tablet with M2 chip and Liquid Retina display",
    category: "Tablets",
    rating: 4.8,
    discount: "8% OFF",
    isNew: true,
    isTrending: false
  },
  {
    id: 6,
    name: "Sony WH-1000XM5",
    price: 349.99,
    originalPrice: 399.99,
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400",
    description: "Industry-leading noise canceling headphones",
    category: "Audio",
    rating: 4.9,
    discount: "13% OFF",
    isNew: false,
    isTrending: true
  },
  {
    id: 7,
    name: "Nintendo Switch OLED",
    price: 349.99,
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400",
    description: "Portable gaming console with vibrant OLED screen",
    category: "Gaming",
    rating: 4.7,
    isNew: true,
    isTrending: false
  },
  {
    id: 8,
    name: "Canon EOS R5",
    price: 3899.99,
    image: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400",
    description: "Professional mirrorless camera with 8K video",
    category: "Cameras",
    rating: 4.9,
    isNew: false,
    isTrending: true
  }
];

export default function App() {
  const [products] = useState(suggestedProducts);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [navigationStack, setNavigationStack] = useState(['home']);
  const [screenParams, setScreenParams] = useState({});
  const [currentParams, setCurrentParams] = useState({});

  // Debug current screen
  console.log('Current screen:', currentScreen);
  console.log('Navigation stack:', navigationStack);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingScreen, setPendingScreen] = useState(null);

  // Screens that require the user to be logged in
  const PROTECTED_SCREENS = ['Cart', 'Wishlist', 'ShopAI', 'UserOrders'];

  const isUserLoggedIn = async () => {
    const token = await AsyncStorage.getItem('userToken');
    const userData = await AsyncStorage.getItem('userData');
    return !!(token && userData);
  };

  // Navigation object for seller screens
  const navigation = {
    navigate: async (screen, params = {}) => {
      // Guard protected screens
      if (PROTECTED_SCREENS.includes(screen)) {
        const loggedIn = await isUserLoggedIn();
        if (!loggedIn) {
          setPendingScreen({ screen, params });
          setShowAuthModal(true);
          return;
        }
      }

      console.log(`Navigating from ${currentScreen} to ${screen}`, params);
      console.log('Navigation parameter received:', screen);
      
      // Store params for the target screen
      setScreenParams(prev => ({ ...prev, [screen]: params }));
      setCurrentParams(params);

      // Add to navigation stack if it's a different screen
      if (screen !== currentScreen) {
        setNavigationStack(prev => {
          // Avoid duplicate consecutive entries
          const newStack = [...prev];
          if (newStack[newStack.length - 1] !== screen) {
            newStack.push({ screen, params });
          }
          return newStack;
        });
      }
      setCurrentScreen(screen);
    },
    // Add push method for compatibility (same as navigate but always adds to stack)
    push: (screen, params = {}) => {
      console.log(`🚀 Pushing from ${currentScreen} to ${screen}`, params);
      console.log('📦 Product being pushed:', params?.product?.name, 'ID:', params?.product?.id);
      
      // Always add to navigation stack, even if it's the same screen
      setNavigationStack(prev => {
        const newStack = [...prev];
        newStack.push({ screen, params });
        console.log('📚 New navigation stack length:', newStack.length);
        return newStack;
      });
      setCurrentScreen(screen);
    },
    goBack: () => {
      console.log('Going back from:', currentScreen);
      if (navigationStack.length > 1) {
        const newStack = [...navigationStack];
        newStack.pop();
        const previousEntry = newStack[newStack.length - 1];
        const previousScreen = typeof previousEntry === 'string' ? previousEntry : previousEntry.screen;
        const previousParams = typeof previousEntry === 'object' ? (previousEntry.params || {}) : {};
        setNavigationStack(newStack);
        setCurrentParams(previousParams);
        setCurrentScreen(previousScreen);
        console.log('Going back to:', previousScreen);
      } else {
        setCurrentScreen('home');
        setCurrentParams({});
        setNavigationStack(['home']);
        console.log('No previous screen, going to home');
      }
    },
    // Add a reset method for edge cases
    reset: (screen = 'home') => {
      console.log('Resetting navigation to:', screen);
      setCurrentScreen(screen);
      setNavigationStack([screen]);
    },
    // Helper to get current route params
    getCurrentParams: () => {
      const currentEntry = navigationStack[navigationStack.length - 1];
      console.log('📋 Getting current params from navigation stack:', currentEntry);
      const params = typeof currentEntry === 'object' ? currentEntry.params : {};
      console.log('📦 Returning params:', params);
      return params;
    },
    // Replace current screen (clears it from stack, used after order placement)
    replace: (screen, params = {}) => {
      setScreenParams(prev => ({ ...prev, [screen]: params }));
      setCurrentParams(params);
      setNavigationStack(prev => {
        const newStack = [...prev];
        newStack.pop();
        newStack.push({ screen, params });
        return newStack;
      });
      setCurrentScreen(screen);
    },
  };

  // Get filtered products by category
  const trendingProducts = products.filter(p => p.isTrending);
  const latestProducts = products.filter(p => p.isNew);

  // Welcome message typing effect
  useEffect(() => {
    if (!mockUser.isLoggedIn || !showWelcome) return;
    
    const message = `Welcome back, ${mockUser.name.split(' ')[0]}! 🎉`;
    let index = 0;
    setTypedText('');
    
    const typeInterval = setInterval(() => {
      if (index < message.length) {
        setTypedText(message.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [showWelcome]);

  // Auto-rotate hero banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    Alert.alert('Added to Cart! 🛒', `${product.name} has been added to your cart`);
  };

  // Hero Banner Component
  const renderHeroBanner = () => {
    const banner = heroBanners[currentBannerIndex];
    return (
      <View style={styles.heroContainer}>
        <Image source={{ uri: banner.image }} style={styles.heroImage} />
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <Text style={styles.heroSubtitle}>{banner.subtitle}</Text>
            <Text style={styles.heroTitle}>{banner.title}</Text>
            <Text style={styles.heroDescription}>{banner.description}</Text>
            <TouchableOpacity style={styles.heroButton}>
              <Text style={styles.heroButtonText}>{banner.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bannerIndicators}>
          {heroBanners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentBannerIndex && styles.activeIndicator
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  // Welcome Banner Component
  const renderWelcomeBanner = () => {
    if (!mockUser.isLoggedIn || !showWelcome) return null;
    
    return (
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>{typedText}</Text>
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={() => setShowWelcome(false)}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Categories Component
  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitle}>Shop by Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => {
            const IconComponent = category.iconSet === 'Ionicons' ? Ionicons : Feather;
            return (
              <TouchableOpacity key={category.id} style={[styles.categoryCard, { backgroundColor: category.color + '20' }]}>
                <View style={[styles.categoryIconContainer, { backgroundColor: category.color }]}>
                  <IconComponent name={category.icon} size={24} color="white" />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // Product Card Component
  const renderProductCard = ({ item }) => (
    <View style={styles.productCard}>
      {item.discount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
      )}
      {item.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newText}>NEW</Text>
        </View>
      )}
      
      <Image source={{ uri: item.image }} style={styles.productImage} />
      
      <View style={styles.productInfo}>
        <Text style={styles.categoryText}>{item.category}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color="#f39c12" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewText}>(128 reviews)</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>${item.price}</Text>
          {item.originalPrice && (
            <Text style={styles.originalPrice}>${item.originalPrice}</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addToCart(item)}
        >
          <Ionicons name="cart-outline" size={14} color="white" />
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Section Header Component
  const renderSectionHeader = (title, subtitle, iconName, iconSet = 'Feather') => {
    const IconComponent = iconSet === 'Ionicons' ? Ionicons : iconSet === 'MaterialIcons' ? MaterialIcons : Feather;
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={styles.sectionIconContainer}>
            <IconComponent name={iconName} size={20} color="#3498db" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
          <Feather name="arrow-right" size={16} color="#3498db" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemeProvider>
      <>
        {currentScreen === 'home' && <UserHome navigation={navigation} />}
      {currentScreen === 'Login' && <Login navigation={navigation} />}
      {currentScreen === 'Signup' && <Signup navigation={navigation} />}
      {currentScreen === 'UserForgotPassword' && <UserForgotPassword navigation={navigation} />}
      {currentScreen === 'UserProfile' && <UserProfile navigation={navigation} />}
      {currentScreen === 'EditProfile' && <EditProfile navigation={navigation} />}
      {currentScreen === 'HelpSupport' && <HelpSupport navigation={navigation} />}
      {currentScreen === 'UserOrders' && <UserOrders navigation={navigation} />}
      {currentScreen === 'ChangeUserPassword' && <ChangeUserPassword navigation={navigation} />}
      {currentScreen === 'AllCategories' && <AllCategories navigation={navigation} />}
      {currentScreen === 'CategoryProducts' && <CategoryProducts navigation={navigation} route={{ params: navigation.getCurrentParams() }} />}
      {currentScreen === 'ProductDetails' && (
        <ProductDetails 
          key={navigation.getCurrentParams()?.product?.id || 'default'} 
          navigation={navigation} 
          route={{ params: navigation.getCurrentParams() }} 
        />
      )}
      {currentScreen === 'Wishlist' && <Wishlist navigation={navigation} />}
      {currentScreen === 'Cart' && <Cart navigation={navigation} />}
      {currentScreen === 'Checkout' && (
        <Checkout navigation={navigation} route={{ params: currentParams }} />
      )}
      {currentScreen === 'PaymentScreen' && (
        <PaymentScreen navigation={navigation} route={{ params: currentParams }} />
      )}
      {currentScreen === 'OrderSuccess' && (
        <OrderSuccess navigation={navigation} route={{ params: currentParams }} />
      )}
      {currentScreen === 'UserDeliverySettings' && <UserDeliverySettings navigation={navigation} />}
      {currentScreen === 'ShopAllProducts' && <ShopAllProducts navigation={navigation} route={{ params: navigation.getCurrentParams() }} />}
      {currentScreen === 'SpecialGuest' && <SpecialGuest navigation={navigation} />}
      {currentScreen === 'SellerSignup' && <SellerSignup navigation={navigation} />}
      {currentScreen === 'SellerLogin' && <SellerLogin navigation={navigation} />}
      {currentScreen === 'SellerDashboard' && <SellerDashboard navigation={navigation} />}
      {currentScreen === 'SellerOrders' && <SellerOrders navigation={navigation} />}
      {currentScreen === 'SellerRefund' && <SellerRefund navigation={navigation} route={{ params: currentParams }} />}
      {currentScreen === 'SellerMarketing' && <SellerMarketing navigation={navigation} />}
      {currentScreen === 'SellerDrafts' && <SellerDrafts navigation={navigation} />}
      {currentScreen === 'ShopAI' && <ShopAIScreen navigation={navigation} />}
      {currentScreen === 'SellerForgotPassword' && <SellerForgotPassword navigation={navigation} />}
      {currentScreen === 'CreateProduct' && <CreateProduct navigation={navigation} />}
      {currentScreen === 'AllProducts' && <AllProducts navigation={navigation} />}
      {currentScreen === 'BulkUpload' && <BulkUpload navigation={navigation} />}
      {currentScreen === 'BulkEdit' && <BulkEdit navigation={navigation} />}
      {currentScreen === 'BulkUploadHistory' && <BulkUploadHistory navigation={navigation} />}
      {currentScreen === 'BulkUploadReviewMinimal' && <BulkUploadReviewMinimal navigation={navigation} />}
      {currentScreen === 'SellerSettings' && <SellerSettings navigation={navigation} />}
      {currentScreen === 'SellerPaymentSettings' && <SellerPaymentSettings navigation={navigation} />}
      {currentScreen === 'ShopSettings' && <ShopSettings navigation={navigation} />}
      {currentScreen === 'ProfileSettings' && <ProfileSettings navigation={navigation} />}
      {currentScreen === 'ChangePassword' && <ChangePassword navigation={navigation} />}
      <Toast />
      {/* Auth required modal */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.authModal}>
            <Ionicons name="lock-closed" size={40} color="#115061" style={{ marginBottom: 12 }} />
            <Text style={styles.authModalTitle}>Login Required</Text>
            <Text style={styles.authModalText}>
              You need to be logged in to access this feature.
            </Text>
            <TouchableOpacity
              style={styles.authModalPrimary}
              onPress={() => {
                setShowAuthModal(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.authModalPrimaryText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.authModalSecondary}
              onPress={() => {
                setShowAuthModal(false);
                navigation.navigate('Signup');
              }}
            >
              <Text style={styles.authModalSecondaryText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12 }}
              onPress={() => { setShowAuthModal(false); setPendingScreen(null); }}
            >
              <Text style={{ color: '#95a5a6', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      </>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    maxWidth: width > 1200 ? 1200 : '100%',
    alignSelf: 'center',
  },
  
  // Hero Section
  heroContainer: {
    height: width > 768 ? 400 : 250,
    position: 'relative',
    marginBottom: 10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: 600,
  },
  heroSubtitle: {
    fontSize: width > 768 ? 20 : 16,
    color: '#ffd700',
    fontWeight: '600',
    marginBottom: 5,
  },
  heroTitle: {
    fontSize: width > 768 ? 48 : 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: width > 768 ? 18 : 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  heroButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: width > 768 ? 40 : 30,
    paddingVertical: width > 768 ? 16 : 12,
    borderRadius: 25,
  },
  heroButtonText: {
    color: 'white',
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
  },
  bannerIndicators: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeIndicator: {
    backgroundColor: 'white',
  },

  // Welcome Banner
  welcomeBanner: {
    backgroundColor: '#115061',
    paddingVertical: 12,
    paddingHorizontal: width > 768 ? 40 : 20,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  welcomeText: {
    color: 'white',
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '500',
    flex: 1,
  },
  dismissButton: {
    padding: 5,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },

  // Search Section
  searchSection: {
    backgroundColor: 'white',
    paddingHorizontal: width > 768 ? 40 : 20,
    paddingVertical: 20,
    marginBottom: 10,
  },
  searchContainer: {
    marginBottom: 20,
    position: 'relative',
    maxWidth: width > 768 ? 600 : '100%',
    alignSelf: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 20,
    top: 16,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#f1f2f6',
    borderRadius: 25,
    paddingHorizontal: 50,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    paddingVertical: 20,
    maxWidth: width > 768 ? 600 : '100%',
    alignSelf: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: width > 768 ? 24 : 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: width > 768 ? 14 : 12,
    color: '#7f8c8d',
    marginTop: 2,
  },

  // Categories Section
  categoriesSection: {
    backgroundColor: 'white',
    paddingVertical: 20,
    marginBottom: 10,
  },
  categoriesScroll: {
    paddingLeft: width > 768 ? 40 : 20,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingRight: width > 768 ? 40 : 20,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width > 768 ? 120 : 80,
    height: width > 768 ? 120 : 80,
    borderRadius: 15,
    marginRight: 15,
  },
  categoryIconContainer: {
    width: width > 768 ? 50 : 40,
    height: width > 768 ? 50 : 40,
    borderRadius: width > 768 ? 25 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: width > 768 ? 14 : 12,
    fontWeight: '600',
    color: '#2c3e50',
  },

  // Section Styles
  section: {
    backgroundColor: 'white',
    paddingVertical: 20,
    marginBottom: 10,
  },
  trendingSection: {
    backgroundColor: '#f8f4ff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width > 768 ? 40 : 20,
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: width > 768 ? 24 : 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sectionSubtitle: {
    fontSize: width > 768 ? 14 : 12,
    color: '#7f8c8d',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  viewAllText: {
    fontSize: width > 768 ? 16 : 14,
    color: '#3498db',
    fontWeight: '600',
  },

  // Product Cards
  productsGrid: {
    paddingHorizontal: width > 768 ? 40 : 20,
  },
  gridContainer: {
    gap: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  horizontalList: {
    paddingLeft: width > 768 ? 40 : 20,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    width: width > 768 ? (width - 120) / 4 - 15 : width > 480 ? (width - 80) / 3 - 15 : (width - 60) / 2,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  newText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productImage: {
    width: '100%',
    height: width > 768 ? 180 : 120,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: width > 768 ? 16 : 12,
  },
  categoryText: {
    fontSize: 10,
    color: '#3498db',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: width > 768 ? 13 : 11,
    color: '#7f8c8d',
    lineHeight: 16,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 10,
    color: '#95a5a6',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  originalPrice: {
    fontSize: width > 768 ? 14 : 12,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  addButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: width > 768 ? 12 : 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: width > 768 ? 14 : 12,
    fontWeight: 'bold',
  },

  // CTA Section
  ctaSection: {
    backgroundColor: '#115061',
    paddingVertical: width > 768 ? 60 : 40,
    paddingHorizontal: width > 768 ? 40 : 20,
    alignItems: 'center',
    marginTop: 20,
  },
  ctaIconContainer: {
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: width > 768 ? 28 : 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaSubtitle: {
    fontSize: width > 768 ? 36 : 28,
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 15,
  },
  ctaDescription: {
    fontSize: width > 768 ? 18 : 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
    maxWidth: 600,
  },
  ctaButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: width > 768 ? 40 : 30,
    paddingVertical: width > 768 ? 18 : 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaButtonText: {
    color: '#115061',
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
  },
  sellerLoginButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  sellerLoginText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // Auth modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  authModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  authModalText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  authModalPrimary: {
    backgroundColor: '#115061',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  authModalPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authModalSecondary: {
    borderWidth: 2,
    borderColor: '#115061',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  authModalSecondaryText: {
    color: '#115061',
    fontSize: 16,
    fontWeight: '600',
  },
});