import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const Wishlist = ({ navigation }) => {
  const { theme } = useTheme();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const wishlistData = await AsyncStorage.getItem('wishlist');
      if (wishlistData) {
        setWishlistItems(JSON.parse(wishlistData));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const updatedWishlist = wishlistItems.filter(item => item.id !== productId);
      setWishlistItems(updatedWishlist);
      await AsyncStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
      
      Alert.alert('Removed from Wishlist', 'Item has been removed from your wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const addToCart = async (product) => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      let cart = cartData ? JSON.parse(cartData) : [];
      
      const existingItem = cart.find(item => item.id === product.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }
      
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      Alert.alert('Added to Cart! 🛒', `${product.name} has been added to your cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const moveToCart = async (product) => {
    await addToCart(product);
    await removeFromWishlist(product.id);
  };

  const clearWishlist = () => {
    Alert.alert(
      'Clear Wishlist',
      'Are you sure you want to remove all items from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setWishlistItems([]);
            await AsyncStorage.removeItem('wishlist');
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder }]}>
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
            <Text style={styles.headerTitle}>My Wishlist</Text>
            <Text style={styles.headerSubtitle}>
              {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          {wishlistItems.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearWishlist}
            >
              <Ionicons name="trash-outline" size={24} color="#e74c3c" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.ordersBtn}
            onPress={() => navigation.navigate('UserOrders')}
          >
            <Ionicons name="receipt-outline" size={22} color="#3498db" />
            <Text style={{ fontSize: 10, color: '#3498db', fontWeight: '600', marginTop: 1 }}>Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );

  const renderWishlistItem = ({ item }) => (
    <View style={styles.wishlistItem}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      
      <View style={styles.productInfo}>
        <Text style={styles.categoryLabel}>{item.category}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color="#f39c12" />
          <Text style={styles.ratingText}>{item.rating?.toFixed(1)}</Text>
          <Text style={styles.reviewText}>({item.reviews})</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>UGX {item.price?.toLocaleString()}</Text>
          {item.originalPrice && (
            <Text style={styles.originalPrice}>UGX {item.originalPrice?.toLocaleString()}</Text>
          )}
          {item.discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discount}</Text>
            </View>
          )}
        </View>
        
        {item.stock && (
          <View style={styles.stockContainer}>
            <Ionicons 
              name={item.stock > 0 ? "checkmark-circle" : "close-circle"} 
              size={12} 
              color={item.stock > 0 ? "#27ae60" : "#e74c3c"} 
            />
            <Text style={[styles.stockText, { color: item.stock > 0 ? "#27ae60" : "#e74c3c" }]}>
              {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeFromWishlist(item.id)}
        >
          <Ionicons name="heart" size={20} color="#e74c3c" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.cartButton, item.stock === 0 && styles.disabledButton]}
          onPress={() => moveToCart(item)}
          disabled={item.stock === 0}
        >
          <Ionicons name="cart-outline" size={16} color="white" />
          <Text style={styles.cartButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyWishlist = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={80} color="#bdc3c7" />
      </View>
      <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
      <Text style={styles.emptySubtitle}>
        Save items you love by tapping the heart icon on any product
      </Text>
      <TouchableOpacity 
        style={styles.shopNowButton}
        onPress={() => navigation.navigate('home')}
      >
        <Ionicons name="storefront-outline" size={20} color="white" />
        <Text style={styles.shopNowText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWishlistSummary = () => {
    if (wishlistItems.length === 0) return null;
    
    const totalValue = wishlistItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const availableItems = wishlistItems.filter(item => item.stock > 0).length;
    
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Wishlist Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Items:</Text>
          <Text style={styles.summaryValue}>{wishlistItems.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available:</Text>
          <Text style={[styles.summaryValue, { color: '#27ae60' }]}>{availableItems}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Value:</Text>
          <Text style={[styles.summaryValue, { color: '#3498db', fontWeight: 'bold' }]}>
            UGX {totalValue.toLocaleString()}
          </Text>
        </View>
        
        {availableItems > 0 && (
          <TouchableOpacity 
            style={styles.addAllToCartButton}
            onPress={() => {
              Alert.alert(
                'Add All to Cart',
                `Add all ${availableItems} available items to your cart?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Add All',
                    onPress: async () => {
                      for (const item of wishlistItems) {
                        if (item.stock > 0) {
                          await addToCart(item);
                        }
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="cart" size={18} color="white" />
            <Text style={styles.addAllText}>Add All Available to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Ionicons name="heart" size={48} color="#e74c3c" />
          <Text style={styles.loadingText}>Loading your wishlist...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {renderHeader()}
      
      {wishlistItems.length === 0 ? (
        renderEmptyWishlist()
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderWishlistSummary()}
          
          <FlatList
            data={wishlistItems}
            renderItem={renderWishlistItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.wishlistContainer}
          />
        </ScrollView>
      )}
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
  clearButton: {
    padding: 8,
  },
  ordersBtn: {
    padding: 8,
    marginLeft: 2,
    alignItems: 'center',
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
  
  // Summary Card
  summaryCard: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  summaryValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  addAllToCartButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  addAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Wishlist Container
  wishlistContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // Wishlist Item Styles
  wishlistItem: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryLabel: {
    fontSize: 10,
    color: '#3498db',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
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
    marginLeft: 8,
  },
  discountBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  // Action Buttons
  actionButtons: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  removeButton: {
    padding: 8,
  },
  cartButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  cartButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  shopNowButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  shopNowText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Wishlist;
