import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StickyHeaderDemo = () => {
  const [scrollY] = useState(new Animated.Value(0));
  const [headerOpacity] = useState(new Animated.Value(1));

  // Create animated header that responds to scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        // Fade header slightly when scrolling for visual feedback
        const opacity = Math.max(0.9, 1 - offsetY / 1000);
        headerOpacity.setValue(opacity);
      }
    }
  );

  const renderStickyHeader = () => (
    <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContent}>
          {/* Header Icons - Always Accessible */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="search" size={24} color="#3498db" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <View style={styles.iconContainer}>
                <Ionicons name="cart" size={24} color="#f39c12" />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <View style={styles.iconContainer}>
                <Ionicons name="heart" size={24} color="#e74c3c" />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>7</Text>
                </View>
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
          
          {/* Navigation Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={[styles.tab, styles.activeTab]}>
              <Text style={styles.activeTabText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab}>
              <Text style={styles.tabText}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab}>
              <Text style={styles.tabText}>Offers</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );

  const renderContent = () => {
    const sections = [
      { title: 'Categories', color: '#3498db', items: 8 },
      { title: 'Featured Products', color: '#e74c3c', items: 12 },
      { title: 'New Arrivals', color: '#27ae60', items: 15 },
      { title: 'Best Sellers', color: '#f39c12', items: 10 },
      { title: 'Special Offers', color: '#9b59b6', items: 6 },
    ];

    return sections.map((section, index) => (
      <View key={index} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {/* Mock content items */}
        {Array.from({ length: section.items }).map((_, itemIndex) => (
          <View key={itemIndex} style={[styles.contentItem, { borderLeftColor: section.color }]}>
            <View style={[styles.itemIcon, { backgroundColor: section.color }]}>
              <Ionicons name="cube" size={16} color="white" />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>
                {section.title} Item {itemIndex + 1}
              </Text>
              <Text style={styles.itemDescription}>
                This content scrolls behind the sticky header
              </Text>
            </View>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      {/* Sticky Header - Always visible */}
      {renderStickyHeader()}
      
      {/* Scrollable Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
      >
        <View style={styles.demoInfo}>
          <Text style={styles.demoTitle}>✅ Sticky Header Demo</Text>
          <Text style={styles.demoDescription}>
            • Header stays visible at the top{'\n'}
            • Content scrolls behind it{'\n'}
            • Search, cart, wishlist, AI, profile always accessible{'\n'}
            • Works on web and mobile
          </Text>
        </View>
        
        {renderContent()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎉 Perfect sticky header behavior achieved!
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    ...Platform.select({
      web: {
        position: 'fixed',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  
  safeArea: {
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
  
  iconContainer: {
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
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
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
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  
  // Scrollable Content
  scrollView: {
    flex: 1,
    paddingTop: Platform.select({
      ios: 120,
      android: 120,
      web: 110,
    }),
  },
  
  scrollContent: {
    paddingBottom: 40,
  },
  
  demoInfo: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  demoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 12,
  },
  
  demoDescription: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
  },
  
  // Content Sections
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  
  itemContent: {
    flex: 1,
  },
  
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  
  itemDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  
  footer: {
    backgroundColor: '#27ae60',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default StickyHeaderDemo;