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
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

// ── Shimmer skeleton — white beam sweeps through grey bones ───────────────
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

// Stats card skeleton — matches the 4-stat row at the top
const StatsSkeleton = ({ anim }) => (
  <View style={{ flexDirection: 'row', margin: 16, gap: 10 }}>
    {[...Array(4)].map((_, i) => (
      <View key={i} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', gap: 6, elevation: 1 }}>
        <Bone anim={anim} w={32} h={32} radius={16} />
        <Bone anim={anim} w={28} h={14} radius={4} />
        <Bone anim={anim} w={44} h={10} radius={4} />
      </View>
    ))}
  </View>
);

// Category card skeleton — matches the full category card shape
const CategoryCardSkeleton = ({ anim }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 }}>
    {/* Header row: icon + name + chevron */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <Bone anim={anim} w={52} h={52} radius={14} />
      <View style={{ flex: 1, gap: 7 }}>
        <Bone anim={anim} w="55%" h={14} radius={5} />
        <Bone anim={anim} w="35%" h={10} radius={4} />
      </View>
      <Bone anim={anim} w={20} h={20} radius={4} />
    </View>
    {/* Detail row: price + stock */}
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
      <Bone anim={anim} w="50%" h={11} radius={4} />
      <Bone anim={anim} w="35%" h={11} radius={4} />
    </View>
    {/* Sub-category tags */}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Bone anim={anim} w={70} h={24} radius={12} />
      <Bone anim={anim} w={80} h={24} radius={12} />
      <Bone anim={anim} w={60} h={24} radius={12} />
    </View>
  </View>
);

const CategoriesSkeleton = () => {
  const anim = useShimmer();
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
      <StatsSkeleton anim={anim} />
      <View style={{ paddingHorizontal: 16 }}>
        {[...Array(5)].map((_, i) => <CategoryCardSkeleton key={i} anim={anim} />)}
      </View>
    </ScrollView>
  );
};

const AllCategories = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch products to extract categories
      const response = await fetch(`${API_BASE}/products`);
      const data = await response.json();
      
      if (data.success && data.products) {
        // Extract unique categories and subcategories with stats
        const categoryMap = {};
        
        data.products.forEach(product => {
          const category = product.category;
          const subCategory = product.subCategory;
          
          if (!categoryMap[category]) {
            categoryMap[category] = {
              name: category,
              subCategories: new Set(),
              productCount: 0,
              totalStock: 0,
              priceRange: { min: Infinity, max: 0 },
              icon: getCategoryIcon(category),
              color: getCategoryColor(category),
              products: []
            };
          }
          
          categoryMap[category].subCategories.add(subCategory);
          categoryMap[category].productCount++;
          categoryMap[category].totalStock += product.stock || 0;
          categoryMap[category].priceRange.min = Math.min(categoryMap[category].priceRange.min, product.salePrice);
          categoryMap[category].priceRange.max = Math.max(categoryMap[category].priceRange.max, product.salePrice);
          categoryMap[category].products.push(product);
        });
        
        // Convert to array and sort by product count
        const categoriesArray = Object.values(categoryMap)
          .map(cat => ({
            ...cat,
            subCategories: Array.from(cat.subCategories),
            priceRange: cat.priceRange.min === Infinity ? { min: 0, max: 0 } : cat.priceRange
          }))
          .sort((a, b) => b.productCount - a.productCount);
        
        setCategories(categoriesArray);
        
        // Calculate overall stats
        const stats = {
          totalCategories: categoriesArray.length,
          totalSubCategories: categoriesArray.reduce((sum, cat) => sum + cat.subCategories.length, 0),
          totalProducts: data.products.length,
          totalStock: categoriesArray.reduce((sum, cat) => sum + cat.totalStock, 0)
        };
        setCategoryStats(stats);
      }
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to mock data
      setCategories([
        {
          name: "Electronics",
          subCategories: ["Phones", "Laptops"],
          productCount: 6,
          totalStock: 389,
          priceRange: { min: 2000000, max: 9000000 },
          icon: "phone-portrait",
          color: "#3498db",
          products: []
        },
        {
          name: "Fashion",
          subCategories: ["Clothing"],
          productCount: 2,
          totalStock: 100,
          priceRange: { min: 9000000, max: 9000000 },
          icon: "shirt",
          color: "#e74c3c",
          products: []
        },
        {
          name: "Health & Beauty",
          subCategories: ["Personal Care"],
          productCount: 1,
          totalStock: 7,
          priceRange: { min: 7000000, max: 7000000 },
          icon: "heart",
          color: "#e91e63",
          products: []
        }
      ]);
      setCategoryStats({
        totalCategories: 3,
        totalSubCategories: 4,
        totalProducts: 9,
        totalStock: 496
      });
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

  const handleCategoryPress = (category) => {
    navigation.navigate('CategoryProducts', { category: category.name });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredCategories = searchQuery.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : categories;

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>

          {showSearch ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 10, paddingHorizontal: 12, marginHorizontal: 8, height: 40 }}>
              <Ionicons name="search" size={16} color="#888" />
              <TextInput
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#333' }}
                placeholder="Search categories..."
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>All Categories</Text>
              <Text style={styles.headerSubtitle}>Browse by category</Text>
            </View>
          )}

          <TouchableOpacity style={styles.searchButton} onPress={() => { setShowSearch(s => !s); setSearchQuery(''); }}>
            <Ionicons name={showSearch ? 'close' : 'search'} size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Category Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#3498db20' }]}>
            <Ionicons name="grid" size={20} color="#3498db" />
          </View>
          <Text style={styles.statNumber}>{categoryStats.totalCategories}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#e74c3c20' }]}>
            <Ionicons name="list" size={20} color="#e74c3c" />
          </View>
          <Text style={styles.statNumber}>{categoryStats.totalSubCategories}</Text>
          <Text style={styles.statLabel}>Sub-Categories</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#27ae6020' }]}>
            <Ionicons name="cube" size={20} color="#27ae60" />
          </View>
          <Text style={styles.statNumber}>{categoryStats.totalProducts}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#f39c1220' }]}>
            <Ionicons name="layers" size={20} color="#f39c12" />
          </View>
          <Text style={styles.statNumber}>{categoryStats.totalStock}</Text>
          <Text style={styles.statLabel}>Total Stock</Text>
        </View>
      </View>
    </View>
  );

  const renderCategoryCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={28} color="white" />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryProductCount}>
            {item.productCount} product{item.productCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
      </View>
      
      <View style={styles.categoryDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag" size={14} color="#7f8c8d" />
            <Text style={styles.detailText}>
              UGX {item.priceRange.min.toLocaleString()} - {item.priceRange.max.toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="layers" size={14} color="#7f8c8d" />
            <Text style={styles.detailText}>{item.totalStock} in stock</Text>
          </View>
        </View>
        
        <View style={styles.subCategoriesContainer}>
          <Text style={styles.subCategoriesLabel}>Sub-categories:</Text>
          <View style={styles.subCategoriesList}>
            {item.subCategories.slice(0, 3).map((subCat, index) => (
              <View key={index} style={styles.subCategoryTag}>
                <Text style={styles.subCategoryText}>{subCat}</Text>
              </View>
            ))}
            {item.subCategories.length > 3 && (
              <View style={styles.subCategoryTag}>
                <Text style={styles.subCategoryText}>+{item.subCategories.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <CategoriesSkeleton />
        <BottomNav navigation={navigation} activeScreen="AllCategories" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}>
        {renderStatsCard()}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <Text style={styles.sectionSubtitle}>
            Discover products organized by category
          </Text>
          <FlatList
            data={filteredCategories}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.name}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesList}
          />
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
  
  // Stats Card Styles
  statsCard: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Categories Section Styles
  categoriesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  categoriesList: {
    gap: 15,
  },
  
  // Category Card Styles
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  categoryProductCount: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  
  // Category Details Styles
  categoryDetails: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 5,
  },
  
  // Sub-categories Styles
  subCategoriesContainer: {
    marginTop: 5,
  },
  subCategoriesLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  subCategoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subCategoryTag: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subCategoryText: {
    fontSize: 11,
    color: '#34495e',
    fontWeight: '500',
  },
});

export default AllCategories;
