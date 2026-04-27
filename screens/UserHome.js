import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CartWishlistService from '../services/cartWishlistService';
import QuantitySelector from '../components/QuantitySelector';
import {
  CardGrid, CardList, CardHero, CardMini, CardMagazine, AutoImage,
} from '../components/AnimatedProductCard';
import { useTheme } from '../context/ThemeContext';
import API_BASE from '../constants/api';
import { saveProductsCache, loadProductsCache } from '../utils/productsCache';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ── Shimmer Skeleton Components ───────────────────────────────────────────
// Single animation — all bones share the same sweep timing
const useCardShimmer = () => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
};

// Each bone has the gradient line sweeping INSIDE it
const Bone = ({ w, h, radius = 8, style, anim }) => {
  const boneW = typeof w === 'number' ? w : 200;

  const lineX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-boneW * 0.4, boneW * 1.3],
  });

  return (
    <View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: '#e8e8e8', overflow: 'hidden' }, style]}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 0, bottom: 0,
          width: boneW * 0.45,
          transform: [{ translateX: lineX }],
        }}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(99,179,255,0.75)',
            'rgba(255,255,255,0.95)',
            'rgba(180,120,255,0.65)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

// Card wrapper — just layout, no animation overlay
const SkeletonCard = ({ children, style }) => (
  <View style={[{ overflow: 'hidden' }, style]}>
    {children}
  </View>
);

// Category skeleton — horizontal circles + label
const CategorySkeleton = () => {
  const anim = useCardShimmer();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 16 }}>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <Bone anim={anim} w={56} h={56} radius={28} />
            <Bone anim={anim} w={44} h={10} radius={5} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// Product card skeleton — 2-col grid card shape
const CARD_W = (width - 48) / 2;
const ProductCardSkeleton = () => {
  const anim = useCardShimmer();
  return (
    <View style={{ width: CARD_W, backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4 }}>
      <Bone anim={anim} w={CARD_W} h={145} radius={0} />
      <View style={{ padding: 10, gap: 8 }}>
        <Bone anim={anim} w={CARD_W * 0.5} h={10} />
        <Bone anim={anim} w={CARD_W * 0.9} h={13} />
        <Bone anim={anim} w={CARD_W * 0.7} h={13} />
        <Bone anim={anim} w={CARD_W * 0.55} h={11} />
        <Bone anim={anim} w={CARD_W} h={34} radius={10} />
      </View>
    </View>
  );
};

// Horizontal suggested product skeleton
const SuggestedSkeleton = () => {
  const anim = useCardShimmer();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={{ width: 160, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2 }}>
            <Bone anim={anim} w={160} h={130} radius={0} />
            <View style={{ padding: 10, gap: 7 }}>
              <Bone anim={anim} w={80} h={9} />
              <Bone anim={anim} w={140} h={12} />
              <Bone anim={anim} w={90} h={12} />
              <Bone anim={anim} w={160} h={30} radius={8} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// Grid skeleton — 2 columns
const GridSkeleton = () => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, justifyContent: 'space-between' }}>
    {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
  </View>
);

const categories = [
  { id: 1, name: "Electronics", icon: "phone-portrait", color: "#3498db" },
  { id: 2, name: "Fashion", icon: "shirt", color: "#e74c3c" },
  { id: 3, name: "Home & Garden", icon: "home", color: "#27ae60" },
  { id: 4, name: "Sports", icon: "football", color: "#f39c12" },
  { id: 5, name: "Books", icon: "book", color: "#9b59b6" },
  { id: 6, name: "Automotive", icon: "car", color: "#34495e" },
  { id: 7, name: "Health & Beauty", icon: "heart", color: "#e91e63" },
  { id: 8, name: "Toys & Games", icon: "game-controller", color: "#ff5722" },
  { id: 9, name: "Food & Beverages", icon: "restaurant", color: "#795548" },
  { id: 10, name: "Jewelry", icon: "diamond", color: "#607d8b" },
];

// Mock data for products
const products = [
  {
    id: 1,
    name: "iPhone 15 Pro Max offline products",
    price: 1199.99,
    originalPrice: 1299.99,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400",
    rating: 4.8,
    reviews: 328,
    discount: "8% OFF",
    category: "Electronics",
    isNew: true,
    isTrending: true
  },
  {
    id: 2,
    name: "MacBook Pro M3 offline products",
    price: 1999.99,
    originalPrice: 2199.99,
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400",
    rating: 4.9,
    reviews: 456,
    discount: "9% OFF",
    category: "Electronics",
    isNew: true,
    isTrending: true
  },
  {
    id: 3,
    name: "AirPods Pro 2nd Gen offline products",
    price: 249.99,
    originalPrice: 279.99,
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400",
    rating: 4.7,
    reviews: 189,
    discount: "11% OFF",
    category: "Electronics",
    isTrending: true
  },
  {
    id: 4,
    name: "Samsung Galaxy S24 Ultra offline products",
    price: 1199.99,
    originalPrice: 1299.99,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
    rating: 4.6,
    reviews: 267,
    discount: "8% OFF",
    category: "Electronics",
    isNew: true
  },
  {
    id: 5,
    name: "Nike Air Jordan 1 offline products",
    price: 170.99,
    originalPrice: 199.99,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    rating: 4.5,
    reviews: 403,
    discount: "15% OFF",
    category: "Fashion",
    isTrending: true
  },
  {
    id: 6,
    name: "Sony WH-1000XM5 offline products",
    price: 349.99,
    originalPrice: 399.99,
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400",
    rating: 4.9,
    reviews: 245,
    discount: "13% OFF",
    category: "Electronics",
    isTrending: true
  },
  {
    id: 7,
    name: "iPad Pro 12.9 M2 offline products",
    price: 1099.99,
    originalPrice: 1199.99,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400",
    rating: 4.8,
    reviews: 156,
    discount: "8% OFF",
    category: "Electronics",
    isNew: true
  },
  {
    id: 8,
    name: "Canon EOS R6 Mark II offline products",
    price: 2499.99,
    image: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400",
    rating: 4.9,
    reviews: 89,
    category: "Electronics",
    isNew: true
  },
  {
    id: 9,
    name: "Adidas Ultraboost 22 offline products",
    price: 180.99,
    originalPrice: 199.99,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400",
    rating: 4.4,
    reviews: 312,
    discount: "10% OFF",
    category: "Fashion"
  },
  {
    id: 10,
    name: "Nintendo Switch OLED offline products",
    price: 349.99,
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400",
    rating: 4.7,
    reviews: 278,
    category: "Toys & Games",
    isTrending: true
  },
  {
    id: 11,
    name: "Tesla Model Y Accessories Kit offline products",
    price: 299.99,
    originalPrice: 349.99,
    image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400",
    rating: 4.6,
    reviews: 134,
    discount: "14% OFF",
    category: "Automotive"
  },
  {
    id: 12,
    name: "Dyson V15 Detect offline products",
    price: 749.99,
    originalPrice: 849.99,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    rating: 4.8,
    reviews: 167,
    discount: "12% OFF",
    category: "Home & Garden",
    isNew: true
  }
];

// ── ES Animated Logo ──────────────────────────────────────────────────────
const ESLogo = ({ onPress }) => {
  const slideAnim   = useRef(new Animated.Value(-14)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry: slide in + fade
    Animated.parallel([
      Animated.spring(slideAnim,   { toValue: 0, tension: 90, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    // Continuous shimmer sweep across the letters
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
    ).start();
  }, []);

  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 80] });

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateX: slideAnim }], marginRight: 6 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        <View style={{
          backgroundColor: '#1a6fc4',
          borderRadius: 11,
          paddingHorizontal: 11, paddingVertical: 6,
          overflow: 'hidden',
          elevation: 4,
          shadowColor: '#3498db',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.45,
          shadowRadius: 6,
        }}>
          {/* ES text */}
          <Text style={{
            fontSize: 21, fontWeight: '900', color: '#fff',
            letterSpacing: 2,
            textShadowColor: 'rgba(0,0,0,0.25)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}>ES</Text>

          {/* Moving shimmer line across the letters */}
          <Animated.View style={{
            position: 'absolute', top: 0, bottom: 0, width: 28,
            transform: [{ translateX: shimmerX }],
            backgroundColor: 'rgba(255,255,255,0.28)',
            borderRadius: 4,
          }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const UserHome = ({ navigation }) => {
  console.log('UserHome component is rendering');
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cartCount, setCartCount] = useState(3);
  const [wishlistCount, setWishlistCount] = useState(7);
  const [loading, setLoading] = useState(true); // PREVIEW: force skeleton — change back to useState(true) after testing
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const HOME_PAGE_SIZE = 10;
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const isLoadingMore = useRef(false); // guard against rapid-fire calls

  // Reset displayed when filteredProducts changes
  React.useEffect(() => {
    if (filteredProducts.length === 0) { setDisplayedProducts([]); return; }
    setDisplayedProducts(filteredProducts.slice(0, HOME_PAGE_SIZE));
    isLoadingMore.current = false;
  }, [filteredProducts]);

  const loadMoreHome = React.useCallback(() => {
    if (filteredProducts.length === 0) return;
    if (isLoadingMore.current) return; // already loading, skip
    isLoadingMore.current = true;

    setDisplayedProducts(prev => {
      const nextStart = prev.length % filteredProducts.length;
      const chunk = filteredProducts.slice(nextStart, nextStart + HOME_PAGE_SIZE);
      const wrapped = chunk.length < HOME_PAGE_SIZE
        ? [...chunk, ...filteredProducts.slice(0, HOME_PAGE_SIZE - chunk.length)]
        : chunk;
      const loop = Math.floor(prev.length / filteredProducts.length);
      return [...prev, ...wrapped.map(item => ({ ...item, id: `${item.id}_h${loop}_${Date.now()}` }))];
    });

    // Release guard after short delay so rapid scrolling doesn't re-trigger immediately
    setTimeout(() => { isLoadingMore.current = false; }, 600);
  }, [filteredProducts]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [layoutMode, setLayoutMode] = useState(0); // 0=grid 1=list 2=hero 3=mini 4=magazine

  // Fetch products and categories from database
  useEffect(() => {
    fetchProductsAndCategories();
    checkAuthenticationStatus();
    loadWishlistItems();
    loadCartItems();
    updateCounts();
  }, []);

  // Check authentication status periodically and when component updates
  useEffect(() => {
    // Check auth status when component mounts
    checkAuthenticationStatus();
    
    // Set up an interval to check auth status periodically
    const authCheckInterval = setInterval(() => {
      checkAuthenticationStatus();
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(authCheckInterval);
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      console.log('Auth check - Token:', userToken ? 'exists' : 'null');
      console.log('Auth check - UserData:', userData ? 'exists' : 'null');
      
      if (userToken && userData) {
        setIsLoggedIn(true);
        setUser(JSON.parse(userData));
        console.log('User is logged in:', JSON.parse(userData).name);
      } else {
        setIsLoggedIn(false);
        setUser(null);
        console.log('User is not logged in');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  const loadWishlistItems = async () => {
    try {
      const wishlist = await CartWishlistService.getWishlist();
      setWishlistItems(wishlist);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const loadCartItems = async () => {
    try {
      console.log('=== loadCartItems START ===');
      const cart = await CartWishlistService.getCart();
      console.log('Loaded cart from storage:', cart);
      setCartItems(cart);
      console.log('Cart items state updated');
      console.log('=== loadCartItems END ===');
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const updateCounts = async () => {
    try {
      const cartCount = await CartWishlistService.getCartCount();
      const wishlistCount = await CartWishlistService.getWishlistCount();
      setCartCount(cartCount);
      setWishlistCount(wishlistCount);
    } catch (error) {
      console.error('Error updating counts:', error);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      const result = await CartWishlistService.addToCart(product);
      if (result.success) {
        CartWishlistService.showAddToCartAlert(product.name);
        loadCartItems();
        updateCounts();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleDirectQuantityUpdate = async (product, action) => {
    try {
      console.log(`=== handleDirectQuantityUpdate START ===`);
      console.log(`Product:`, product.id, product.name);
      console.log(`Action:`, action);
      console.log(`Current cart items:`, cartItems);
      
      if (action === 'increase') {
        console.log('Attempting to increase quantity...');
        // Add one more to cart
        const result = await CartWishlistService.addToCart(product, 1);
        console.log('AddToCart result:', result);
        
        if (result.success) {
          console.log('Successfully increased quantity');
          // Force reload cart
          setTimeout(() => {
            console.log('Reloading cart items...');
            loadCartItems();
            updateCounts();
          }, 100);
        } else {
          console.error('Failed to increase quantity:', result);
        }
      } else if (action === 'decrease') {
        console.log('Attempting to decrease quantity...');
        // Get current quantity and decrease by 1
        const currentCart = await CartWishlistService.getCart();
        const currentItem = currentCart.find(item => item.id === product.id);
        
        if (currentItem) {
          const newQuantity = currentItem.quantity - 1;
          console.log(`Decreasing from ${currentItem.quantity} to ${newQuantity}`);
          
          if (newQuantity <= 0) {
            const result = await CartWishlistService.removeFromCart(product.id);
            if (result.success) {
              console.log('Successfully removed item from cart');
            }
          } else {
            const result = await CartWishlistService.updateCartQuantity(product.id, newQuantity);
            if (result.success) {
              console.log('Successfully decreased quantity');
            }
          }
          // Force reload cart
          setTimeout(() => {
            loadCartItems();
            updateCounts();
          }, 100);
        }
      }
      console.log(`=== handleDirectQuantityUpdate END ===`);
    } catch (error) {
      console.error('Error in direct quantity update:', error);
    }
  };

  const handleToggleWishlist = async (product) => {
    try {
      const result = await CartWishlistService.toggleWishlist(product);
      if (result.success) {
        if (result.action === 'added') {
          CartWishlistService.showAddToWishlistAlert(product.name);
        } else {
          CartWishlistService.showRemoveFromWishlistAlert(product.name);
        }
        loadWishlistItems();
        updateCounts();
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const getCartItem = (productId) => {
    return cartItems.find(item => item.id === productId);
  };

  const getCartQuantity = (productId) => {
    const cartItem = getCartItem(productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const isInCart = (productId) => {
    return getCartQuantity(productId) > 0;
  };

  const fetchProductsAndCategories = async () => {
    try {
      setLoading(true);

      // --- Cache check: only re-fetch if DB has newer data ---
      const cached = await loadProductsCache();
      if (cached && cached.products.length > 0) {
        try {
          const tsRes = await fetch(`${API_BASE}/products/latest-update`);
          const tsData = await tsRes.json();
          const serverTs = tsData.lastUpdated ? new Date(tsData.lastUpdated).getTime() : 0;
          if (serverTs <= cached.cachedAt) {
            // Nothing changed — use cache
            setAllProducts(cached.products);
            setFilteredProducts(cached.products);
            setCategories(cached.categories);
            setLoading(false);
            return;
          }
        } catch (_) {
          // If timestamp check fails, fall through to full fetch
        }
      }

      // Fetch products
      const productsResponse = await fetch(`${API_BASE}/products`);
      const productsData = await productsResponse.json();
      
      if (productsData.success && productsData.products && productsData.products.length > 0) {
        // Transform database products to match UI format
        const transformedProducts = productsData.products.map(product => {
          const hasCampaign = product.hasCampaign && product.campaign;

          // 3-tier pricing:
          // regularPrice  = original full price (always crossed out if higher than salePrice)
          // salePrice     = seller's set sale price (crossed out when campaign active)
          // campaignPrice = final price after campaign discount
          const finalPrice    = hasCampaign ? product.campaignPrice : product.salePrice;
          const regularPrice  = product.regularPrice > product.salePrice ? product.regularPrice : null;

          const discountLabel = hasCampaign
            ? (product.campaign.type === 'free_shipping'
                ? 'FREE SHIP'
                : product.campaign.discountType === 'percentage'
                  ? `${product.campaign.discountValue}% OFF`
                  : `UGX ${product.campaign.discountValue?.toLocaleString()} OFF`)
            : (regularPrice
                ? `${Math.round((1 - product.salePrice / product.regularPrice) * 100)}% OFF`
                : null);

          return {
            id: product._id,
            name: product.title,
            price: finalPrice,                          // final displayed price
            salePrice: product.salePrice,               // seller's sale price (shown crossed when campaign active)
            regularPrice,                               // original price (shown crossed always if higher)
            originalPrice: hasCampaign
              ? product.salePrice                       // crossed-out = salePrice when campaign active
              : regularPrice,                           // crossed-out = regularPrice normally
            campaignPrice: hasCampaign ? product.campaignPrice : null,
            image: product.images?.[0]?.url || product.images?.[0]?.uri || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
            images: product.images || [],
            videoUrl: product.videoUrl || '',
            rating: 4.5 + Math.random() * 0.5,
            reviews: Math.floor(Math.random() * 200) + 50,
            discount: discountLabel,
            campaign: product.campaign || null,
            hasCampaign: !!hasCampaign,
            campaignBannerColor: product.campaign?.bannerColor || null,
            category: product.category,
            subCategory: product.subCategory,
            brand: product.brand || '',
            description: product.description || '',
            stock: product.stock || 0,
            sellerId: product.sellerId,
            paymentMethods: product.paymentMethods || {},
            cashOnDelivery: product.cashOnDelivery || 'No',
            seller: product.sellerId ? {
              name: product.sellerId.shop?.shopName || product.sellerId.shopName || 'Unknown Shop',
              verified: product.sellerId.verified || false,
              email: product.sellerId.email || '',
              phone: product.sellerId.phoneNumber || product.sellerId.phone || ''
            } : null,
            isNew: new Date(product.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            isTrending: Math.random() > 0.5,
          };
        });
        
        setAllProducts(transformedProducts);
        setFilteredProducts(transformedProducts);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(transformedProducts.map(p => p.category))];
        const categoryData = uniqueCategories.map((cat, index) => ({
          id: index + 1,
          name: cat,
          icon: getCategoryIcon(cat),
          color: getCategoryColor(cat)
        }));
        
        setCategories(categoryData);
        // Save fresh data to cache
        saveProductsCache(transformedProducts, categoryData);
      } else {
        // API responded but no products found — use mock data
        console.warn('No products returned from API, using fallback data');
        setAllProducts(products);
        setFilteredProducts(products);
      }
      
    } catch (error) {
      console.error('Error fetching products:', error, '\nAPI_BASE:', API_BASE);
      // Fallback to mock data if API fails
      setAllProducts(products);
      setFilteredProducts(products);
      setCategories([
        { id: 1, name: "Electronics", icon: "phone-portrait", color: "#3498db" },
        { id: 2, name: "Fashion", icon: "shirt", color: "#e74c3c" },
        { id: 3, name: "Health & Beauty", icon: "heart", color: "#e91e63" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Electronics': 'phone-portrait',
      'Fashion': 'shirt',
      'Health & Beauty': 'heart',
      'Home & Garden': 'home',
      'Sports': 'football',
      'Books': 'book',
      'Automotive': 'car',
      'Toys & Games': 'game-controller',
      'Food & Beverages': 'restaurant',
      'Jewelry': 'diamond',
    };
    return iconMap[category] || 'grid';
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      'Electronics': '#3498db',
      'Fashion': '#e74c3c',
      'Health & Beauty': '#e91e63',
      'Home & Garden': '#27ae60',
      'Sports': '#f39c12',
      'Books': '#9b59b6',
      'Automotive': '#34495e',
      'Toys & Games': '#ff5722',
      'Food & Beverages': '#795548',
      'Jewelry': '#607d8b',
    };
    return colorMap[category] || '#95a5a6';
  };

  useEffect(() => {
    let filtered = allProducts;
    
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.subCategory?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, allProducts]);

  // Dynamic suggested products based on search and category
  const getSuggestedProducts = () => {
    if (searchQuery) {
      // If searching, show search results as suggestions
      return filteredProducts.slice(0, 4);
    } else if (selectedCategory) {
      // If category selected, show products from that category
      return allProducts.filter(p => p.category === selectedCategory).slice(0, 4);
    } else {
      // Default: show trending products
      return allProducts.filter(p => p.isTrending).slice(0, 4);
    }
  };

  const suggestedProducts = getSuggestedProducts();
  const trendingProducts = allProducts.filter(p => p.isTrending);
  const newProducts = allProducts.filter(p => p.isNew);

  // Generate search suggestions based on query
  const generateSearchSuggestions = (query) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const suggestions = [];
    const queryLower = query.toLowerCase();

    // Product name suggestions
    const productSuggestions = allProducts
      .filter(product => product.name.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map(product => ({
        type: 'product',
        text: product.name,
        icon: 'phone-portrait',
        category: product.category
      }));

    // Category suggestions
    const categorySuggestions = categories
      .filter(cat => cat.name.toLowerCase().includes(queryLower))
      .slice(0, 2)
      .map(cat => ({
        type: 'category',
        text: cat.name,
        icon: cat.icon,
        category: cat.name
      }));

    // Popular search terms (you can customize these)
    const popularTerms = [
      'iPhone', 'Samsung', 'MacBook', 'AirPods', 'iPad', 'Laptop', 'Phone', 'Headphones'
    ];
    
    const popularSuggestions = popularTerms
      .filter(term => term.toLowerCase().includes(queryLower))
      .slice(0, 2)
      .map(term => ({
        type: 'popular',
        text: term,
        icon: 'trending-up',
        category: null
      }));

    suggestions.push(...productSuggestions, ...categorySuggestions, ...popularSuggestions);
    
    setSearchSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
    setShowSuggestions(suggestions.length > 0);
  };

  // Handle search query change
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    generateSearchSuggestions(query);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    
    if (suggestion.type === 'category') {
      setSelectedCategory(suggestion.category);
    } else {
      setSelectedCategory(null);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setSelectedCategory(null);
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.headerContent}>
          {showSearchBar ? (
            // Expanded search mode
            <View style={styles.searchMode}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search EasyShop..."
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholderTextColor="#999"
                  autoFocus
                />
                <TouchableOpacity style={styles.closeSearchButton} onPress={() => { setShowSearchBar(false); clearSearch(); }}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {showSuggestions && searchSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {searchSuggestions.map((suggestion, index) => (
                    <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSuggestionSelect(suggestion)}>
                      <View style={styles.suggestionIcon}>
                        <Ionicons name={suggestion.icon} size={16} color={suggestion.type === 'category' ? '#3498db' : suggestion.type === 'popular' ? '#f39c12' : '#666'} />
                      </View>
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionText}>{suggestion.text}</Text>
                        {suggestion.category && <Text style={styles.suggestionCategory}>in {suggestion.category}</Text>}
                      </View>
                      <Text style={styles.suggestionTypeText}>{suggestion.type === 'category' ? 'Category' : suggestion.type === 'popular' ? 'Popular' : 'Product'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            // Normal mode — logo + search bar + wishlist + cart
            <View style={styles.topRow}>
              {/* Search bar (tappable, expands) */}
              <TouchableOpacity style={styles.searchBarBtn} onPress={() => setShowSearchBar(true)} activeOpacity={0.8}>
                <Ionicons name="search" size={16} color="#aaa" />
                <Text style={styles.searchBarPlaceholder}>Search products...</Text>
              </TouchableOpacity>

              {/* Wishlist */}
              <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('Wishlist')}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="heart" size={24} color="#e74c3c" />
                  {wishlistCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{wishlistCount > 99 ? '99+' : wishlistCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Cart */}
              <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('Cart')}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="cart" size={24} color="#f39c12" />
                  {cartCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AllCategories')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <CategorySkeleton />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoriesContainer}>
            <TouchableOpacity
              style={[styles.categoryCard, !selectedCategory && styles.activeCategoryCard]}
              onPress={() => setSelectedCategory(null)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: '#95a5a6' }]}>
                <Ionicons name="grid" size={20} color="white" />
              </View>
              <Text style={[styles.categoryName, !selectedCategory && styles.activeCategoryName]}>All</Text>
            </TouchableOpacity>
            
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.name && styles.activeCategoryCard
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                  <Ionicons name={category.icon} size={20} color="white" />
                </View>
                <Text style={[
                  styles.categoryName,
                  selectedCategory === category.name && styles.activeCategoryName
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderProductCard = ({ item, isLarge = false }) => (
    <TouchableOpacity 
      style={[styles.productCard, isLarge && styles.largeProductCard]}
      onPress={() => {
        navigation.navigate('ProductDetails', { product: item });
      }}
      activeOpacity={0.7}
    >
      {/* Campaign badge takes priority over regular discount badge */}
      {item.hasCampaign && item.discount ? (
        <View style={[styles.discountBadge, { backgroundColor: item.campaignBannerColor || '#e74c3c' }]}>
          <Ionicons name="flash" size={9} color="#fff" />
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
      ) : item.discount ? (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
      ) : null}
      
      {item.isNew && !item.hasCampaign && (
        <View style={styles.newBadge}>
          <Text style={styles.newText}>NEW</Text>
        </View>
      )}

      {/* Campaign type label (flash sale, bundle etc) */}
      {item.hasCampaign && item.campaign?.type === 'flash_sale' && (
        <View style={[styles.newBadge, { backgroundColor: '#f39c12', right: 8, left: undefined }]}>
          <Text style={styles.newText}>⚡ FLASH</Text>
        </View>
      )}
      
      {/* Wishlist Heart Icon */}
      <TouchableOpacity 
        style={styles.wishlistButton}
        onPress={() => handleToggleWishlist(item)}
      >
        <Ionicons 
          name={isInWishlist(item.id) ? "heart" : "heart-outline"} 
          size={20} 
          color={isInWishlist(item.id) ? "#e74c3c" : "#bdc3c7"} 
        />
      </TouchableOpacity>
      
      <AutoImage
        images={item.images?.length > 0 ? item.images : [{ url: item.image }]}
        style={[styles.productImage, isLarge && styles.largeProductImage]}
        intervalMs={3500}
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.categoryLabel}>{item.category}</Text>
        <Text style={[styles.productName, isLarge && styles.largeProductName]} numberOfLines={2}>
          {item.name}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color="#f39c12" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewText}>({item.reviews})</Text>
        </View>
        
        <View style={styles.priceContainer}>
          {/* Regular price — always crossed out if higher than sale price */}
          {item.regularPrice && (
            <Text style={styles.originalPrice}>
              UGX {item.regularPrice?.toLocaleString()}
            </Text>
          )}

          {/* Sale price — crossed out only when campaign is active */}
          {item.hasCampaign && item.salePrice && item.salePrice !== item.regularPrice && (
            <Text style={[styles.originalPrice, { color: '#f39c12', textDecorationLine: 'line-through' }]}>
              UGX {item.salePrice?.toLocaleString()}
            </Text>
          )}

          {/* Final price — campaign price or sale price */}
          <Text style={[styles.productPrice, isLarge && styles.largeProductPrice,
            item.hasCampaign && { color: item.campaignBannerColor || '#e74c3c' }
          ]}>
            UGX {item.price?.toLocaleString() || 0}
          </Text>

          {/* Campaign label */}
          {item.hasCampaign && item.discount && (
            <View style={[styles.campaignPriceBadge, { backgroundColor: item.campaignBannerColor || '#e74c3c' }]}>
              <Text style={styles.campaignPriceBadgeText}>{item.discount}</Text>
            </View>
          )}
        </View>
        
        {/* Dynamic Cart Button/Quantity Controls */}
        {isInCart(item.id) ? (
          <QuantitySelector
            product={item}
            currentQuantity={getCartQuantity(item.id)}
            onQuantityChange={(newQuantity) => {
              if (newQuantity === 0) {
                CartWishlistService.removeFromCart(item.id).then(() => {
                  loadCartItems();
                  updateCounts();
                });
              } else {
                CartWishlistService.updateCartQuantity(item.id, newQuantity).then(() => {
                  loadCartItems();
                  updateCounts();
                });
              }
            }}
            compact={true}
            style={styles.quantityControlsContainer}
          />
        ) : (
          <TouchableOpacity 
            style={[styles.addToCartButton, isLarge && styles.largeAddToCartButton]}
            onPress={() => handleAddToCart(item)}
          >
            <Ionicons name="cart-outline" size={14} color="white" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSuggestedProducts = () => {
    const getSectionTitle = () => {
      if (searchQuery) {
        return `Search Results for "${searchQuery}"`;
      } else if (selectedCategory) {
        return `${selectedCategory} Products`;
      } else {
        return 'Suggested Products';
      }
    };

    const getSectionSubtitle = () => {
      if (searchQuery) {
        return `${suggestedProducts.length} products found`;
      } else if (selectedCategory) {
        return `Popular in ${selectedCategory}`;
      } else {
        return 'Handpicked for you';
      }
    };

    return (
      <View style={styles.suggestedSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
            <Text style={styles.sectionSubtitle}>{getSectionSubtitle()}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ShopAllProducts', { category: selectedCategory, searchQuery })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <SuggestedSkeleton />
        ) : suggestedProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={32} color="#bdc3c7" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try different keywords' : 'No products available'}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.suggestedContainer}>
              {suggestedProducts.map((item) => (
                <View key={item.id} style={styles.suggestedProductWrapper}>
                  {renderProductCard({ item, isLarge: false })}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderProductGrid = () => {
    const LAYOUT_ICONS = ['grid', 'list', 'albums', 'apps', 'newspaper'];
    const LAYOUT_LABELS = ['Grid', 'List', 'Hero', 'Mini', 'Magazine'];

    const cardProps = (item) => ({
      item,
      onPress: () => navigation.navigate('ProductDetails', { product: item }),
      onWishlist: () => handleToggleWishlist(item),
      onAddToCart: () => handleAddToCart(item),
      onQtyChange: (qty) => {
        if (qty === 0) {
          CartWishlistService.removeFromCart(item.id).then(() => { loadCartItems(); updateCounts(); });
        } else {
          CartWishlistService.updateCartQuantity(item.id, qty).then(() => { loadCartItems(); updateCounts(); });
        }
      },
      inWishlist: isInWishlist(item.id),
      cartQty: getCartQuantity(item.id),
    });

    const renderMagazineLayout = () => {
      const rows = [];
      for (let i = 0; i < filteredProducts.length; i += 3) {
        const big = filteredProducts[i];
        const small1 = filteredProducts[i + 1];
        const small2 = filteredProducts[i + 2];
        rows.push(
          <View key={i}>
            {big && <CardMagazine {...cardProps(big)} tall />}
            {(small1 || small2) && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {small1 && <CardMagazine {...cardProps(small1)} />}
                {small2 && <CardMagazine {...cardProps(small2)} />}
              </View>
            )}
          </View>
        );
      }
      return <View style={{ paddingHorizontal: 16 }}>{rows}</View>;
    };

    const renderMiniLayout = () => {
      const rows = [];
      for (let i = 0; i < filteredProducts.length; i += 3) {
        rows.push(
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            {filteredProducts.slice(i, i + 3).map(item => <CardMini key={item.id} {...cardProps(item)} />)}
          </View>
        );
      }
      return <View>{rows}</View>;
    };

    return (
      <View style={styles.productGridSection}>
        {/* Section header with layout switcher */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? `${selectedCategory} Products` : 'All Products'}
            </Text>
            <Text style={{ fontSize: 12, color: '#999', marginTop: 1 }}>{filteredProducts.length} products</Text>
          </View>
          <View style={layoutSwitcherStyle.row}>
            {LAYOUT_ICONS.map((icon, idx) => (
              <TouchableOpacity
                key={idx}
                style={[layoutSwitcherStyle.btn, layoutMode === idx && layoutSwitcherStyle.btnActive]}
                onPress={() => setLayoutMode(idx)}
              >
                <Ionicons name={`${icon}-outline`} size={16} color={layoutMode === idx ? '#fff' : '#666'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <GridSkeleton />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {selectedCategory ? `No products in ${selectedCategory} category` : 'Try adjusting your search'}
            </Text>
          </View>
        ) : layoutMode === 0 ? (
          // Grid 2-col
          <View style={styles.productGrid}>
            <FlatList
              data={displayedProducts}
              renderItem={({ item }) => <CardGrid {...cardProps(item)} />}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>
        ) : layoutMode === 1 ? (
          // List
          <View style={{ paddingHorizontal: 16 }}>
            {displayedProducts.map(item => <CardList key={item.id} {...cardProps(item)} />)}
          </View>
        ) : layoutMode === 2 ? (
          // Hero
          <View style={{ paddingHorizontal: 16 }}>
            {displayedProducts.map(item => <CardHero key={item.id} {...cardProps(item)} />)}
          </View>
        ) : layoutMode === 3 ? (
          // Mini 3-col
          <View>
            {(() => {
              const rows = [];
              for (let i = 0; i < displayedProducts.length; i += 3) {
                rows.push(
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                    {displayedProducts.slice(i, i + 3).map(item => <CardMini key={item.id} {...cardProps(item)} />)}
                  </View>
                );
              }
              return rows;
            })()}
          </View>
        ) : (
          // Magazine
          <View>
            {(() => {
              const rows = [];
              for (let i = 0; i < displayedProducts.length; i += 3) {
                const big = displayedProducts[i];
                const small1 = displayedProducts[i + 1];
                const small2 = displayedProducts[i + 2];
                rows.push(
                  <View key={i}>
                    {big && <CardMagazine {...cardProps(big)} tall />}
                    {(small1 || small2) && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        {small1 && <CardMagazine {...cardProps(small1)} />}
                        {small2 && <CardMagazine {...cardProps(small2)} />}
                      </View>
                    )}
                  </View>
                );
              }
              return rows;
            })()}
          </View>
        )}

        {/* Auto infinite loop footer — triggers when scrolled into view */}
        {displayedProducts.length > 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ height: 1, width: 40, backgroundColor: '#e8e8e8' }} />
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0,1,2].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#d0d0d0' }} />)}
              </View>
              <View style={{ height: 1, width: 40, backgroundColor: '#e8e8e8' }} />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header - Fixed at top */}
      {renderHeader()}

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={{ paddingBottom: 60 + Math.max(insets.bottom, 8) + 20 }}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (!contentSize?.height) return;
          const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
          if (distanceFromBottom < 400) loadMoreHome();
        }}
      >
        {renderCategories()}
        {renderSuggestedProducts()}
        {renderProductGrid()}
      </ScrollView>

      {/* Floating Bottom Navigation Bar */}
      <View style={[styles.bottomNavSafe, { 
        paddingBottom: Math.max(insets.bottom, 8),
        height: 60 + Math.max(insets.bottom, 8)
      }]}>
        <View style={styles.bottomNav}>
          {[
            { label: 'Home',       icon: 'home',                        screen: 'home',                              active: true },
            { label: 'Categories', icon: 'grid-outline',                screen: 'AllCategories' },
            { label: 'Products',   icon: 'cube-outline',                screen: 'ShopAllProducts' },
            { label: 'AI',         icon: 'chatbubble-ellipses-outline', screen: 'ShopAI' },
            { label: 'Orders',     icon: 'receipt-outline',             screen: 'UserOrders' },
            { label: 'Account',    icon: 'person-circle-outline',       screen: isLoggedIn ? 'UserProfile' : 'Login' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.label}
              style={styles.bottomNavItem}
              onPress={() => navigation.navigate(tab.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.bottomNavIconWrap}>
                <Ionicons
                  name={tab.active ? tab.icon.replace('-outline', '') : tab.icon}
                  size={24}
                  color={tab.active ? '#3498db' : '#888'}
                />
                {tab.badge > 0 && (
                  <View style={styles.bottomNavBadge}>
                    <Text style={styles.bottomNavBadgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.bottomNavLabel, tab.active && { color: '#3498db' }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header Styles - Fixed at top
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    }),
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3498db',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  searchBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBarPlaceholder: {
    fontSize: 14,
    color: '#aaa',
    flex: 1,
  },
  headerIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  headerIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 46,
    height: 46,
    borderRadius: 18,
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Search Mode Styles
  searchMode: {
    paddingTop: 4,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f2f6',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 36,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  closeSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  
  // Search Suggestions Styles
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 15,
    zIndex: 1001,
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  suggestionType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
  },
  suggestionTypeText: {
    fontSize: 10,
    color: '#3498db',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  
  // Scrollable container
  scrollContainer: {
    flex: 1,
    ...Platform.select({
      web: { marginBottom: 65 },
    }),
  },
  
  // Categories Section
  categoriesSection: {
    backgroundColor: 'white',
    paddingVertical: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 16,
    minWidth: 80,
    backgroundColor: '#f8f9fa',
  },
  activeCategoryCard: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#2c3e50',
    textAlign: 'center',
    fontWeight: '500',
  },
  activeCategoryName: {
    color: '#3498db',
    fontWeight: '600',
  },
  
  // Suggested Products
  suggestedSection: {
    backgroundColor: 'white',
    paddingVertical: 20,
    marginBottom: 8,
  },
  suggestedContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  suggestedProductWrapper: {
    marginRight: 12,
  },
  
  // Product Grid
  productGridSection: {
    backgroundColor: 'white',
    paddingVertical: 20,
    marginBottom: 8,
  },
  productCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productCount: {
    fontSize: 14,
    color: '#666',
  },
  filterButton: {
    padding: 4,
  },
  productGrid: {
    paddingHorizontal: 16,
  },
  gridContent: {
    paddingBottom: 16,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  
  // Product Card
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    width: (width - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f2f6',
  },
  largeProductCard: {
    width: (width - 64) / 2.2,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 48,
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
    top: 8,
    left: 8,
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
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  largeProductImage: {
    height: 160,
  },
  productInfo: {
    padding: 12,
  },
  categoryLabel: {
    fontSize: 10,
    color: '#3498db',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 18,
  },
  largeProductName: {
    fontSize: 15,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 11,
    color: '#95a5a6',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  largeProductPrice: {
    fontSize: 17,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  largeProductPrice: {
    fontSize: 17,
  },
  originalPrice: {
    fontSize: 12,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
  },
  campaignPriceBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  campaignPriceBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  addToCartButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  largeAddToCartButton: {
    paddingVertical: 12,
  },
  addToCartText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Quantity Controls
  quantityControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  quantityButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  quantityDisplay: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    minWidth: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  // Footer Section
  footerSection: {
    backgroundColor: '#115061',
    marginTop: 20,
  },
  ctaContainer: {
    paddingVertical: width > 768 ? 60 : 40,
    paddingHorizontal: width > 768 ? 40 : 20,
    alignItems: 'center',
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
    marginBottom: 15,
  },
  ctaButtonText: {
    color: '#115061',
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
  },
  sellerLoginButton: {
    paddingVertical: 10,
  },
  sellerLoginText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  
  // Footer Links
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  footerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  footerColumnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  footerLink: {
    paddingVertical: 5,
  },
  footerLinkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  
  // Footer Bottom
  footerBottom: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  socialMedia: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 15,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyrightText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 10,
  },
  appInfo: {
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  
  // Bottom spacing (keeping for compatibility)
  bottomSpacing: {
    height: 20,
  },

  // Floating Bottom Nav Bar
  bottomNavSafe: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    ...Platform.select({
      web: { boxShadow: '0 -3px 12px rgba(0,0,0,0.1)' },
    }),
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bottomNavIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavBadge: {
    position: 'absolute',
    top: -4, right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bottomNavBadgeText: {
    color: '#fff', fontSize: 9, fontWeight: '800',
  },
  bottomNavLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  
  // Loading and Empty States
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

const layoutSwitcherStyle = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  btn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  btnActive: { backgroundColor: '#3498db' },
});

export default UserHome;
