import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import CartWishlistService from '../services/cartWishlistService';
import QuantitySelector from '../components/QuantitySelector';
import { AutoImage } from '../components/AnimatedProductCard';
import API_BASE from '../constants/api';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

// ── Shimmer skeleton ──────────────────────────────────────────────────────
const useShimmer = () => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, []);
  return anim;
};

const Bone = ({ w, h, radius = 6, style, anim }) => {
  const bw = typeof w === 'number' ? w : width - 32;
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [-bw, bw * 1.5] });
  return (
    <View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: '#e8e8e8', overflow: 'hidden' }, style]}>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: bw * 0.5, transform: [{ translateX: tx }], backgroundColor: 'rgba(255,255,255,0.62)' }} />
    </View>
  );
};

const CARD_W = (width - 48) / 2;
const CatProductSkeleton = ({ anim }) => (
  <View style={{ width: CARD_W, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4 }}>
    <Bone anim={anim} w={CARD_W} h={150} radius={0} />
    <View style={{ padding: 10, gap: 8 }}>
      <Bone anim={anim} w={CARD_W * 0.45} h={10} />
      <Bone anim={anim} w={CARD_W * 0.88} h={13} />
      <Bone anim={anim} w={CARD_W * 0.65} h={13} />
      <Bone anim={anim} w={CARD_W * 0.5} h={11} />
      <Bone anim={anim} w={CARD_W} h={34} radius={10} />
    </View>
  </View>
);

const CategoryProductsSkeleton = () => {
  const anim = useShimmer();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, justifyContent: 'space-between', paddingTop: 12 }}>
      {[...Array(6)].map((_, i) => <CatProductSkeleton key={i} anim={anim} />)}
    </View>
  );
};

const CategoryProducts = ({ navigation, route }) => {
  const { category } = route?.params || { category: 'Electronics' };
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryInfo, setCategoryInfo] = useState({});
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortBy, setSortBy] = useState('name'); // name, price-low, price-high, newest
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    fetchCategoryProducts();
    loadWishlistItems();
    loadCartItems();
  }, [category]);

  useEffect(() => {
    filterProducts();
  }, [products, selectedSubCategory, sortBy]);

  // Add focus listener to refresh cart when screen comes into focus
  useEffect(() => {
    if (!navigation?.addListener) return;
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, refreshing cart...');
      loadCartItems();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchCategoryProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch all products
      const response = await fetch(`${API_BASE}/products`);
      const data = await response.json();
      
      if (data.success && data.products) {
        // Filter products by category
        const categoryProducts = data.products.filter(product => product.category === category);
        
        // Transform products to match UI format
        const transformedProducts = categoryProducts.map(product => {
          console.log(`Product ${product.title}: stock = ${product.stock}`);
          const hasCampaign  = product.hasCampaign && product.campaign;
          const finalPrice   = hasCampaign ? product.campaignPrice : product.salePrice;
          const regularPrice = product.regularPrice > product.salePrice ? product.regularPrice : null;
          const discountLabel = hasCampaign
            ? (product.campaign.type === 'free_shipping' ? 'FREE SHIP'
              : product.campaign.discountType === 'percentage' ? `${product.campaign.discountValue}% OFF`
              : `UGX ${product.campaign.discountValue?.toLocaleString()} OFF`)
            : (regularPrice ? `${Math.round((1 - product.salePrice / product.regularPrice) * 100)}% OFF` : null);
          return {
            id: product._id,
            name: product.title,
            price: finalPrice,
            salePrice: product.salePrice,
            regularPrice,
            originalPrice: hasCampaign ? product.salePrice : regularPrice,
            campaignPrice: hasCampaign ? product.campaignPrice : null,
            image: product.images?.[0]?.url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
            images: product.images || [],
            rating: 4.5 + Math.random() * 0.5,
            reviews: Math.floor(Math.random() * 200) + 50,
            discount: discountLabel,
            campaign: product.campaign || null,
            hasCampaign: !!hasCampaign,
            campaignBannerColor: product.campaign?.bannerColor || null,
            category: product.category,
            subCategory: product.subCategory,
            stock: product.stock,
            description: product.description,
            sellerId: product.sellerId,
            paymentMethods: product.paymentMethods || {},
            cashOnDelivery: product.cashOnDelivery || 'No',
            isNew: new Date(product.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            isTrending: Math.random() > 0.5,
            createdAt: product.createdAt
          };
        });
        
        setProducts(transformedProducts);
        
        // Extract subcategories
        const uniqueSubCategories = [...new Set(transformedProducts.map(p => p.subCategory))];
        setSubCategories(uniqueSubCategories);
        
        // Set category info
        setCategoryInfo({
          name: category,
          productCount: transformedProducts.length,
          subCategoryCount: uniqueSubCategories.length,
          totalStock: transformedProducts.reduce((sum, p) => sum + (p.stock || 0), 0),
          priceRange: {
            min: Math.min(...transformedProducts.map(p => p.price)),
            max: Math.max(...transformedProducts.map(p => p.price))
          },
          icon: getCategoryIcon(category),
          color: getCategoryColor(category)
        });
      }
      
    } catch (error) {
      console.error('Error fetching category products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];
    
    // Filter by subcategory if selected
    if (selectedSubCategory) {
      filtered = filtered.filter(product => product.subCategory === selectedSubCategory);
    }
    
    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    setFilteredProducts(filtered);
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
      'Food & Beverages': '#795748',
      'Jewelry': '#607d8b',
    };
    return colorMap[category] || '#95a5a6';
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
      console.log('Loading cart items...');
      const cart = await CartWishlistService.getCart();
      console.log('Loaded cart items:', cart);
      setCartItems(cart);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  // Add a test function to debug cart issues
  const testCartFunctionality = async () => {
    try {
      console.log('=== TESTING CART FUNCTIONALITY ===');
      
      // Clear cart first
      await CartWishlistService.clearCart();
      console.log('Cart cleared');
      
      // Get current cart
      const emptyCart = await CartWishlistService.getCart();
      console.log('Empty cart:', emptyCart);
      
      // Add a test product
      const testProduct = {
        id: 'test-123',
        name: 'Test Product',
        price: 1000
      };
      
      const addResult = await CartWishlistService.addToCart(testProduct);
      console.log('Add result:', addResult);
      
      // Get cart again
      const cartAfterAdd = await CartWishlistService.getCart();
      console.log('Cart after add:', cartAfterAdd);
      
      // Update local state
      setCartItems(cartAfterAdd);
      
      console.log('=== TEST COMPLETE ===');
    } catch (error) {
      console.error('Test error:', error);
    }
  };

  const handleDirectQuantityUpdate = async (product, action) => {
    try {
      console.log(`=== handleDirectQuantityUpdate START ===`);
      console.log(`Action: ${action} for product ${product.id} (${product.name})`);
      console.log(`Current cart state:`, cartItems);
      
      if (action === 'increase') {
        // Add one more to cart
        const result = await CartWishlistService.addToCart(product, 1);
        console.log('Add to cart result:', result);
        
        if (result.success) {
          console.log('Successfully increased quantity');
          // Update local state immediately for better UX
          setCartItems(result.cart);
          console.log('Updated local cart state:', result.cart);
        } else {
          console.error('Failed to add to cart:', result.error);
        }
      } else if (action === 'decrease') {
        // Get current quantity and decrease by 1
        const currentCart = await CartWishlistService.getCart();
        console.log('Current cart from storage:', currentCart);
        
        const currentItem = currentCart.find(item => item.id === product.id);
        console.log('Current item in cart:', currentItem);
        
        if (currentItem) {
          const newQuantity = currentItem.quantity - 1;
          console.log(`Decreasing quantity from ${currentItem.quantity} to ${newQuantity}`);
          
          if (newQuantity <= 0) {
            const result = await CartWishlistService.removeFromCart(product.id);
            if (result.success) {
              console.log('Successfully removed item from cart');
              // Update local state immediately
              setCartItems(result.cart);
              console.log('Updated local cart state after removal:', result.cart);
            }
          } else {
            const result = await CartWishlistService.updateCartQuantity(product.id, newQuantity);
            if (result.success) {
              console.log('Successfully decreased quantity');
              // Update local state immediately
              setCartItems(result.cart);
              console.log('Updated local cart state after decrease:', result.cart);
            }
          }
        } else {
          console.log('Item not found in cart for decrease operation');
        }
      }
      console.log(`=== handleDirectQuantityUpdate END ===`);
    } catch (error) {
      console.error('Error in direct quantity update:', error);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      console.log('=== handleAddToCart START ===');
      console.log('Adding product to cart:', product);
      
      const result = await CartWishlistService.addToCart(product);
      console.log('Add to cart result:', result);
      
      if (result.success) {
        CartWishlistService.showAddToCartAlert(product.name);
        // Update local state immediately
        console.log('Updating local cart state with:', result.cart);
        setCartItems(result.cart);
        
        // Also force a reload after a short delay to ensure consistency
        setTimeout(() => {
          console.log('Force reloading cart after add...');
          loadCartItems();
        }, 500);
      }
      console.log('=== handleAddToCart END ===');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleUpdateCartQuantity = async (productId, newQuantity) => {
    try {
      console.log(`Updating quantity for product ${productId} to ${newQuantity}`);
      
      if (newQuantity <= 0) {
        // Remove from cart
        const result = await CartWishlistService.removeFromCart(productId);
        if (result.success) {
          console.log('Item removed from cart');
          loadCartItems();
        }
      } else {
        // Update quantity
        const result = await CartWishlistService.updateCartQuantity(productId, newQuantity);
        if (result.success) {
          console.log(`Quantity updated to ${newQuantity}`);
          loadCartItems();
        } else {
          console.error('Failed to update quantity:', result.error);
        }
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
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
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const getCartItem = (productId) => {
    console.log(`Looking for product ${productId} in cart:`, cartItems);
    const item = cartItems.find(item => item.id === productId);
    console.log(`Found cart item:`, item);
    return item;
  };

  const getCartQuantity = (productId) => {
    const cartItem = getCartItem(productId);
    const quantity = cartItem ? cartItem.quantity : 0;
    console.log(`Cart quantity for ${productId}:`, quantity);
    return quantity;
  };

  const isInCart = (productId) => {
    const inCart = getCartQuantity(productId) > 0;
    console.log(`Is product ${productId} in cart:`, inCart);
    return inCart;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{category}</Text>
            <Text style={styles.headerSubtitle}>
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} • Cart: {cartItems.length} items
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity 
              style={[styles.searchButton, { marginRight: 10 }]}
              onPress={() => {
                console.log('Testing cart functionality...');
                testCartFunctionality();
              }}
            >
              <Ionicons name="bug" size={24} color="#e74c3c" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => {
                console.log('Refreshing cart manually...');
                loadCartItems();
              }}
            >
              <Ionicons name="refresh" size={24} color="#3498db" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );

  const renderCategoryInfo = () => (
    <View style={styles.categoryInfoCard}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIconContainer, { backgroundColor: categoryInfo.color }]}>
          <Ionicons name={categoryInfo.icon} size={32} color="white" />
        </View>
        <View style={styles.categoryDetails}>
          <Text style={styles.categoryName}>{categoryInfo.name}</Text>
          <View style={styles.categoryStats}>
            <Text style={styles.categoryStatText}>
              {categoryInfo.productCount} products • {categoryInfo.subCategoryCount} subcategories
            </Text>
            <Text style={styles.categoryPriceRange}>
              UGX {categoryInfo.priceRange?.min?.toLocaleString()} - {categoryInfo.priceRange?.max?.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Subcategory Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subCategoryScroll}>
        <View style={styles.subCategoryContainer}>
          <TouchableOpacity
            style={[styles.subCategoryChip, !selectedSubCategory && styles.activeSubCategoryChip]}
            onPress={() => setSelectedSubCategory(null)}
          >
            <Text style={[styles.subCategoryText, !selectedSubCategory && styles.activeSubCategoryText]}>
              All
            </Text>
          </TouchableOpacity>
          
          {subCategories.map((subCat) => (
            <TouchableOpacity
              key={subCat}
              style={[styles.subCategoryChip, selectedSubCategory === subCat && styles.activeSubCategoryChip]}
              onPress={() => setSelectedSubCategory(subCat)}
            >
              <Text style={[styles.subCategoryText, selectedSubCategory === subCat && styles.activeSubCategoryText]}>
                {subCat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sortOptions}>
            {[
              { key: 'name', label: 'Name' },
              { key: 'price-low', label: 'Price: Low to High' },
              { key: 'price-high', label: 'Price: High to Low' },
              { key: 'newest', label: 'Newest' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortChip, sortBy === option.key && styles.activeSortChip]}
                onPress={() => setSortBy(option.key)}
              >
                <Text style={[styles.sortText, sortBy === option.key && styles.activeSortText]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  const renderProductCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      activeOpacity={0.7}
      onPress={() => {
        console.log('=== Category Product Card Tapped ===');
        console.log('Product item:', item);
        console.log('Navigating to ProductDetails with product:', item.name);
        navigation.navigate('ProductDetails', { product: item });
      }}
    >
      {item.discount && (
        <View style={[styles.discountBadge, item.hasCampaign && { backgroundColor: item.campaignBannerColor || '#e74c3c', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
          {item.hasCampaign && <Ionicons name="flash" size={9} color="#fff" />}
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
      )}
      
      {item.isNew && !item.hasCampaign && (
        <View style={styles.newBadge}>
          <Text style={styles.newText}>NEW</Text>
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
        style={styles.productImage}
        intervalMs={3800}
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.subCategoryLabel}>{item.subCategory}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color="#f39c12" />
          <Text style={styles.ratingText}>{item.rating?.toFixed(1)}</Text>
          <Text style={styles.reviewText}>({item.reviews})</Text>
        </View>
        
        <View style={styles.priceContainer}>
          {/* 3-tier price */}
          {item.regularPrice ? (
            <Text style={styles.originalPrice}>UGX {item.regularPrice?.toLocaleString()}</Text>
          ) : null}
          {item.hasCampaign && item.salePrice && item.salePrice !== item.regularPrice ? (
            <Text style={[styles.originalPrice, { color: '#f39c12' }]}>UGX {item.salePrice?.toLocaleString()}</Text>
          ) : null}
          <Text style={[styles.productPrice, item.hasCampaign && { color: item.campaignBannerColor || '#e74c3c' }]}>
            UGX {item.price?.toLocaleString()}
          </Text>
          {item.hasCampaign && item.discount ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: item.campaignBannerColor || '#e74c3c', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 }}>
              <Ionicons name="pricetag" size={8} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{item.discount}</Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.stockContainer}>
          <Ionicons name="cube" size={12} color="#7f8c8d" />
          <Text style={styles.stockText}>{item.stock || 'N/A'} in stock</Text>
        </View>
        
        {/* Dynamic Cart Button/Quantity Controls */}
        {/* Debug info */}
        <Text style={{ fontSize: 8, color: '#666', marginBottom: 4 }}>
          Stock: {item.stock} | InCart: {isInCart(item.id) ? 'Yes' : 'No'} | Qty: {getCartQuantity(item.id)}
        </Text>
        
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
            style={styles.addToCartButton}
            onPress={() => {
              console.log(`Add to cart button pressed for product ${item.id}`);
              handleAddToCart(item);
            }}
          >
            <Ionicons name="cart-outline" size={14} color="white" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <CategoryProductsSkeleton />
        <BottomNav navigation={navigation} activeScreen="AllCategories" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}>
        {renderCategoryInfo()}
        {renderFilters()}
        <View style={styles.productsSection}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#bdc3c7" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                {selectedSubCategory
                  ? `No products in ${selectedSubCategory} subcategory`
                  : `No products available in ${category}`
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              scrollEnabled={false}
              contentContainerStyle={styles.productsGrid}
            />
          )}
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} activeScreen="AllCategories" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header Styles
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 100,
    ...Platform.select({
      web: { position: 'sticky', top: 0, boxShadow: '0 3px 10px rgba(0,0,0,0.1)' },
    }),
  },
  safeArea: {
    backgroundColor: 'white',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  searchButton: {
    padding: 8,
  },
  
  // Content Styles
  content: {
    flex: 1,
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7f8c8d',
  },
  
  // Category Info Card
  categoryInfoCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  categoryStats: {
    marginTop: 5,
  },
  categoryStatText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  categoryPriceRange: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
    marginTop: 2,
  },
  
  // Filters Container
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    marginBottom: 10,
  },
  
  // Subcategory Filter
  subCategoryScroll: {
    paddingLeft: 20,
    marginBottom: 15,
  },
  subCategoryContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  subCategoryChip: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeSubCategoryChip: {
    backgroundColor: '#3498db',
  },
  subCategoryText: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
  },
  activeSubCategoryText: {
    color: 'white',
  },
  
  // Sort Options
  sortContainer: {
    paddingHorizontal: 20,
  },
  sortLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  sortOptions: {
    flexDirection: 'row',
  },
  sortChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  activeSortChip: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3498db',
  },
  sortText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  activeSortText: {
    color: '#3498db',
    fontWeight: '600',
  },
  
  // Products Section
  productsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productsGrid: {
    gap: 15,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  
  // Product Card Styles
  productCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: (width - 60) / 2,
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
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
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
    height: 120,
  },
  productInfo: {
    padding: 12,
  },
  subCategoryLabel: {
    fontSize: 10,
    color: '#3498db',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  originalPrice: {
    fontSize: 12,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockText: {
    fontSize: 11,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  addToCartButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  addToCartText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Quantity Controls
  quantityControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: 'space-between',
  },
  quantityButton: {
    backgroundColor: '#3498db',
    borderRadius: 6,
    padding: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  quantityDisplay: {
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 6,
    minWidth: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#7f8c8d',
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default CategoryProducts;
