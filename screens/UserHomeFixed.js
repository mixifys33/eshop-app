import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const UserHomeFixed = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('Home');
  const [cartCount, setCartCount] = useState(3);
  const [wishlistCount, setWishlistCount] = useState(7);
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Mock categories
  const categories = [
    { id: 1, name: "Electronics", icon: "phone-portrait", color: "#3498db" },
    { id: 2, name: "Fashion", icon: "shirt", color: "#e74c3c" },
    { id: 3, name: "Home & Garden", icon: "home", color: "#27ae60" },
    { id: 4, name: "Sports", icon: "football", color: "#f39c12" },
  ];

  // Mock products
  const products = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    price: (Math.random() * 1000 + 100).toFixed(2),
    image: `https://picsum.photos/200/200?random=${i}`,
    category: categories[i % categories.length].name,
  }));

  const StickyHeader = () => (
    <View style={styles.stickyHeader}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.headerContent}>
          {/* Header Icons Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowSearchBar(!showSearchBar)}
            >
              <Ionicons name="search" size={24} color="#3498db" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <View style={styles.iconWithBadge}>
                <Ionicons name="cart" size={24} color="#f39c12" />
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <View style={styles.iconWithBadge}>
                <Ionicons name="heart" size={24} color="#e74c3c" />
                {wishlistCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{wishlistCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#3498db" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <View style={styles.profileIcon}>
                <Ionicons name="person" size={20} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {showSearchBar && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              <TouchableOpacity 
                onPress={() => {
                  setShowSearchBar(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Navigation Tabs */}
          <View style={styles.tabsContainer}>
            {['Home', 'All products', 'Offers'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.activeTab]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );

  const CategorySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoriesRow}>
          {categories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                <Ionicons name={category.icon} size={24} color="white" />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const ProductGrid = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Products</Text>
      <View style={styles.productGrid}>
        {products.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <Image source={{ uri: product.image }} style={styles.productImage} />
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productPrice}>${product.price}</Text>
            <TouchableOpacity style={styles.addToCartBtn}>
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <StickyHeader />
      
      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
      >
        <CategorySection />
        <ProductGrid />
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🎉 Header stays fixed while content scrolls!</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Sticky Header - This stays fixed at top
  stickyHeader: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  
  headerSafeArea: {
    backgroundColor: 'white',
  },
  
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 12,
  },
  
  iconButton: {
    padding: 8,
  },
  
  iconWithBadge: {
    position: 'relative',
  },
  
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
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
  
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  
  searchIcon: {
    marginRight: 8,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  // Navigation Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 4,
  },
  
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  
  // Scrollable Content
  scrollView: {
    flex: 1,
  },
  
  section: {
    backgroundColor: 'white',
    marginTop: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  
  // Categories
  categoriesRow: {
    flexDirection: 'row',
  },
  
  categoryCard: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 80,
  },
  
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  
  categoryName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Products
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  
  addToCartBtn: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  
  addToCartText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    backgroundColor: '#27ae60',
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  
  footerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UserHomeFixed;
