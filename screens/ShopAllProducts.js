import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Image,
  StyleSheet, Dimensions, ActivityIndicator, Modal, ScrollView,
  SafeAreaView, StatusBar, RefreshControl, Animated, Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CartWishlistService from '../services/cartWishlistService';
import QuantitySelector from '../components/QuantitySelector';
import { AutoImage } from '../components/AnimatedProductCard';
import { useTheme } from '../context/ThemeContext';
import API_BASE_URL from '../config';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

// ── Amazon/Jumia style shimmer — white beam sweeps through grey bones ──────
const useShimmer = () => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, []);
  return anim;
};

const ShimmerBone = ({ w, h, radius = 6, style, anim }) => {
  const bw = typeof w === 'number' ? w : width - 32;
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-bw, bw * 1.5],
  });
  return (
    <View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: '#e8e8e8', overflow: 'hidden' }, style]}>
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, width: bw * 0.5,
        transform: [{ translateX }],
        backgroundColor: 'rgba(255,255,255,0.62)',
      }} />
    </View>
  );
};

// Grid card skeleton
const GridCardSkeleton = ({ anim }) => {
  const cw = (width - 48) / 2;
  return (
    <View style={{ width: cw, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4 }}>
      <ShimmerBone anim={anim} w={cw} h={150} radius={0} />
      <View style={{ padding: 10, gap: 8 }}>
        <ShimmerBone anim={anim} w={cw * 0.45} h={10} />
        <ShimmerBone anim={anim} w={cw * 0.88} h={13} />
        <ShimmerBone anim={anim} w={cw * 0.65} h={13} />
        <ShimmerBone anim={anim} w={cw * 0.5} h={11} />
        <ShimmerBone anim={anim} w={cw} h={34} radius={10} />
      </View>
    </View>
  );
};

// List card skeleton
const ListCardSkeleton = ({ anim }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 }}>
    <ShimmerBone anim={anim} w={110} h={120} radius={0} />
    <View style={{ flex: 1, padding: 12, gap: 9 }}>
      <ShimmerBone anim={anim} w="40%" h={10} />
      <ShimmerBone anim={anim} w="85%" h={13} />
      <ShimmerBone anim={anim} w="55%" h={11} />
      <ShimmerBone anim={anim} w="45%" h={13} />
      <ShimmerBone anim={anim} w="70%" h={30} radius={8} />
    </View>
  </View>
);

const ShopSkeleton = ({ isGrid = true }) => {
  const anim = useShimmer();
  if (isGrid) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, justifyContent: 'space-between', paddingTop: 12 }}>
        {[...Array(6)].map((_, i) => <GridCardSkeleton key={i} anim={anim} />)}
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {[...Array(5)].map((_, i) => <ListCardSkeleton key={i} anim={anim} />)}
    </View>
  );
};
const CARD_WIDTH = (width - 48) / 2;

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Best Rating', value: 'rating' },
  { label: 'Most Popular', value: 'popular' },
  { label: 'Biggest Discount', value: 'discount' },
];

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under 50,000', min: 0, max: 50000 },
  { label: '50,000 – 200,000', min: 50000, max: 200000 },
  { label: '200,000 – 500,000', min: 200000, max: 500000 },
  { label: '500,000 – 1,000,000', min: 500000, max: 1000000 },
  { label: 'Over 1,000,000', min: 1000000, max: Infinity },
];

export default function ShopAllProducts({ navigation, route }) {
  const { theme } = useTheme();
  const initialCategory = route?.params?.category || null;
  const initialSearch = route?.params?.searchQuery || '';

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedPriceRange, setSelectedPriceRange] = useState(PRICE_RANGES[0]);
  const [showInStock, setShowInStock] = useState(false);
  const [showOnSale, setShowOnSale] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showSearch, setShowSearch] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Endless loop scroll
  const PAGE_SIZE = 12;
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loopOffset, setLoopOffset] = useState(0); // how many full loops done
  const searchInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProducts();
    loadCartAndWishlist();
  }, []);

  useEffect(() => {
    const count = [
      selectedCategory !== null,
      selectedPriceRange !== PRICE_RANGES[0],
      showInStock,
      showOnSale,
      showNewOnly,
    ].filter(Boolean).length;
    setActiveFiltersCount(count);
  }, [selectedCategory, selectedPriceRange, showInStock, showOnSale, showNewOnly]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const fetchProducts = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await fetch(`${API_BASE_URL}/products`);
      const data = await res.json();
      if (data.success && data.products) {
        const transformed = data.products.map(p => {
          const hasCampaign  = p.hasCampaign && p.campaign;
          const finalPrice   = hasCampaign ? p.campaignPrice : p.salePrice;
          const regularPrice = p.regularPrice > p.salePrice ? p.regularPrice : null;
          const discountLabel = hasCampaign
            ? (p.campaign.type === 'free_shipping' ? 'FREE SHIP'
              : p.campaign.discountType === 'percentage' ? `${p.campaign.discountValue}% OFF`
              : `UGX ${p.campaign.discountValue?.toLocaleString()} OFF`)
            : (regularPrice ? `${Math.round((1 - p.salePrice / p.regularPrice) * 100)}% OFF` : null);
          return {
            id: p._id,
            name: p.title,
            price: finalPrice,
            salePrice: p.salePrice,
            regularPrice,
            originalPrice: hasCampaign ? p.salePrice : regularPrice,
            campaignPrice: hasCampaign ? p.campaignPrice : null,
            image: p.images?.[0]?.url || p.images?.[0]?.uri || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
            images: p.images || [],
            rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)),
            reviews: Math.floor(Math.random() * 300) + 20,
            discount: discountLabel,
            campaign: p.campaign || null,
            hasCampaign: !!hasCampaign,
            campaignBannerColor: p.campaign?.bannerColor || null,
            category: p.category,
            subCategory: p.subCategory,
            brand: p.brand || '',
            description: p.description || '',
            stock: p.stock || 0,
            isNew: new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            seller: p.sellerId ? {
              name: p.sellerId.shop?.shopName || 'Unknown Shop',
              verified: p.sellerId.verified || false,
            } : null,
            cashOnDelivery: p.cashOnDelivery || 'No',
            paymentMethods: p.paymentMethods || {},
            sellerId: p.sellerId,
          };
        });
        setAllProducts(transformed);
        const cats = [...new Set(transformed.map(p => p.category))].filter(Boolean);
        setCategories(cats);
      }
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCartAndWishlist = async () => {
    const cart = await CartWishlistService.getCart();
    const wishlist = await CartWishlistService.getWishlist();
    setCartItems(cart);
    setWishlistItems(wishlist);
    setCartCount(cart.reduce((total, item) => total + item.quantity, 0));
    setWishlistCount(wishlist.length);
  };

  const handleAddToCart = async (product) => {
    const result = await CartWishlistService.addToCart(product);
    if (result.success) {
      CartWishlistService.showAddToCartAlert(product.name);
      loadCartAndWishlist();
    }
  };

  const handleQuantityChange = async (product, newQuantity) => {
    if (newQuantity === 0) {
      await CartWishlistService.removeFromCart(product.id);
    } else {
      await CartWishlistService.updateCartQuantity(product.id, newQuantity);
    }
    loadCartAndWishlist();
  };

  const handleToggleWishlist = async (product) => {
    const result = await CartWishlistService.toggleWishlist(product);
    if (result.success) {
      if (result.action === 'added') CartWishlistService.showAddToWishlistAlert(product.name);
      else CartWishlistService.showRemoveFromWishlistAlert(product.name);
      loadCartAndWishlist();
    }
  };

  const isInWishlist = (id) => wishlistItems.some(i => i.id === id);
  const getCartQty = (id) => (cartItems.find(i => i.id === id)?.quantity || 0);
  const isInCart = (id) => getCartQty(id) > 0;

  const filteredAndSorted = useMemo(() => {
    let result = [...allProducts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.subCategory?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory) result = result.filter(p => p.category === selectedCategory);

    // Price range
    result = result.filter(p => p.price >= selectedPriceRange.min && p.price <= selectedPriceRange.max);

    // In stock
    if (showInStock) result = result.filter(p => p.stock > 0);

    // On sale
    if (showOnSale) result = result.filter(p => p.discount);

    // New only
    if (showNewOnly) result = result.filter(p => p.isNew);

    // Sort
    switch (sortBy) {
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'popular': result.sort((a, b) => b.reviews - a.reviews); break;
      case 'discount': result.sort((a, b) => (b.hasCampaign ? 1 : 0) - (a.hasCampaign ? 1 : 0) || (b.discount ? 1 : 0) - (a.discount ? 1 : 0)); break;
      case 'newest': default: break;
    }

    return result;
  }, [allProducts, searchQuery, selectedCategory, selectedPriceRange, showInStock, showOnSale, showNewOnly, sortBy]);

  // Reset displayed list whenever filters/sort change
  useEffect(() => {
    if (filteredAndSorted.length === 0) { setDisplayedProducts([]); return; }
    setLoopOffset(0);
    setDisplayedProducts(filteredAndSorted.slice(0, PAGE_SIZE));
  }, [filteredAndSorted]);

  const loadMore = useCallback(() => {
    if (filteredAndSorted.length === 0) return;
    setDisplayedProducts(prev => {
      const nextStart = prev.length % filteredAndSorted.length;
      const chunk = filteredAndSorted.slice(nextStart, nextStart + PAGE_SIZE);
      // If chunk is smaller than PAGE_SIZE, wrap around
      const wrapped = chunk.length < PAGE_SIZE
        ? [...chunk, ...filteredAndSorted.slice(0, PAGE_SIZE - chunk.length)]
        : chunk;
      // Give each item a unique key by appending loop count
      const loop = Math.floor(prev.length / filteredAndSorted.length);
      return [...prev, ...wrapped.map(item => ({ ...item, id: `${item.id}_loop${loop}_${Math.random()}` }))];
    });
    setLoopOffset(o => o + 1);
  }, [filteredAndSorted]);

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedPriceRange(PRICE_RANGES[0]);
    setShowInStock(false);
    setShowOnSale(false);
    setShowNewOnly(false);
  };

  const renderGridCard = ({ item }) => {
    const inWishlist = isInWishlist(item.id);
    const cartQty = getCartQty(item.id);
    const inCart = isInCart(item.id);
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => navigation.push('ProductDetails', { product: item })}
        activeOpacity={0.85}
      >
        <View style={styles.cardImageWrap}>
          <AutoImage
            images={item.images?.length > 0 ? item.images : [{ url: item.image }]}
            style={styles.gridImage}
            intervalMs={4500}
          />
          {item.discount > 0 && (
            <View style={[styles.discountBadge, item.hasCampaign && { backgroundColor: item.campaignBannerColor || '#e74c3c', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
              {item.hasCampaign && <Ionicons name="flash" size={9} color="#fff" />}
              <Text style={styles.discountText}>{item.discount}</Text>
            </View>
          )}
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.wishlistBtn, inWishlist && styles.wishlistBtnActive]}
            onPress={() => handleToggleWishlist(item)}
          >
            <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={18} color={inWishlist ? '#e74c3c' : '#bdc3c7'} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          {item.brand ? <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text> : null}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#f39c12" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.reviewsText}>({item.reviews})</Text>
          </View>
          {/* 3-tier price block */}
          <View style={{ flexDirection: 'column', gap: 1, marginBottom: 8 }}>
            {item.regularPrice ? (
              <Text style={styles.originalPrice}>UGX {item.regularPrice?.toLocaleString()}</Text>
            ) : null}
            {item.hasCampaign && item.salePrice && item.salePrice !== item.regularPrice ? (
              <Text style={[styles.originalPrice, { color: '#f39c12' }]}>UGX {item.salePrice?.toLocaleString()}</Text>
            ) : null}
            <Text style={[styles.price, item.hasCampaign && { color: item.campaignBannerColor || '#e74c3c' }]}>
              UGX {item.price?.toLocaleString()}
            </Text>
            {item.hasCampaign && item.discount ? (
              <View style={[styles.discountBadge, { position: 'relative', top: 0, left: 0, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: item.campaignBannerColor || '#e74c3c' }]}>
                <Ionicons name="pricetag" size={8} color="#fff" />
                <Text style={styles.discountText}>{item.discount}</Text>
              </View>
            ) : null}
          </View>
          {item.stock === 0 ? (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          ) : inCart ? (
            <QuantitySelector
              product={item}
              currentQuantity={cartQty}
              onQuantityChange={(qty) => handleQuantityChange(item, qty)}
              compact={true}
              style={styles.quantitySelector}
            />
          ) : (
            <TouchableOpacity
              style={styles.addCartBtn}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="cart-outline" size={13} color="white" />
              <Text style={styles.addCartText}>Add to Cart</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderListCard = ({ item }) => {
    const inWishlist = isInWishlist(item.id);
    const cartQty = getCartQty(item.id);
    const inCart = isInCart(item.id);
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => navigation.push('ProductDetails', { product: item })}
        activeOpacity={0.85}
      >
        <View style={styles.listImageWrap}>
          <AutoImage
            images={item.images?.length > 0 ? item.images : [{ url: item.image }]}
            style={styles.listImage}
            intervalMs={4500}
          />
          {item.discount > 0 && (
            <View style={[styles.discountBadgeSmall, item.hasCampaign && { backgroundColor: item.campaignBannerColor || '#e74c3c', flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
              {item.hasCampaign && <Ionicons name="flash" size={8} color="#fff" />}
              <Text style={styles.discountTextSmall}>{item.discount}</Text>
            </View>
          )}
          {item.isNew && (
            <View style={[styles.newBadge, { top: 28, left: 6 }]}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          )}
        </View>
        <View style={styles.listBody}>
          <Text style={styles.cardCategory} numberOfLines={1}>{item.category}{item.subCategory ? ` › ${item.subCategory}` : ''}</Text>
          <Text style={styles.listName} numberOfLines={2}>{item.name}</Text>
          {item.brand ? <Text style={styles.cardBrand}>{item.brand}</Text> : null}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#f39c12" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.reviewsText}>({item.reviews})</Text>
            {item.seller?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={11} color="#3498db" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          {/* 3-tier price block */}
          <View style={{ flexDirection: 'column', gap: 1, marginBottom: 4 }}>
            {item.regularPrice ? (
              <Text style={styles.originalPrice}>UGX {item.regularPrice?.toLocaleString()}</Text>
            ) : null}
            {item.hasCampaign && item.salePrice && item.salePrice !== item.regularPrice ? (
              <Text style={[styles.originalPrice, { color: '#f39c12' }]}>UGX {item.salePrice?.toLocaleString()}</Text>
            ) : null}
            <Text style={[styles.price, item.hasCampaign && { color: item.campaignBannerColor || '#e74c3c' }]}>
              UGX {item.price?.toLocaleString()}
            </Text>
            {item.hasCampaign && item.discount ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: item.campaignBannerColor || '#e74c3c', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}>
                <Ionicons name="pricetag" size={8} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{item.discount}</Text>
              </View>
            ) : null}
          </View>
          {item.cashOnDelivery === 'Yes' && (
            <Text style={styles.codText}>Cash on Delivery available</Text>
          )}
        </View>
        <View style={styles.listActions}>
          <TouchableOpacity onPress={() => handleToggleWishlist(item)} style={styles.listWishBtn}>
            <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={20} color={inWishlist ? '#e74c3c' : '#bdc3c7'} />
          </TouchableOpacity>
          {item.stock === 0 ? (
            <View style={[styles.addCartBtn, styles.addCartBtnDisabled, { marginTop: 8 }]}>
              <Text style={styles.addCartText}>Out of Stock</Text>
            </View>
          ) : inCart ? (
            <QuantitySelector
              product={item}
              currentQuantity={cartQty}
              onQuantityChange={(qty) => handleQuantityChange(item, qty)}
              compact={true}
              style={[styles.quantitySelector, { marginTop: 8 }]}
            />
          ) : (
            <TouchableOpacity
              style={[styles.addCartBtn, { marginTop: 8 }]}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="cart-outline" size={13} color="white" />
              <Text style={styles.addCartText}>Add to Cart</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} animationType="slide" transparent onRequestClose={() => setFilterModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category */}
            <Text style={styles.filterSectionTitle}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Price Range */}
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            {PRICE_RANGES.map(range => (
              <TouchableOpacity
                key={range.label}
                style={styles.radioRow}
                onPress={() => setSelectedPriceRange(range)}
              >
                <View style={[styles.radio, selectedPriceRange.label === range.label && styles.radioActive]}>
                  {selectedPriceRange.label === range.label && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>{range.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Toggles */}
            <Text style={styles.filterSectionTitle}>Availability & Deals</Text>
            {[
              { label: 'In Stock Only', value: showInStock, setter: setShowInStock },
              { label: 'On Sale', value: showOnSale, setter: setShowOnSale },
              { label: 'New Arrivals', value: showNewOnly, setter: setShowNewOnly },
            ].map(({ label, value, setter }) => (
              <TouchableOpacity key={label} style={styles.toggleRow} onPress={() => setter(!value)}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <View style={[styles.toggle, value && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
            <Text style={styles.applyBtnText}>Show {filteredAndSorted.length} Results</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal visible={sortModalVisible} animationType="slide" transparent onRequestClose={() => setSortModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.sortModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setSortModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={styles.sortOption}
              onPress={() => { setSortBy(opt.value); setSortModalVisible(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionActive]}>{opt.label}</Text>
              {sortBy === opt.value && <Ionicons name="checkmark" size={18} color="#3498db" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.headerBg} />

      {/* Header — with expandable search */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder }]}>
        {showSearch ? (
          // Expanded search mode
          <>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={[styles.headerSearchBar, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
              <Ionicons name="search" size={16} color={theme.textMuted} />
              <TextInput
                ref={searchInputRef}
                style={[styles.headerSearchInput, { color: theme.text }]}
                placeholder="Search products, brands, categories..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          // Normal mode
          <>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>All Products</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.headerIcon}>
                <Ionicons name="search-outline" size={22} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Wishlist')} style={styles.headerIcon}>
                <Ionicons name="heart-outline" size={22} color={theme.text} />
                {wishlistCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{wishlistCount}</Text></View>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.headerIcon}>
                <Ionicons name="cart-outline" size={22} color={theme.text} />
                {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Category Quick Filters */}
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity
            style={[styles.catChip, !selectedCategory && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catChipText, !selectedCategory && styles.catChipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Toolbar: results count + sort/filter/view toggle */}
      <View style={styles.toolbar}>
        <Text style={styles.resultsCount}>
          {loading ? '...' : `${filteredAndSorted.length} product${filteredAndSorted.length !== 1 ? 's' : ''}`}
        </Text>
        <View style={styles.toolbarRight}>
          <TouchableOpacity style={[styles.toolbarBtn, activeFiltersCount > 0 && styles.toolbarBtnActive]} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={16} color={activeFiltersCount > 0 ? '#fff' : '#333'} />
            <Text style={[styles.toolbarBtnText, activeFiltersCount > 0 && { color: '#fff' }]}>
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setSortModalVisible(true)}>
            <Ionicons name="swap-vertical-outline" size={16} color="#333" />
            <Text style={styles.toolbarBtnText}>Sort</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
            <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active filter chips */}
      {activeFiltersCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {selectedCategory && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setSelectedCategory(null)}>
              <Text style={styles.activeChipText}>{selectedCategory}</Text>
              <Ionicons name="close" size={12} color="#3498db" />
            </TouchableOpacity>
          )}
          {selectedPriceRange !== PRICE_RANGES[0] && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setSelectedPriceRange(PRICE_RANGES[0])}>
              <Text style={styles.activeChipText}>{selectedPriceRange.label}</Text>
              <Ionicons name="close" size={12} color="#3498db" />
            </TouchableOpacity>
          )}
          {showInStock && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setShowInStock(false)}>
              <Text style={styles.activeChipText}>In Stock</Text>
              <Ionicons name="close" size={12} color="#3498db" />
            </TouchableOpacity>
          )}
          {showOnSale && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setShowOnSale(false)}>
              <Text style={styles.activeChipText}>On Sale</Text>
              <Ionicons name="close" size={12} color="#3498db" />
            </TouchableOpacity>
          )}
          {showNewOnly && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setShowNewOnly(false)}>
              <Text style={styles.activeChipText}>New Arrivals</Text>
              <Ionicons name="close" size={12} color="#3498db" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.activeChip, { backgroundColor: '#fee' }]} onPress={clearAllFilters}>
            <Text style={[styles.activeChipText, { color: '#e74c3c' }]}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Product List */}
      {loading ? (
        <ShopSkeleton isGrid={viewMode === 'grid'} />
      ) : filteredAndSorted.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={64} color="#ddd" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => { setSearchQuery(''); clearAllFilters(); }}>
            <Text style={styles.clearFiltersBtnText}>Clear Search & Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={displayedProducts}
            key={viewMode}
            keyExtractor={item => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            renderItem={viewMode === 'grid' ? renderGridCard : renderListCard}
            contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} colors={['#3498db']} />}
            columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : null}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              displayedProducts.length > 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ height: 1, width: 40, backgroundColor: '#e0e0e0' }} />
                    <Ionicons name="refresh-outline" size={14} color="#bbb" />
                    <View style={{ height: 1, width: 40, backgroundColor: '#e0e0e0' }} />
                  </View>
                  <Text style={{ fontSize: 11, color: '#bbb' }}>Showing more products</Text>
                </View>
              ) : null
            }
          />
        </Animated.View>
      )}

      {renderFilterModal()}
      {renderSortModal()}
      <BottomNav navigation={navigation} activeScreen="ShopAllProducts" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
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
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  headerRight: { flexDirection: 'row', gap: 4 },
  headerIcon: { padding: 8, position: 'relative' },
  headerSearchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 38,
  },
  headerSearchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#e74c3c', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: '#e8e8e8', height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingHorizontal: 10 },

  catScroll: { maxHeight: 44, marginBottom: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 4 },
  catChipActive: { backgroundColor: '#3498db' },
  catChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '600' },

  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultsCount: { fontSize: 13, color: '#888', fontWeight: '500' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8' },
  toolbarBtnActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  toolbarBtnText: { fontSize: 12, color: '#333', fontWeight: '500' },
  viewToggle: { padding: 6, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8' },

  activeFiltersScroll: { maxHeight: 40, marginVertical: 6 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#e8f4fd', borderWidth: 1, borderColor: '#3498db' },
  activeChipText: { fontSize: 12, color: '#3498db', fontWeight: '500' },

  listContent: { padding: 12, paddingBottom: 24 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },

  // Grid card
  gridCard: { width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  cardImageWrap: { position: 'relative' },
  gridImage: { width: '100%', height: CARD_WIDTH * 0.85 },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#e74c3c', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  newBadge: { position: 'absolute', top: 8, right: 36, backgroundColor: '#27ae60', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  wishlistBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: '#fff', borderRadius: 20, padding: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  wishlistBtnActive: { backgroundColor: '#fff0f0' },
  cardBody: { padding: 10 },
  cardCategory: { fontSize: 10, color: '#3498db', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', marginBottom: 2, lineHeight: 18 },
  cardBrand: { fontSize: 11, color: '#888', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  ratingText: { fontSize: 11, color: '#f39c12', fontWeight: '600' },
  reviewsText: { fontSize: 10, color: '#aaa' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  price: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  originalPrice: { fontSize: 11, color: '#aaa', textDecorationLine: 'line-through' },
  outOfStock: { fontSize: 11, color: '#e74c3c', fontWeight: '600', marginBottom: 6 },
  quantitySelector: { marginTop: 4 },
  addCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#3498db', borderRadius: 8, paddingVertical: 7 },
  addCartBtnDisabled: { backgroundColor: '#ccc' },
  addCartText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // List card
  listCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },
  listImageWrap: { position: 'relative' },
  listImage: { width: 110, height: 130 },
  discountBadgeSmall: { position: 'absolute', top: 6, left: 6, backgroundColor: '#e74c3c', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  discountTextSmall: { color: '#fff', fontSize: 9, fontWeight: '700' },
  listBody: { flex: 1, padding: 10, justifyContent: 'center' },
  listName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 3, lineHeight: 19 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 },
  verifiedText: { fontSize: 10, color: '#3498db' },
  codText: { fontSize: 10, color: '#27ae60', marginTop: 4 },
  listActions: { padding: 10, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  listWishBtn: { padding: 6 },

  // Loading / Empty
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
  clearFiltersBtn: { marginTop: 20, backgroundColor: '#3498db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  clearFiltersBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  sortModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  clearText: { fontSize: 14, color: '#e74c3c', marginRight: 16, fontWeight: '500' },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10, marginTop: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  filterChipActive: { backgroundColor: '#3498db' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioActive: { borderColor: '#3498db' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3498db' },
  radioLabel: { fontSize: 14, color: '#333' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  toggleLabel: { fontSize: 14, color: '#333' },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#ddd', padding: 2 },
  toggleActive: { backgroundColor: '#3498db' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbActive: { transform: [{ translateX: 20 }] },
  applyBtn: { backgroundColor: '#3498db', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  sortOptionText: { fontSize: 15, color: '#333' },
  sortOptionActive: { color: '#3498db', fontWeight: '700' },
});

