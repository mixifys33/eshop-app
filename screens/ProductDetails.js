import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  Share,
  Animated,
  FlatList,
  Modal,
  Linking,
  Platform,
  PanResponder,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import CartWishlistService from '../services/cartWishlistService';
import QuantitySelector from '../components/QuantitySelector';
import ProductAIChat from '../components/ProductAIChat';
import API_BASE from '../constants/api';

const { width, height } = Dimensions.get('window');

// Zoomable Image Component
const ZoomableImageView = ({ uri }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [isZoomed, setIsZoomed] = useState(false);
  const lastTap = useRef(null);

  const handleDoubleTap = () => {
    if (isZoomed) {
      // Zoom out
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
      setIsZoomed(false);
    } else {
      // Zoom in
      Animated.spring(scale, {
        toValue: 2.5,
        useNativeDriver: true,
      }).start();
      setIsZoomed(true);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => isZoomed,
      onPanResponderGrant: (evt) => {
        // Double tap detection
        const now = Date.now();
        if (lastTap.current && (now - lastTap.current) < 300) {
          handleDoubleTap();
        }
        lastTap.current = now;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isZoomed) {
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        if (isZoomed) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.fullScreenImageWrapper} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        style={[
          styles.fullScreenImage,
          {
            transform: [
              { scale },
              { translateX },
              { translateY },
            ],
          },
        ]}
        resizeMode="contain"
      />
      {!isZoomed && (
        <View style={styles.zoomHintContainer}>
          <Ionicons name="expand-outline" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.zoomHintText}>Double tap to zoom</Text>
        </View>
      )}
    </View>
  );
};

const ProductDetails = ({ navigation, route }) => {
  // Debug logging
  console.log('=== ProductDetails Screen Loaded ===');
  console.log('Route params:', route.params);
  
  // Handle missing product data
  if (!route.params || !route.params.product) {
    console.error('No product data provided to ProductDetails');
    return (
      <View style={styles.container}>
        <Text style={{ padding: 20, textAlign: 'center' }}>
          Error: No product data available
        </Text>
        <TouchableOpacity 
          style={{ padding: 10, backgroundColor: '#3498db', margin: 20, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const { product: initialProduct } = route.params;
  console.log('Initial product:', initialProduct);
  
  const [product, setProduct] = useState(initialProduct);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isInCart, setIsInCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [currentModalIndex, setCurrentModalIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoModalUrl, setVideoModalUrl] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatSuggestions, setAiChatSuggestions] = useState([]);
  const [aiChatHistories, setAiChatHistories] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedTab, setSelectedTab] = useState(null); // Start with no tab selected
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerOpacity, setHeaderOpacity] = useState(0);
  const flatListRef = useRef(null);
  const autoScrollInterval = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);

  // Delivery options from seller
  const [deliveryOptions, setDeliveryOptions] = useState(null);

  // Helper function to extract YouTube video ID and generate thumbnail
  const getYouTubeThumbnail = (url) => {
    try {
      let videoId = '';
      
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
      }
      
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } catch (error) {
      console.error('Error extracting YouTube thumbnail:', error);
    }
    
    return 'https://via.placeholder.com/400x400?text=Video';
  };

  // Main useEffect that runs when component mounts or product changes
  useEffect(() => {
    console.log('ProductDetails useEffect running...');
    console.log('Route params changed, updating product:', route.params?.product);
    
    // Update product state when route params change
    if (route.params?.product) {
      setProduct(route.params.product);
    }
    
    loadProductData();
    loadRelatedProducts();
    loadReviews();
    checkCartAndWishlistStatus();
    // Fetch seller delivery options
    const sid = initialProduct?.sellerId?._id || initialProduct?.sellerId;
    if (sid) {
      fetch(`${API_BASE}/delivery/options/${sid}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.success) setDeliveryOptions(d); })
        .catch(() => {});
    }
    
    // Reset states for new product
    setSelectedImageIndex(0);
    setSelectedTab(null); // Reset to collapsed state
    setShowImageModal(false);
    
    // Set loading to false after data is loaded
    const timer = setTimeout(() => {
      setLoading(false);
      console.log('ProductDetails loading complete for:', route.params?.product?.name);
    }, 100);

    // Start auto-scroll for images
    startAutoScroll();
    
    // Start border animation
    startBorderAnimation();
    
    // Load cart and wishlist data - SAME AS UserHome
    loadCartItems();
    loadWishlistItems();
    updateCounts();

    return () => {
      clearTimeout(timer);
      stopAutoScroll();
    };
  }, [route.params?.product?.id]); // Only re-run when product ID changes

  // Add focus listener to update counts when screen comes into focus
  useEffect(() => {
    if (navigation && typeof navigation.addListener === 'function') {
      const unsubscribe = navigation.addListener('focus', () => {
        console.log('🔄 ProductDetails screen focused, refreshing counts...');
        loadCartItems();
        loadWishlistItems();
        updateCounts();
        checkCartAndWishlistStatus();
      });

      return unsubscribe;
    }
  }, [navigation]);

  // Update isInCart and isInWishlist when items change
  useEffect(() => {
    if (product && product.id) {
      setIsInCart(isInCartCheck(product.id));
      setCartQuantity(getCartQuantity(product.id));
      setIsInWishlist(isInWishlistCheck(product.id));
    }
  }, [cartItems, wishlistItems, product]);

  // Border animation effect
  const startBorderAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  };

  // Load cart and wishlist counts - EXACT SAME AS UserHome
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

  const loadCartItems = async () => {
    try {
      const cart = await CartWishlistService.getCart();
      setCartItems(cart);
    } catch (error) {
      console.error('Error loading cart:', error);
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

  const getCartItem = (productId) => {
    return cartItems.find(item => item.id === productId);
  };

  const getCartQuantity = (productId) => {
    const cartItem = getCartItem(productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const isInCartCheck = (productId) => {
    return getCartQuantity(productId) > 0;
  };

  const isInWishlistCheck = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  // Auto-scroll removed — manual scroll only
  const startAutoScroll = () => {}; // no-op, kept so existing call sites don't break

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  // Update selected index when user manually scrolls
  const handleManualScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setSelectedImageIndex(index);
  };

  const loadProductData = useCallback(async () => {
    // Only enhance product if it doesn't already have enhanced data
    if (!product.seller || !product.shipping) {
      const enhancedProduct = {
        ...product,
        images: product.images || [product.image],
        description: product.description || generateDescription(product),
        specifications: product.specifications || generateSpecifications(product),
        features: product.features || generateFeatures(product),
        seller: product.seller || {
          name: 'Premium Store Uganda',
          rating: 4.8,
          location: 'Kampala, Uganda',
          verified: true
        },
        shipping: product.shipping || {
          freeShipping: product.price > 50000,
          estimatedDays: '2-3 days',
          cost: product.price > 50000 ? 0 : 5000
        },
        stock: product.stock || Math.floor(Math.random() * 50) + 10,
        tags: product.tags || [product.category?.toLowerCase(), 'popular', 'trending']
      };
      
      setProduct(enhancedProduct);
    }
  }, [product.id]); // Only recreate when product ID changes

  const generateDescription = (prod) => {
    return `Experience the premium quality of ${prod.name}. This exceptional ${prod.category?.toLowerCase()} item combines cutting-edge technology with elegant design to deliver outstanding performance. Perfect for those who demand excellence and reliability in their everyday essentials.

Key highlights include superior build quality, innovative features, and exceptional value for money. Whether you're a professional or enthusiast, this product will exceed your expectations and provide long-lasting satisfaction.

Backed by our quality guarantee and excellent customer service, you can purchase with confidence knowing you're getting a premium product at an unbeatable price.`;
  };

  const generateSpecifications = (prod) => {
    const baseSpecs = {
      'Brand': prod.brand || 'Premium Brand',
      'Model': prod.model || 'Latest Model',
      'Category': prod.category || 'General',
      'Condition': 'Brand New',
      'Warranty': '1 Year Manufacturer Warranty'
    };

    // Add category-specific specs
    if (prod.category === 'Electronics') {
      return {
        ...baseSpecs,
        'Display': '6.1" Super Retina XDR',
        'Processor': 'A16 Bionic Chip',
        'Storage': '128GB',
        'Camera': '48MP Main Camera',
        'Battery': 'All-day battery life',
        'Connectivity': '5G, Wi-Fi 6, Bluetooth 5.3'
      };
    } else if (prod.category === 'Fashion') {
      return {
        ...baseSpecs,
        'Material': 'Premium Quality Fabric',
        'Sizes Available': 'S, M, L, XL, XXL',
        'Colors': 'Multiple Colors Available',
        'Care Instructions': 'Machine Washable',
        'Origin': 'Imported'
      };
    }

    return baseSpecs;
  };

  const generateFeatures = (prod) => {
    const baseFeatures = [
      'Premium Quality Materials',
      'Excellent Build Quality',
      'Great Value for Money',
      'Fast Delivery Available'
    ];

    if (prod.category === 'Electronics') {
      return [
        ...baseFeatures,
        'Latest Technology',
        'Energy Efficient',
        'User-Friendly Interface',
        'Durable Design',
        'Advanced Features'
      ];
    } else if (prod.category === 'Fashion') {
      return [
        ...baseFeatures,
        'Comfortable Fit',
        'Stylish Design',
        'Versatile Style',
        'Easy Care',
        'Trendy Colors'
      ];
    }

    return baseFeatures;
  };

  const loadRelatedProducts = useCallback(async () => {
    try {
      console.log('Loading related products for product:', product.id);
      console.log('Product category:', product.category, 'subcategory:', product.subCategory);
      
      // Try the API endpoint first (should work after server restart)
      try {
        console.log('🔗 Trying API endpoint...');
        const response = await fetch(`${API_BASE}/products/${product.id}/related?limit=6`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.products && data.products.length > 0) {
            console.log(`✅ API SUCCESS: Found ${data.products.length} related products:`, data.products);
            setRelatedProducts(data.products);
            return;
          } else {
            console.log('⚠️ API returned no products:', data);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ API failed with status ${response.status}:`, errorText);
        }
      } catch (apiError) {
        console.log('❌ API endpoint error:', apiError.message);
      }
      
      // Fallback: Fetch all products and filter client-side
      console.log('🔄 Using client-side filtering for related products...');
      const response = await fetch(`${API_BASE}/products`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.products && data.products.length > 0) {
        console.log(`📦 Fetched ${data.products.length} total products for filtering`);
        
        // Filter out current product and inactive products
        const availableProducts = data.products.filter(p => 
          p._id !== product.id && 
          p.status === 'active' && 
          p.stock > 0
        );
        
        console.log(`🔍 ${availableProducts.length} products available for matching`);
        
        // Score products based on category/subcategory match
        const scoredProducts = availableProducts.map(p => {
          let score = 0;
          
          // Same subcategory gets highest score (30 points)
          if (p.subCategory === product.subCategory && p.category === product.category) {
            score = 30;
          }
          // Same category gets medium score (10 points)  
          else if (p.category === product.category) {
            score = 10;
          }
          // Different category gets 0 points
          
          return {
            ...p,
            matchScore: score
          };
        });
        
        // Sort by score (highest first), then by newest first
        const sortedProducts = scoredProducts.sort((a, b) => {
          if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        // Take top 6 products
        const topProducts = sortedProducts.slice(0, 6);
        
        // Transform to expected format
        const transformedProducts = topProducts.map(p => ({
          id: p._id,
          name: p.title,
          price: p.salePrice,
          originalPrice: p.regularPrice,
          image: p.images && p.images.length > 0 ? 
            (p.images[0].url || p.images[0].uri || '') : '',
          images: p.images || [],
          category: p.category,
          subCategory: p.subCategory,
          stock: p.stock,
          brand: p.brand,
          sellerId: p.sellerId,
          paymentMethods: p.paymentMethods || {},
          cashOnDelivery: p.cashOnDelivery || 'No',
          rating: 4.0 + Math.random() * 1,
          reviews: Math.floor(Math.random() * 200) + 10,
          matchScore: p.matchScore
        }));
        
        console.log('🎯 CLIENT-SIDE: Related products found:');
        transformedProducts.forEach((p, index) => {
          const matchType = p.matchScore === 30 ? 'Exact Match (Same Category + SubCategory)' :
                           p.matchScore === 10 ? 'Category Match' : 'No Match';
          console.log(`  ${index + 1}. ${p.name} - ${matchType} (Score: ${p.matchScore})`);
          console.log(`     ${p.category} > ${p.subCategory} - UGX ${p.price.toLocaleString()}`);
        });
        
        if (transformedProducts.length > 0) {
          setRelatedProducts(transformedProducts);
          console.log(`✅ Successfully loaded ${transformedProducts.length} related products from database`);
        } else {
          console.log('⚠️ No related products found in database, using mock data');
          // Use mock data as final fallback
          const mockRelated = [
            {
              id: 'mock_1',
              name: 'Featured Product 1',
              price: product.price * 0.8,
              image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
              rating: 4.3,
              reviews: 89,
              matchScore: 0
            },
            {
              id: 'mock_2', 
              name: 'Featured Product 2',
              price: product.price * 1.2,
              image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
              rating: 4.6,
              reviews: 156,
              matchScore: 0
            }
          ];
          setRelatedProducts(mockRelated);
        }
      } else {
        throw new Error('No products data received');
      }
    } catch (error) {
      console.error('❌ Error loading related products:', error);
      // Final fallback to mock data
      const mockRelated = [
        {
          id: 'error_fallback_1',
          name: 'Recommended Product 1',
          price: product.price * 0.9,
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
          rating: 4.2,
          reviews: 75,
          matchScore: 0
        },
        {
          id: 'error_fallback_2',
          name: 'Recommended Product 2',
          price: product.price * 1.1,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
          rating: 4.5,
          reviews: 120,
          matchScore: 0
        }
      ];
      setRelatedProducts(mockRelated);
      console.log('🔄 Using fallback mock data due to error');
    }
  }, [product.id, product.category, product.subCategory, product.price]);

  const loadReviews = async () => {
    // Mock reviews - in real app, fetch from API
    const mockReviews = [
      {
        id: 1,
        user: 'John D.',
        rating: 5,
        comment: 'Excellent product! Exactly as described and fast delivery.',
        date: '2024-03-15',
        verified: true
      },
      {
        id: 2,
        user: 'Sarah M.',
        rating: 4,
        comment: 'Good quality, worth the price. Recommended!',
        date: '2024-03-10',
        verified: true
      },
      {
        id: 3,
        user: 'David K.',
        rating: 5,
        comment: 'Amazing product, exceeded my expectations.',
        date: '2024-03-08',
        verified: false
      }
    ];
    
    setReviews(mockReviews);
  };

  const checkCartAndWishlistStatus = async () => {
    try {
      const cart = await CartWishlistService.getCart();
      const wishlist = await CartWishlistService.getWishlist();
      
      const cartItem = cart.find(item => item.id === product.id);
      const wishlistItem = wishlist.find(item => item.id === product.id);
      
      setIsInCart(!!cartItem);
      setCartQuantity(cartItem?.quantity || 0);
      setIsInWishlist(!!wishlistItem);
    } catch (error) {
      console.error('Error checking cart/wishlist status:', error);
    }
  };

  const handleAddToCart = async (quantity = 1) => {
    try {
      const result = await CartWishlistService.addToCart(product, quantity);
      if (result.success) {
        await loadCartItems();
        await updateCounts();
        CartWishlistService.showAddToCartAlert(product.name);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleQuantityChange = async (newQuantity) => {
    try {
      if (newQuantity === 0) {
        const result = await CartWishlistService.removeFromCart(product.id);
        if (result.success) {
          await loadCartItems();
          await updateCounts();
        }
      } else {
        const result = await CartWishlistService.updateCartQuantity(product.id, newQuantity);
        if (result.success) {
          await loadCartItems();
          await updateCounts();
        }
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleToggleWishlist = async () => {
    try {
      const result = await CartWishlistService.toggleWishlist(product);
      if (result.success) {
        await loadWishlistItems();
        await updateCounts();
        if (result.action === 'added') {
          CartWishlistService.showAddToWishlistAlert(product.name);
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing product: ${product.name} - UGX ${product.price?.toLocaleString()}`,
        title: product.name
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBuyNow = () => {
    if (!isInCart) {
      handleAddToCart(1);
    }
    // Navigate to checkout or cart
    navigation.navigate('Cart');
  };

  // Scroll handler for header animation
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const opacity = Math.min(offsetY / 200, 1);
        setHeaderOpacity(opacity);
      }
    }
  );

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: '#2c3e50', marginBottom: 10 }}>
          Loading Product Details...
        </Text>
        <Text style={{ fontSize: 14, color: '#7f8c8d' }}>
          {product?.name || 'Product'}
        </Text>
      </View>
    );
  }

  const renderImageGallery = () => {
    // Extract image URLs from product.images array (which contains objects with url property)
    let mediaItems = [];
    
    // Add video first if available
    if (product.videoUrl && product.videoUrl.trim() !== '') {
      mediaItems.push({
        id: 'video-0',
        type: 'video',
        url: product.videoUrl,
        isYouTube: product.videoUrl.includes('youtube.com') || product.videoUrl.includes('youtu.be')
      });
    }
    
    // Add images
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img, idx) => {
        const imageUrl = img.url || img.uri || img.imagekitUrl || img;
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          mediaItems.push({
            id: `image-${idx}`,
            type: 'image',
            url: imageUrl,
            thumbnailUrl: img.thumbnailUrl || imageUrl
          });
        }
      });
    } else if (product.image) {
      // Fallback to single image
      mediaItems.push({
        id: 'image-fallback',
        type: 'image',
        url: product.image
      });
    }
    
    // If no media items, show placeholder
    if (mediaItems.length === 0) {
      mediaItems.push({
        id: 'placeholder',
        type: 'image',
        url: 'https://via.placeholder.com/400x400?text=No+Image'
      });
    }
    
    console.log('📸 Media items to display:', mediaItems.length, mediaItems);
    
    return (
      <View style={styles.imageGalleryContainer}>
        {/* Animated Border Frame */}
        <Animated.View style={[styles.imageBorderFrame, {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }]} />
        
        <FlatList
          ref={flatListRef}
          data={mediaItems}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleManualScroll}
          onScrollBeginDrag={stopAutoScroll}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <Animated.View 
              style={[
                styles.imageWrapper,
                {
                  opacity: selectedImageIndex === index ? 1 : 0.3,
                  transform: [{
                    scale: selectedImageIndex === index ? 1 : 0.85
                  }]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => {
                  console.log('Image clicked, type:', item.type);
                  
                  if (item.type === 'video' && item.isYouTube) {
                    // Open YouTube video in browser or YouTube app
                    Alert.alert(
                      'Watch Video',
                      'Open this video in your browser?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Open', 
                          onPress: async () => {
                            try {
                              const supported = await Linking.canOpenURL(item.url);
                              if (supported) {
                                await Linking.openURL(item.url);
                              } else {
                                Alert.alert('Error', 'Cannot open this video URL');
                              }
                            } catch (error) {
                              console.error('Error opening video:', error);
                              Alert.alert('Error', 'Failed to open video');
                            }
                          }
                        }
                      ]
                    );
                  } else if (item.type === 'video') {
                    // Open video in inline modal
                    const embedUrl = item.isYouTube
                      ? `https://www.youtube.com/embed/${item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1]}?autoplay=1`
                      : item.url;
                    setVideoModalUrl(embedUrl);
                    setShowVideoModal(true);
                  } else {
                    // Image clicked - stop auto scroll and open modal
                    console.log('Stopping auto-scroll and opening modal');
                    stopAutoScroll();
                    
                    // Calculate image index (subtract 1 if video is first)
                    const imgIdx = product.videoUrl && product.videoUrl.trim() !== ''
                      ? index - 1
                      : index;
                    const safeIdx = Math.max(0, imgIdx);
                    
                    console.log('Opening modal with image index:', safeIdx);
                    setModalImageIndex(safeIdx);
                    setCurrentModalIndex(safeIdx);
                    setShowImageModal(true);
                  }
                }}
                activeOpacity={0.9}
              >
                {item.type === 'video' ? (
                  <View style={styles.videoContainer}>
                    <Image 
                      source={{ uri: item.isYouTube ? getYouTubeThumbnail(item.url) : 'https://via.placeholder.com/400x400?text=Video' }} 
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                    <View style={styles.videoOverlay}>
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={40} color="white" />
                      </View>
                      <View style={styles.videoLabel}>
                        <Ionicons name="videocam" size={16} color="white" />
                        <Text style={styles.videoLabelText}>Product Video</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Image 
                    source={{ uri: item.url }} 
                    style={styles.productImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.error('Image load error for:', item.url, error.nativeEvent.error);
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded successfully:', item.url);
                    }}
                  />
                )}
                
                {/* Discount Badge */}
                {product.discount && index === 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{product.discount}</Text>
                  </View>
                )}
                
                {/* New Badge */}
                {product.isNew && index === 0 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newText}>NEW</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
          keyExtractor={(item) => item.id}
        />
        
        {/* Image Indicators */}
        {mediaItems.length > 1 && (
          <View style={styles.imageIndicators}>
            {mediaItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                  setSelectedImageIndex(index);
                }}
                style={[
                  styles.indicator,
                  selectedImageIndex === index && styles.activeIndicator
                ]}
              >
                {item.type === 'video' && (
                  <Ionicons 
                    name="videocam" 
                    size={8} 
                    color={selectedImageIndex === index ? '#3498db' : 'rgba(255,255,255,0.7)'} 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Manual Navigation Arrows */}
        {mediaItems.length > 1 && (
          <>
            {selectedImageIndex > 0 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={() => {
                  const newIndex = selectedImageIndex - 1;
                  flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                  setSelectedImageIndex(newIndex);
                }}
              >
                <Ionicons name="chevron-back" size={30} color="white" />
              </TouchableOpacity>
            )}
            
            {selectedImageIndex < mediaItems.length - 1 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={() => {
                  const newIndex = selectedImageIndex + 1;
                  flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                  setSelectedImageIndex(newIndex);
                }}
              >
                <Ionicons name="chevron-forward" size={30} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}
        
        {/* View Gallery Button */}
        <TouchableOpacity
          style={styles.viewGalleryButton}
          onPress={() => {
            stopAutoScroll();
            // Calculate image index (subtract 1 if video is first)
            const imgIdx = product.videoUrl && product.videoUrl.trim() !== ''
              ? selectedImageIndex - 1
              : selectedImageIndex;
            const safeIdx = Math.max(0, imgIdx);
            setModalImageIndex(safeIdx);
            setCurrentModalIndex(safeIdx);
            setShowImageModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="expand-outline" size={20} color="white" />
          <Text style={styles.viewGalleryText}>View Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProductInfo = () => {
    return (
      <View style={styles.productInfoContainer}>
        {/* Category & Brand */}
        <View style={styles.categoryBrandRow}>
          <Text style={styles.categoryLabel}>{product.category}</Text>
          {product.brand && (
            <Text style={styles.brandLabel}>{product.brand}</Text>
          )}
        </View>
        
        {/* Product Name */}
        <Text style={styles.productName}>{product.name}</Text>
        
        {/* Rating & Reviews */}
        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name="star"
                size={16}
                color={star <= Math.floor(product.rating || 0) ? "#f39c12" : "#e1e8ed"}
              />
            ))}
          </View>
          <Text style={styles.ratingText}>{product.rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.reviewsText}>({product.reviews || 0} reviews)</Text>
        </View>
        
        {/* Price & Stock Row */}
        <View style={styles.priceStockRow}>
          <View style={styles.priceContainer}>
            {/* Campaign banner */}
            {product.hasCampaign && product.campaign && (
              <View style={[styles.campaignBanner, { backgroundColor: product.campaign.bannerColor || '#e74c3c' }]}>
                <Ionicons name={
                  product.campaign.type === 'flash_sale'    ? 'flash'            :
                  product.campaign.type === 'free_shipping' ? 'bicycle'          :
                  product.campaign.type === 'buy_x_get_y'  ? 'gift'             :
                  product.campaign.type === 'bundle'        ? 'layers'           : 'pricetag'
                } size={12} color="#fff" />
                <Text style={styles.campaignBannerText}>{product.campaign.title}</Text>
                {product.campaign.endDate && (
                  <Text style={styles.campaignEndText}>
                    Ends {new Date(product.campaign.endDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}

            {/* Prices */}
            {product.hasCampaign && product.campaignPrice != null ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.currentPrice}>
                    UGX {product.campaignPrice?.toLocaleString()}
                  </Text>
                  <View style={[styles.discountPill, { backgroundColor: product.campaign?.bannerColor || '#e74c3c' }]}>
                    <Text style={styles.discountPillText}>
                      {product.campaign?.discountType === 'percentage'
                        ? `${product.campaign.discountValue}% OFF`
                        : product.campaign?.type === 'free_shipping'
                          ? 'FREE SHIP'
                          : `UGX ${product.campaign?.discountValue?.toLocaleString()} OFF`}
                    </Text>
                  </View>
                </View>
                <Text style={styles.originalPrice}>
                  UGX {product.price?.toLocaleString()}
                </Text>
                <View style={styles.savingsContainer}>
                  <Text style={styles.savingsText}>
                    You save UGX {((product.price || 0) - (product.campaignPrice || 0)).toLocaleString()}
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.currentPrice}>
                  UGX {product.price?.toLocaleString() || '0'}
                </Text>
                {product.originalPrice && (
                  <Text style={styles.originalPrice}>
                    UGX {product.originalPrice?.toLocaleString()}
                  </Text>
                )}
                {product.originalPrice && (
                  <View style={styles.savingsContainer}>
                    <Text style={styles.savingsText}>
                      You save UGX {((product.originalPrice || 0) - (product.price || 0)).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {/* Stock Status - Compact */}
          <View style={styles.stockContainerCompact}>
            <Ionicons
              name={product.stock > 0 ? "checkmark-circle" : "close-circle"}
              size={14}
              color={product.stock > 0 ? "#27ae60" : "#e74c3c"}
            />
            <Text style={[
              styles.stockTextCompact,
              { color: product.stock > 0 ? "#27ae60" : "#e74c3c" }
            ]}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </Text>
          </View>
        </View>
        
        {/* Stock Warning & Seller Info Row */}
        <View style={styles.stockSellerRow}>
          {product.stock > 0 && product.stock < 10 && (
            <Text style={styles.lowStockWarningCompact}>Only {product.stock} left!</Text>
          )}
          
          {/* Seller Info - Compact */}
          {product.seller && (
            <View style={styles.sellerContainerCompact}>
              <Ionicons name="storefront-outline" size={12} color="#7f8c8d" />
              <Text style={styles.sellerTextCompact}>Sold by</Text>
              <Text style={styles.sellerNameCompact}>{product.seller.name}</Text>
              {product.seller.verified && (
                <Ionicons name="checkmark-circle" size={12} color="#3498db" />
              )}
            </View>
          )}
        </View>
        
        {/* Action Buttons - Ask AI, Add to Cart & Wishlist */}
        <View style={styles.actionButtonsContainer}>
          {/* Ask AI Button */}
          <TouchableOpacity
            style={styles.askAiButton}
            onPress={() => {
              setShowAIChat(true);
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#9b59b6" />
            <Text style={styles.askAiText}>Ask AI</Text>
          </TouchableOpacity>
          
          {/* Add to Cart / Quantity Selector */}
          {isInCart ? (
            <View style={styles.quantitySection}>
              <QuantitySelector
                product={product}
                currentQuantity={cartQuantity}
                onQuantityChange={handleQuantityChange}
                compact={false}
                hideManualInput={true}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.addToCartButtonInline,
                product.stock === 0 && styles.disabledButton
              ]}
              onPress={() => handleAddToCart(1)}
              disabled={product.stock === 0}
            >
              <Ionicons name="cart-outline" size={20} color="white" />
              <Text style={styles.addToCartTextInline}>Add to Cart</Text>
            </TouchableOpacity>
          )}
          
          {/* Wishlist Button */}
          <TouchableOpacity
            style={styles.wishlistButtonInline}
            onPress={handleToggleWishlist}
          >
            <Ionicons 
              name={isInWishlist ? "heart" : "heart-outline"} 
              size={24} 
              color={isInWishlist ? "#e74c3c" : "#7f8c8d"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Delivery Options - Expandable */}
        {deliveryOptions && deliveryOptions.hasOptions ? (
          <View style={styles.deliveryOptionsContainer}>
            <TouchableOpacity 
              style={styles.deliveryOptionsHeader}
              onPress={() => setIsDeliveryExpanded(!isDeliveryExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.deliveryHeaderLeft}>
                <Ionicons name="location-outline" size={20} color="#27ae60" />
                <Text style={styles.deliveryOptionsTitle}>Product Delivery Stations</Text>
              </View>
              <Ionicons 
                name={isDeliveryExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#7f8c8d" 
              />
            </TouchableOpacity>

            {isDeliveryExpanded && (
              <View style={styles.deliveryOptionsContent}>
                {deliveryOptions.freeDeliveryThreshold > 0 && (
                  <View style={styles.freeDeliveryBanner}>
                    <Ionicons name="gift-outline" size={16} color="#27ae60" />
                    <Text style={styles.freeDeliveryHint}>
                      Free delivery on orders above UGX {deliveryOptions.freeDeliveryThreshold.toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Home Delivery Zones */}
                {deliveryOptions.zones.length > 0 && (
                  <View style={styles.deliveryGroup}>
                    <View style={styles.deliveryGroupHeader}>
                      <Ionicons name="home" size={16} color="#3498db" />
                      <Text style={styles.deliveryGroupLabel}>Home Delivery</Text>
                    </View>
                    {deliveryOptions.zones.map((z, i) => (
                      <View key={i} style={styles.deliveryOptionRow}>
                        <View style={styles.deliveryOptionDot} />
                        <View style={styles.deliveryOptionInfo}>
                          <Text style={styles.deliveryOptionName}>{z.name}</Text>
                          <View style={styles.deliveryOptionDetails}>
                            <Text style={styles.deliveryOptionFee}>
                              UGX {(z.fee || 15000).toLocaleString()}
                            </Text>
                            <Text style={styles.deliveryOptionDays}>
                              {z.estimatedDays} days
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Link Bus Terminals */}
                {deliveryOptions.terminals.length > 0 && (
                  <View style={styles.deliveryGroup}>
                    <View style={styles.deliveryGroupHeader}>
                      <Ionicons name="bus" size={16} color="#e74c3c" />
                      <Text style={styles.deliveryGroupLabel}>Link Bus Pickup</Text>
                    </View>
                    {deliveryOptions.terminals.map((t, i) => (
                      <View key={i} style={styles.deliveryOptionRow}>
                        <View style={[styles.deliveryOptionDot, { backgroundColor: '#e74c3c' }]} />
                        <View style={styles.deliveryOptionInfo}>
                          <Text style={styles.deliveryOptionName}>{t.name}</Text>
                          <View style={styles.deliveryOptionDetails}>
                            <Text style={styles.deliveryOptionFee}>
                              UGX {(t.fee || 15000).toLocaleString()}
                            </Text>
                            <Text style={styles.deliveryOptionDays}>
                              {t.estimatedDays} days
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ) : product.shipping ? (
          <View style={styles.deliveryOptionsContainer}>
            <TouchableOpacity 
              style={styles.deliveryOptionsHeader}
              onPress={() => setIsDeliveryExpanded(!isDeliveryExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.deliveryHeaderLeft}>
                <Ionicons name="location-outline" size={20} color="#27ae60" />
                <Text style={styles.deliveryOptionsTitle}>Product Delivery Stations</Text>
              </View>
              <Ionicons 
                name={isDeliveryExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#7f8c8d" 
              />
            </TouchableOpacity>

            {isDeliveryExpanded && (
              <View style={styles.deliveryOptionsContent}>
                <View style={styles.shippingInfo}>
                  <Ionicons name="car-outline" size={16} color="#3498db" />
                  <Text style={styles.shippingText}>
                    {product.shipping.freeShipping ? 'Free Delivery' : `Delivery UGX ${product.shipping.cost?.toLocaleString()}`}
                  </Text>
                </View>
                <Text style={styles.deliveryTime}>
                  Estimated delivery: {product.shipping.estimatedDays}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'description', label: 'Description', icon: 'document-text-outline' },
      { id: 'specifications', label: 'Specs', icon: 'list-outline' },
      { id: 'reviews', label: 'Reviews', icon: 'star-outline' }
    ];
    
    return (
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab
            ]}
            onPress={() => {
              // Toggle: if clicking the same tab, collapse it
              setSelectedTab(selectedTab === tab.id ? null : tab.id);
            }}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={selectedTab === tab.id ? '#3498db' : '#7f8c8d'}
            />
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
            {/* Chevron icon to indicate expandable */}
            <Ionicons
              name={selectedTab === tab.id ? "chevron-up" : "chevron-down"}
              size={14}
              color={selectedTab === tab.id ? '#3498db' : '#7f8c8d'}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    // Only render content if a tab is selected
    if (!selectedTab) return null;
    
    switch (selectedTab) {
      case 'description':
        return renderDescription();
      case 'specifications':
        return renderSpecifications();
      case 'reviews':
        return renderReviews();
      default:
        return null;
    }
  };

  const renderDescription = () => {
    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.descriptionText}>{product.description}</Text>
        
        {product.features && product.features.length > 0 && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Key Features:</Text>
            {product.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSpecifications = () => {
    if (!product.specifications) return null;
    
    return (
      <View style={styles.tabContentContainer}>
        {Object.entries(product.specifications).map(([key, value]) => (
          <View key={key} style={styles.specRow}>
            <Text style={styles.specKey}>{key}</Text>
            <Text style={styles.specValue}>{value}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderReviews = () => {
    return (
      <View style={styles.tabContentContainer}>
        {/* Reviews Summary */}
        <View style={styles.reviewsSummary}>
          <View style={styles.ratingOverview}>
            <Text style={styles.overallRating}>{product.rating?.toFixed(1) || '0.0'}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name="star"
                  size={14}
                  color={star <= Math.floor(product.rating || 0) ? "#f39c12" : "#e1e8ed"}
                />
              ))}
            </View>
            <Text style={styles.totalReviews}>Based on {product.reviews || 0} reviews</Text>
          </View>
        </View>
        
        {/* Individual Reviews */}
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewUser}>{review.user}</Text>
              <View style={styles.reviewRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name="star"
                    size={12}
                    color={star <= review.rating ? "#f39c12" : "#e1e8ed"}
                  />
                ))}
              </View>
              {review.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#27ae60" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
            <Text style={styles.reviewDate}>{review.date}</Text>
          </View>
        ))}
        
        <TouchableOpacity style={styles.writeReviewButton}>
          <Text style={styles.writeReviewText}>Write a Review</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRelatedProducts = () => {
    if (relatedProducts.length === 0) return null;
    
    return (
      <View style={styles.relatedContainer}>
        <Text style={styles.relatedTitle}>You might also like</Text>
        <FlatList
          data={relatedProducts}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.relatedList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.relatedItem}
              onPress={() => {
                console.log('🔗 Related product clicked:', item.name, 'ID:', item.id);
                console.log('📦 Full product data:', item);
                if (item && item.id) {
                  navigation.push('ProductDetails', { product: item });
                } else {
                  console.error('❌ Invalid product data:', item);
                }
              }}
            >
              <Image source={{ uri: item.image }} style={styles.relatedImage} />
              <Text style={styles.relatedName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.relatedRating}>
                <Ionicons name="star" size={12} color="#f39c12" />
                <Text style={styles.relatedRatingText}>{item.rating}</Text>
              </View>
              <Text style={styles.relatedPrice}>UGX {item.price?.toLocaleString()}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
        />
      </View>
    );
  };

  const renderImageModal = () => {
    // Extract only image URLs (not videos) for the modal
    let imageUrls = [];

    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach(img => {
        const imageUrl = img.url || img.uri || img.imagekitUrl || img;
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          imageUrls.push(imageUrl);
        }
      });
    } else if (product.image) {
      imageUrls.push(product.image);
    }

    if (imageUrls.length === 0) {
      imageUrls.push('https://via.placeholder.com/400x400?text=No+Image');
    }

    const safeIndex = Math.min(modalImageIndex, imageUrls.length - 1);

    const handleModalClose = () => {
      console.log('Closing modal');
      setShowImageModal(false);
    };

    console.log('renderImageModal - showImageModal:', showImageModal, 'imageUrls:', imageUrls.length);

    if (!showImageModal) {
      return null;
    }

    return (
      <Modal
        visible={showImageModal}
        transparent={false}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleModalClose}
      >
        <View style={styles.fullScreenModal}>
          {/* Header bar */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleModalClose}>
              <Ionicons name="close" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>{product.name}</Text>
            <View style={styles.modalCounterBadge}>
              <Text style={styles.modalCounterText}>
                {currentModalIndex + 1} / {imageUrls.length}
              </Text>
            </View>
          </View>

          {/* Full-screen image pager with zoom */}
          <FlatList
            data={imageUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={safeIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentModalIndex(idx);
            }}
            renderItem={({ item, index }) => (
              <ZoomableImageView uri={item} />
            )}
            keyExtractor={(item, index) => `modal-img-${index}`}
          />

          {/* Navigation Arrows */}
          {imageUrls.length > 1 && (
            <>
              {currentModalIndex > 0 && (
                <TouchableOpacity
                  style={[styles.modalNavArrow, styles.modalNavArrowLeft]}
                  onPress={() => {
                    const newIndex = currentModalIndex - 1;
                    setCurrentModalIndex(newIndex);
                  }}
                >
                  <Ionicons name="chevron-back" size={40} color="white" />
                </TouchableOpacity>
              )}
              
              {currentModalIndex < imageUrls.length - 1 && (
                <TouchableOpacity
                  style={[styles.modalNavArrow, styles.modalNavArrowRight]}
                  onPress={() => {
                    const newIndex = currentModalIndex + 1;
                    setCurrentModalIndex(newIndex);
                  }}
                >
                  <Ionicons name="chevron-forward" size={40} color="white" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Dot indicators */}
          {imageUrls.length > 1 && (
            <View style={styles.modalDots}>
              {imageUrls.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.modalDot,
                    i === currentModalIndex && styles.modalDotActive
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" translucent={false} />
      
      {/* Home-Style Header */}
      <View style={styles.homeHeader}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.homeHeaderContent}>
            {/* Back Button + Title */}
            <View style={styles.headerLeftSection}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#2c3e50" />
              </TouchableOpacity>
              <Text style={styles.headerProductTitle} numberOfLines={1}>
                {product.name}
              </Text>
            </View>
            
            {/* Header Icons */}
            <View style={styles.headerIconsRow}>
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => navigation.navigate('Cart')}
              >
                <View style={styles.headerIconContainer}>
                  <Ionicons name="cart" size={24} color="#f39c12" />
                  {cartCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{cartCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={handleToggleWishlist}
              >
                <View style={styles.headerIconContainer}>
                  <Ionicons 
                    name={isInWishlist ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isInWishlist ? "#e74c3c" : "#e74c3c"} 
                  />
                  {wishlistCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{wishlistCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={handleShare}
              >
                <View style={styles.headerIconContainer}>
                  <Ionicons name="share-outline" size={24} color="#3498db" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        {renderImageGallery()}
        
        {/* Product Info */}
        {renderProductInfo()}
        
        {/* Tabs */}
        {renderTabs()}
        
        {/* Tab Content */}
        {renderTabContent()}
        
        {/* Related Products */}
        {renderRelatedProducts()}
      </ScrollView>
      
      {/* Image Modal */}
      {renderImageModal()}

      {/* Video Modal */}
      <Modal
        visible={showVideoModal}
        transparent={false}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity
            onPress={() => setShowVideoModal(false)}
            style={{ position: 'absolute', top: 44, right: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {videoModalUrl ? (
            <WebView
              source={{ uri: videoModalUrl }}
              style={{ flex: 1 }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
            />
          ) : null}
        </View>
      </Modal>

      {/* AI Chat Bottom Sheet */}
      <ProductAIChat
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        product={product}
        messages={aiChatMessages}
        setMessages={setAiChatMessages}
        suggestions={aiChatSuggestions}
        setSuggestions={setAiChatSuggestions}
        chatHistories={aiChatHistories}
        setChatHistories={setAiChatHistories}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Home-Style Header
  homeHeader: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
  },
  safeArea: {
    backgroundColor: 'white',
  },
  homeHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerProductTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  
  // Image Gallery
  imageGalleryContainer: {
    height: width * 0.8,
    backgroundColor: 'white',
    position: 'relative',
    marginBottom: 10,
  },
  imageBorderFrame: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 3,
    borderColor: '#3498db',
    borderRadius: 12,
    zIndex: 1,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
  imageWrapper: {
    width: width,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width * 0.9,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    backgroundColor: 'white',
    width: 24,
  },
  
  // Video Styles
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 152, 219, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  videoLabel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  videoLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Navigation Arrows
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 10,
  },
  navArrowRight: {
    right: 10,
  },
  
  // View Gallery Button
  viewGalleryButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginLeft: -70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  viewGalleryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Product Info
  productInfoContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  categoryBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  brandLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    lineHeight: 30,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8,
  },
  reviewsText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  priceContainer: {
    marginBottom: 8,
    flex: 1,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  savingsContainer: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },

  // Campaign styles
  campaignBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 8, alignSelf: 'flex-start',
  },
  campaignBannerText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  campaignEndText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginLeft: 4 },
  discountPill: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  discountPillText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  
  // Price & Stock Row
  priceStockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  // Compact Stock Status
  stockContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    height: 31, // Increased from 22 to 31 (9px increase)
  },
  stockTextCompact: {
    fontSize: 13, // Increased from 11 to 13
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Stock & Seller Row
  stockSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 27, // Increased from 18 to 27 (9px increase)
  },
  lowStockWarningCompact: {
    fontSize: 12, // Increased from 10 to 12
    color: '#e74c3c',
    fontWeight: '600',
    backgroundColor: '#fdf2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    height: 27, // Increased from 18 to 27 (9px increase)
  },
  
  // Compact Seller Info
  sellerContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    height: 29, // Increased from 20 to 29 (9px increase)
  },
  sellerTextCompact: {
    fontSize: 12, // Increased from 10 to 12
    color: '#7f8c8d',
  },
  sellerNameCompact: {
    fontSize: 12, // Increased from 10 to 12
    fontWeight: '600',
    color: '#2c3e50',
  },
  
  // Action Buttons (Inline after stock)
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  quantitySection: {
    flex: 1,
  },
  addToCartButtonInline: {
    flex: 1,
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartTextInline: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  askAiButton: {
    backgroundColor: '#f3e5f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#9b59b6',
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  askAiText: {
    color: '#9b59b6',
    fontSize: 14,
    fontWeight: '600',
  },
  buyNowButtonInline: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyNowTextInline: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quantitySection: {
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  wishlistButtonInline: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Seller Info
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  sellerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 6,
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerRatingText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  viewSellerButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewSellerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Delivery Options (dynamic from seller)
  deliveryOptionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  deliveryOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  deliveryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deliveryOptionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  deliveryOptionsContent: {
    padding: 16,
    paddingTop: 12,
  },
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#27ae60',
  },
  freeDeliveryHint: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '500',
    flex: 1,
  },
  deliveryGroup: {
    marginBottom: 16,
  },
  deliveryGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  deliveryGroupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  deliveryOptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingLeft: 8,
  },
  deliveryOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
    marginTop: 6,
  },
  deliveryOptionInfo: {
    flex: 1,
  },
  deliveryOptionName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  deliveryOptionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryOptionFee: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '700',
  },
  deliveryOptionDays: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Shipping Info
  shippingContainer: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shippingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 24,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  
  // Tab Content
  tabContentContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
    marginBottom: 20,
  },
  featuresContainer: {
    marginTop: 10,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 10,
    flex: 1,
  },
  
  // Specifications
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  specKey: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  
  // Reviews
  reviewsSummary: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  ratingOverview: {
    alignItems: 'center',
  },
  overallRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 10,
  },
  reviewRating: {
    flexDirection: 'row',
    marginRight: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#27ae60',
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  writeReviewButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  writeReviewText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Related Products
  relatedContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20, // Reduced from 100
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  relatedList: {
    paddingRight: 20,
  },
  relatedItem: {
    width: 150,
    marginRight: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  relatedImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
  },
  relatedName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    height: 32,
  },
  relatedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  relatedRatingText: {
    fontSize: 10,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  relatedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },

  // Full-screen Image Modal
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 12,
  },
  modalHeaderTitle: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  modalCounterBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalCounterText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  fullScreenImageWrapper: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width,
    height,
  },
  zoomHintContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    borderRadius: 20,
  },
  zoomHintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  modalNavArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  modalNavArrowLeft: {
    left: 20,
  },
  modalNavArrowRight: {
    right: 20,
  },
  modalDots: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  modalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  modalDotActive: {
    backgroundColor: 'white',
    width: 18,
    borderRadius: 4,
  },
});

export default ProductDetails;
