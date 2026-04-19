import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Easing,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapZonePicker from '../components/MapZonePicker';

import API_BASE from '../constants/api';
const API = API_BASE;

const { width } = Dimensions.get('window');

// ── Marketing Tab (inline component so it has its own state) ──────────────
const STATUS_COLORS = { active: '#27ae60', draft: '#f39c12', paused: '#95a5a6', ended: '#e74c3c' };
const TYPE_ICONS    = { discount: 'pricetag-outline', flash_sale: 'flash-outline', buy_x_get_y: 'gift-outline', free_shipping: 'bicycle-outline', bundle: 'layers-outline' };
const TYPE_COLORS   = { discount: '#e74c3c', flash_sale: '#f39c12', buy_x_get_y: '#9b59b6', free_shipping: '#3498db', bundle: '#27ae60' };

const MarketingTab = ({ navigation, onCampaignsLoaded }) => {
  const [campaigns, setCampaigns] = React.useState([]);
  const [loading, setLoading]     = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('currentSeller');
        if (!raw) return;
        const s = JSON.parse(raw);
        const sid = s.id || s._id;
        const res  = await fetch(`${API}/campaigns/seller/${sid}`);
        const data = await res.json();
        if (data.success) {
          setCampaigns(data.campaigns);
          if (onCampaignsLoaded) onCampaignsLoaded(data.campaigns);
        }
      } catch (e) { console.error('MarketingTab fetch error:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  const active = campaigns.filter(c => c.status === 'active').length;
  const draft  = campaigns.filter(c => c.status === 'draft').length;

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top nav button */}
      <TouchableOpacity
        style={{ margin: 16, marginBottom: 8, backgroundColor: '#e74c3c', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 }}
        onPress={() => navigation.navigate('SellerMarketing')}
      >
        <Ionicons name="megaphone-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Open Marketing Dashboard</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total',  value: campaigns.length, color: '#3498db' },
          { label: 'Active', value: active,            color: '#27ae60' },
          { label: 'Draft',  value: draft,             color: '#f39c12' },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderTopWidth: 3, borderTopColor: s.color, elevation: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Campaign list */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>Your Campaigns</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SellerMarketing')}>
            <Text style={{ fontSize: 13, color: '#e74c3c', fontWeight: '600' }}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#e74c3c" style={{ marginTop: 20 }} />
        ) : campaigns.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 30, backgroundColor: '#fff', borderRadius: 14 }}>
            <Ionicons name="megaphone-outline" size={44} color="#ddd" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#aaa', marginTop: 10 }}>No campaigns yet</Text>
            <TouchableOpacity
              style={{ marginTop: 14, backgroundColor: '#e74c3c', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => navigation.navigate('SellerMarketing')}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Create Campaign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          campaigns.slice(0, 5).map(c => {
            const typeColor = TYPE_COLORS[c.type] || '#e74c3c';
            const typeIcon  = TYPE_ICONS[c.type]  || 'pricetag-outline';
            const statusColor = STATUS_COLORS[c.status] || '#95a5a6';
            return (
              <TouchableOpacity
                key={c._id}
                style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, borderLeftColor: c.bannerColor || typeColor, elevation: 1 }}
                onPress={() => navigation.navigate('SellerMarketing')}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: typeColor + '18', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={typeIcon} size={20} color={typeColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#2c3e50' }} numberOfLines={1}>{c.title}</Text>
                  <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {c.discountValue > 0 ? (c.discountType === 'percentage' ? `${c.discountValue}% off` : `UGX ${c.discountValue?.toLocaleString()} off`) : c.type.replace('_', ' ')}
                    {' · '}{new Date(c.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ backgroundColor: statusColor + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>{c.status.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {campaigns.length > 5 && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e74c3c40' }}
            onPress={() => navigation.navigate('SellerMarketing')}
          >
            <Text style={{ color: '#e74c3c', fontWeight: '600', fontSize: 13 }}>View all {campaigns.length} campaigns</Text>
            <Ionicons name="chevron-forward" size={14} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const SellerDashboard = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sellerInfo, setSellerInfo] = useState({
    name: 'Seller',
    email: '',
    shopName: '',
    businessAddress: '',
    city: ''
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delivery state � all dynamic, loaded from DB
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [sellerTerminals, setSellerTerminals] = useState([]); // terminals this seller has enabled
  const [allTerminals, setAllTerminals] = useState([]);       // all Link Bus terminals from DB
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);

  // Add Zone modal
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', fee: '15000', estimatedDays: '2-3' });
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Add Terminal modal
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalSearchResults, setTerminalSearchResults] = useState([]);
  const [typewriterText, setTypewriterText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  
  // Products state
  const [topProducts, setTopProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [totalProductCount, setTotalProductCount] = useState(0);

  // Orders summary state (for Orders tab)
  const [dashOrders, setDashOrders] = useState([]);
  const [dashOrdersLoading, setDashOrdersLoading] = useState(false);
  
  // Onboarding steps state
  const [onboardingSteps, setOnboardingSteps] = useState({
    paymentSettings: false,
    deliverySetup: false,
    firstProduct: false,
    bulkUpload: false,
    campaign: false,
  });
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Add debugging
  console.log('SellerDashboard component rendered');
  console.log('Navigation prop:', navigation);

  // Fetch seller information
  useEffect(() => {
    fetchSellerInfo();
    fetchDeliveryData();
    startInitialAnimations();
    checkOnboardingStatus();
  }, []);

  // Fetch products when seller info is loaded
  useEffect(() => {
    if (sellerInfo.email && !loading) {
      fetchTopProducts();
    }
  }, [sellerInfo, loading]);

  // Fetch orders on initial load (not just when orders tab is active)
  useEffect(() => {
    if (sellerInfo.email && !loading) {
      fetchDashOrders();
    }
  }, [sellerInfo, loading]);

  // Re-check onboarding when data changes
  useEffect(() => {
    if (!loading && !productsLoading && !dashOrdersLoading && !deliveryLoading) {
      checkOnboardingStatus();
    }
  }, [loading, productsLoading, dashOrdersLoading, deliveryLoading, topProducts, dashOrders, deliverySettings, sellerTerminals, campaigns]);

  // Typewriter effect
  useEffect(() => {
    if (sellerInfo.name && !loading) {
      startTypewriterEffect();
    }
  }, [sellerInfo, loading]);

  // Shimmer animation for loading states
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const startInitialAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.elastic(1)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startTypewriterEffect = () => {
    const welcomeMessage = getWelcomeMessage();
    const subtitle = getSubtitle();
    
    setTypewriterText('');
    setSubtitleText('');
    
    // Typewriter for main message
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < welcomeMessage.length) {
        setTypewriterText(welcomeMessage.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        // Start subtitle typewriter after main message
        setTimeout(() => {
          let j = 0;
          const subtitleInterval = setInterval(() => {
            if (j < subtitle.length) {
              setSubtitleText(subtitle.slice(0, j + 1));
              j++;
            } else {
              clearInterval(subtitleInterval);
            }
          }, 50);
        }, 300);
      }
    }, 80);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Refresh animation
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation during refresh
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    try {
      await fetchSellerInfo();
      await fetchTopProducts();
      await fetchDashOrders();
      await fetchDeliveryData();
      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      pulseAnimation.stop();
      setRefreshing(false);
      
      // Reset animations
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const fetchSellerInfo = async () => {
    try {
      setLoading(true);
      
      // Get seller data from AsyncStorage (saved during login)
      const savedSellerData = await AsyncStorage.getItem('currentSeller');
      
      if (savedSellerData) {
        const sellerData = JSON.parse(savedSellerData);
        console.log('Found saved seller data:', sellerData);
        
        // Fetch additional shop information from backend
        try {
          const response = await fetch(`${API}/sellers/shop/${sellerData.id}`);
          
          if (response.ok) {
            const shopData = await response.json();
            console.log('Shop data received:', shopData);
            
            setSellerInfo({
              name: sellerData.name || 'Seller',
              email: sellerData.email || '',
              shopName: shopData.shop?.shopName || '',
              businessAddress: shopData.shop?.businessAddress || '',
              city: shopData.shop?.city || ''
            });
          } else {
            // If no shop data, just use seller data
            setSellerInfo({
              name: sellerData.name || 'Seller',
              email: sellerData.email || '',
              shopName: '',
              businessAddress: '',
              city: ''
            });
          }
        } catch (shopError) {
          console.log('Could not fetch shop data:', shopError);
          // Use seller data only
          setSellerInfo({
            name: sellerData.name || 'Seller',
            email: sellerData.email || '',
            shopName: '',
            businessAddress: '',
            city: ''
          });
        }
      } else {
        console.log('No saved seller data found');
        // Try to get from navigation params or use defaults
        setSellerInfo({
          name: 'Seller',
          email: '',
          shopName: '',
          businessAddress: '',
          city: ''
        });
      }
    } catch (error) {
      console.error('Error fetching seller info:', error);
      setSellerInfo({
        name: 'Seller',
        email: '',
        shopName: '',
        businessAddress: '',
        city: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    try {
      setProductsLoading(true);
      
      // Get seller data from AsyncStorage
      const savedSellerData = await AsyncStorage.getItem('currentSeller');
      
      if (!savedSellerData) {
        console.log('No seller data found for products fetch');
        return;
      }
      
      const sellerData = JSON.parse(savedSellerData);
      const sellerId = sellerData._id || sellerData.id;
      
      console.log('Fetching top products for seller:', sellerId);
      
      const response = await fetch(`${API}/products/seller/${sellerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.products) {
        // Sort products by creation date (newest first) and take top 10
        const sortedProducts = data.products
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10);
        
        console.log(`Fetched ${sortedProducts.length} top products`);
        setTotalProductCount(data.products.length);
        setTopProducts(sortedProducts);
      } else {
        console.log('No products found or invalid response');
        setTopProducts([]);
      }
      
    } catch (error) {
      console.error('Error fetching top products:', error);
      setTopProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // -- Delivery helpers ----------------------------------------------------
  const fetchDashOrders = async () => {
    try {
      setDashOrdersLoading(true);
      const saved = await AsyncStorage.getItem('currentSeller');
      if (!saved) {
        console.log('No seller data found for orders fetch');
        setDashOrders([]);
        return;
      }
      const s = JSON.parse(saved);
      const sid = s.id || s._id;
      if (!sid) {
        console.log('No seller ID found');
        setDashOrders([]);
        return;
      }
      console.log('Fetching orders for seller:', sid);
      const res = await fetch(`${API}/orders?sellerId=${sid}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Fetched ${data.orders?.length || 0} orders`);
        setDashOrders(data.orders || []);
      } else {
        console.log('Failed to fetch orders:', res.status);
        setDashOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setDashOrders([]);
    } finally { 
      setDashOrdersLoading(false); 
    }
  };

  const fetchDeliveryData = async () => {
    try {
      setDeliveryLoading(true);
      const saved = await AsyncStorage.getItem('currentSeller');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const sellerId = parsed.id || parsed._id;
      if (!sellerId) return;

      const [settingsRes, terminalsRes] = await Promise.all([
        fetch(`${API}/delivery/seller/${sellerId}`),
        fetch(`${API}/delivery/terminals`),
      ]);

      if (settingsRes.ok) {
        const { delivery } = await settingsRes.json();
        setDeliverySettings(delivery);
        setDeliveryZones(delivery?.zones || []);
        setSellerTerminals(delivery?.terminals || []);
      }
      if (terminalsRes.ok) {
        const { terminals } = await terminalsRes.json();
        setAllTerminals(terminals);
      }
    } catch (e) {
      console.error('fetchDeliveryData error:', e);
    } finally {
      setDeliveryLoading(false);
    }
  };

  const saveDeliveryToServer = async (updatedZones, updatedTerminals, extraFields = {}) => {
    try {
      setDeliverySaving(true);
      const saved = await AsyncStorage.getItem('currentSeller');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const sellerId = parsed.id || parsed._id;
      if (!sellerId) return;

      const body = {
        zones: updatedZones,
        terminals: updatedTerminals.map(t => t._id || t),
        ...extraFields,
      };

      const res = await fetch(`${API}/delivery/seller/${sellerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Save delivery failed:', res.status, errText);
        throw new Error('Save failed');
      }
      const { delivery } = await res.json();
      setDeliverySettings(delivery);
      setDeliveryZones(delivery?.zones || []);
      setSellerTerminals(delivery?.terminals || []);
    } catch (e) {
      Alert.alert('Error', 'Could not save delivery settings. Please try again.');
    } finally {
      setDeliverySaving(false);
    }
  };

  const toggleZoneActive = async (zoneId) => {
    const updated = deliveryZones.map(z =>
      (z._id?.toString() || z.id) === zoneId ? { ...z, active: !z.active } : z
    );
    setDeliveryZones(updated);
    await saveDeliveryToServer(updated, sellerTerminals);
  };

  const addZone = async () => {
    if (!newZone.name.trim()) return Alert.alert('Error', 'Zone name is required');
    const zone = {
      name: newZone.name.trim(),
      fee: parseInt(newZone.fee) || 15000,
      estimatedDays: newZone.estimatedDays || '2-3',
      active: true,
    };
    const updated = [...deliveryZones, zone];
    setShowZoneModal(false);
    setNewZone({ name: '', fee: '15000', estimatedDays: '2-3' });
    await saveDeliveryToServer(updated, sellerTerminals);
  };

  const removeZone = async (zoneId) => {
    Alert.alert('Remove Zone', 'Remove this delivery zone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = deliveryZones.filter(z => (z._id?.toString() || z.id) !== zoneId);
          await saveDeliveryToServer(updated, sellerTerminals);
        }
      }
    ]);
  };

  const addTerminal = async (terminal) => {
    const alreadyAdded = sellerTerminals.some(t => (t._id || t) === terminal._id);
    if (alreadyAdded) return Alert.alert('Already added', 'This terminal is already in your list.');
    const updated = [...sellerTerminals, terminal];
    setShowTerminalModal(false);
    setTerminalSearch('');
    setTerminalSearchResults([]);
    await saveDeliveryToServer(deliveryZones, updated);
  };

  const removeTerminal = async (terminalId) => {
    Alert.alert('Remove Terminal', 'Remove this terminal from your delivery list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = sellerTerminals.filter(t => (t._id || t) !== terminalId);
          await saveDeliveryToServer(deliveryZones, updated);
        }
      }
    ]);
  };

  const searchTerminals = (query) => {
    setTerminalSearch(query);
    if (!query.trim()) { setTerminalSearchResults([]); return; }
    const q = query.toLowerCase();
    const results = allTerminals.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.district.toLowerCase().includes(q) ||
      t.region.toLowerCase().includes(q)
    );
    setTerminalSearchResults(results);
  };

  // Generate welcome message
  const getWelcomeMessage = () => {
    const name = sellerInfo.name || sellerInfo.email || 'Seller';
    return `Welcome back, ${name}!`;
  };

  // Generate subtitle with shop info
  const getSubtitle = () => {
    if (sellerInfo.shopName && sellerInfo.city) {
      return `${sellerInfo.shopName} � ${sellerInfo.city}`;
    } else if (sellerInfo.shopName) {
      return sellerInfo.shopName;
    } else if (sellerInfo.email) {
      return sellerInfo.email;
    }
    return 'Manage your shop';
  };

  // Check onboarding status based on seller data
  const checkOnboardingStatus = async () => {
    try {
      const saved = await AsyncStorage.getItem('currentSeller');
      if (!saved) return;
      const seller = JSON.parse(saved);
      const sellerId = seller.id || seller._id;

      // Check payment settings
      const hasPaymentSettings = seller.paymentMethods && seller.paymentMethods.length > 0;

      // Check delivery setup (zones or terminals)
      const hasDeliverySetup = (deliveryZones && deliveryZones.length > 0) || (sellerTerminals && sellerTerminals.length > 0);

      // Check if has at least one product
      const hasProducts = topProducts && topProducts.length > 0;

      // Check if has done bulk upload (check for products with bulk upload flag or history)
      const hasBulkUpload = topProducts && topProducts.some(p => p.bulkUploaded) || false;

      // Check if has at least one campaign
      const hasCampaign = campaigns && campaigns.length > 0;

      setOnboardingSteps({
        paymentSettings: hasPaymentSettings,
        deliverySetup: hasDeliverySetup,
        firstProduct: hasProducts,
        bulkUpload: hasBulkUpload,
        campaign: hasCampaign,
      });

      // Hide onboarding if all steps are complete
      const allComplete = hasPaymentSettings && hasDeliverySetup && hasProducts && hasBulkUpload && hasCampaign;
      if (allComplete) {
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  // Real stats derived from live data
  const stats = {
    totalProducts: totalProductCount,
    totalOrders: dashOrders.length,
    totalRevenue: dashOrders
      .filter(o => !['cancelled', 'refund_in_progress'].includes(o.status?.toLowerCase()))
      .reduce((s, o) => s + (o.subtotal || 0) + (o.deliveryFee || 0), 0),
    pendingOrders: dashOrders.filter(o => o.status?.toLowerCase() === 'pending').length,
  };

  const renderStatCard = (title, value, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderInfo}>
        <Text style={styles.orderCustomer}>{item.customer}</Text>
        <Text style={styles.orderProduct}>{item.product}</Text>
        <Text style={styles.orderAmount}>${item.amount}</Text>
      </View>
      <View style={[
        styles.orderStatus,
        { backgroundColor: getStatusColor(item.status) + '20' }
      ]}>
        <Text style={[styles.orderStatusText, { color: getStatusColor(item.status) }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  const renderProductItem = ({ item }) => {
    // Get the first valid image URL
    const imageUrl = item.images?.[0]?.url || 
                     item.images?.[0]?.uri || 
                     item.images?.[0]?.thumbnailUrl ||
                     item.imageUrl ||
                     item.image;
    
    // Get currency symbol
    const getCurrencySymbol = (currency) => {
      switch(currency?.toUpperCase()) {
        case 'UGX': return 'UGX ';
        case 'USD': return '$';
        case 'EUR': return 'EUR ';
        case 'GBP': return 'GBP ';
        default: return currency ? `${currency} ` : 'UGX ';
      }
    };
    
    const currencySymbol = getCurrencySymbol(item.currency);
    const stockStatus = item.stock > 0 ? 'In Stock' : 'Out of Stock';
    const stockColor = item.stock > 0 ? '#27ae60' : '#e74c3c';
    
    return (
      <TouchableOpacity 
        style={styles.productItem}
        onPress={() => navigation.navigate('AllProducts')}
        activeOpacity={0.7}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            {currencySymbol}{(item.salePrice || 0).toLocaleString()}
          </Text>
          <View style={styles.productMeta}>
            <Text style={[styles.productStock, { color: stockColor }]}>
              {stockStatus}: {item.stock || 0}
            </Text>
            <Text style={styles.productCategory}>
              {item.category}
            </Text>
          </View>
        </View>
        
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <View style={styles.productImageWrapper}>
              <Text style={styles.productImagePlaceholder}>??</Text>
            </View>
          ) : (
            <View style={styles.productImageWrapper}>
              <Text style={styles.productImagePlaceholder}>??</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('AllProducts')}
          >
            <Feather name="eye" size={16} color="#3498db" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Feather name="edit" size={16} color="#f39c12" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'completed': return '#27ae60';
      case 'shipped': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Onboarding Steps Banner */}
      {showOnboarding && (
        <View style={styles.onboardingBanner}>
          <View style={styles.onboardingHeader}>
            <View style={styles.onboardingTitleRow}>
              <Ionicons name="rocket-outline" size={24} color="#3498db" />
              <Text style={styles.onboardingTitle}>Complete Your Shop Setup</Text>
            </View>
            <TouchableOpacity onPress={() => setShowOnboarding(false)}>
              <Ionicons name="close-circle-outline" size={24} color="#999" />
            </TouchableOpacity>
          </View>
          <Text style={styles.onboardingSubtitle}>
            Follow these steps to get your shop ready for customers
          </Text>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${(Object.values(onboardingSteps).filter(Boolean).length / 5) * 100}%` 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Object.values(onboardingSteps).filter(Boolean).length} of 5 completed
            </Text>
          </View>

          {/* Steps */}
          <View style={styles.onboardingSteps}>
            {/* Step 1: Payment Settings */}
            <TouchableOpacity
              style={[
                styles.onboardingStep,
                onboardingSteps.paymentSettings && styles.onboardingStepComplete
              ]}
              onPress={() => navigation.navigate('SellerPaymentSettings')}
              disabled={onboardingSteps.paymentSettings}
            >
              <View style={styles.stepIconContainer}>
                {onboardingSteps.paymentSettings ? (
                  <Ionicons name="checkmark-circle" size={28} color="#27ae60" />
                ) : (
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Set Up Payment Methods</Text>
                <Text style={styles.stepDescription}>
                  Add your payment details to receive payments
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={onboardingSteps.paymentSettings ? "#27ae60" : "#3498db"} 
              />
            </TouchableOpacity>

            {/* Step 2: Delivery Setup */}
            <TouchableOpacity
              style={[
                styles.onboardingStep,
                onboardingSteps.deliverySetup && styles.onboardingStepComplete
              ]}
              onPress={() => setActiveTab('delivery')}
              disabled={onboardingSteps.deliverySetup}
            >
              <View style={styles.stepIconContainer}>
                {onboardingSteps.deliverySetup ? (
                  <Ionicons name="checkmark-circle" size={28} color="#27ae60" />
                ) : (
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Configure Delivery Options</Text>
                <Text style={styles.stepDescription}>
                  Add delivery zones or Link Bus terminals
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={onboardingSteps.deliverySetup ? "#27ae60" : "#3498db"} 
              />
            </TouchableOpacity>

            {/* Step 3: Create First Product */}
            <TouchableOpacity
              style={[
                styles.onboardingStep,
                onboardingSteps.firstProduct && styles.onboardingStepComplete
              ]}
              onPress={() => navigation.navigate('CreateProduct')}
              disabled={onboardingSteps.firstProduct}
            >
              <View style={styles.stepIconContainer}>
                {onboardingSteps.firstProduct ? (
                  <Ionicons name="checkmark-circle" size={28} color="#27ae60" />
                ) : (
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Create Your First Product</Text>
                <Text style={styles.stepDescription}>
                  Add a product to start selling
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={onboardingSteps.firstProduct ? "#27ae60" : "#3498db"} 
              />
            </TouchableOpacity>

            {/* Step 4: Bulk Upload */}
            <TouchableOpacity
              style={[
                styles.onboardingStep,
                onboardingSteps.bulkUpload && styles.onboardingStepComplete
              ]}
              onPress={() => navigation.navigate('BulkUpload')}
              disabled={onboardingSteps.bulkUpload}
            >
              <View style={styles.stepIconContainer}>
                {onboardingSteps.bulkUpload ? (
                  <Ionicons name="checkmark-circle" size={28} color="#27ae60" />
                ) : (
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Try Bulk Upload (Optional)</Text>
                <Text style={styles.stepDescription}>
                  Upload multiple products at once from Excel
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={onboardingSteps.bulkUpload ? "#27ae60" : "#3498db"} 
              />
            </TouchableOpacity>

            {/* Step 5: Create Campaign */}
            <TouchableOpacity
              style={[
                styles.onboardingStep,
                onboardingSteps.campaign && styles.onboardingStepComplete
              ]}
              onPress={() => navigation.navigate('SellerMarketing')}
              disabled={onboardingSteps.campaign}
            >
              <View style={styles.stepIconContainer}>
                {onboardingSteps.campaign ? (
                  <Ionicons name="checkmark-circle" size={28} color="#27ae60" />
                ) : (
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>5</Text>
                  </View>
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Launch Your First Campaign</Text>
                <Text style={styles.stepDescription}>
                  Create a discount or promotion to attract customers
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={onboardingSteps.campaign ? "#27ae60" : "#3498db"} 
              />
            </TouchableOpacity>
          </View>

          {/* Completion Message */}
          {Object.values(onboardingSteps).every(Boolean) && (
            <View style={styles.completionMessage}>
              <Ionicons name="trophy" size={32} color="#f39c12" />
              <Text style={styles.completionText}>
                🎉 Congratulations! Your shop is fully set up and ready to go!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {renderStatCard('Products', productsLoading ? '...' : stats.totalProducts.toString(), 'cube-outline', '#3498db')}
        {renderStatCard('Total Orders', dashOrdersLoading ? '...' : stats.totalOrders.toString(), 'receipt-outline', '#27ae60')}
        {renderStatCard('Revenue (UGX)', dashOrdersLoading ? '...' : stats.totalRevenue.toLocaleString(), 'cash-outline', '#f39c12')}
        {renderStatCard('Pending', dashOrdersLoading ? '...' : stats.pendingOrders.toString(), 'time-outline', '#e74c3c')}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SellerOrders')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {dashOrdersLoading ? (
          <ActivityIndicator size="small" color="#3498db" style={{ marginVertical: 16 }} />
        ) : dashOrders.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Ionicons name="receipt-outline" size={36} color="#ccc" />
            <Text style={{ color: "#aaa", marginTop: 8, fontSize: 13 }}>No orders yet</Text>
          </View>
        ) : (
          <>
            {dashOrders.slice(0, 3).map(order => {
              const SC = { pending:"#9b59b6", processing:"#f39c12", shipped:"#3498db", delivered:"#27ae60", cancelled:"#e74c3c", refund_in_progress:"#e67e22" };
              const SI = { pending:"hourglass-outline", processing:"time-outline", shipped:"car-outline", delivered:"checkmark-circle", cancelled:"close-circle", refund_in_progress:"refresh-circle-outline" };
              const color = SC[order.status?.toLowerCase()] || "#95a5a6";
              const icon  = SI[order.status?.toLowerCase()]  || "help-circle";
              const total = (order.subtotal || 0) + (order.deliveryFee || 0);
              const oid   = "#" + order._id.toString().slice(-6).toUpperCase();
              return (
                <TouchableOpacity key={order._id}
                  style={{ backgroundColor:"#f8f9fa", borderRadius:10, padding:12, marginBottom:8, flexDirection:"row", alignItems:"center", gap:10, borderLeftWidth:3, borderLeftColor:color }}
                  onPress={() => navigation.navigate("SellerOrders")}
                >
                  {order.items?.[0]?.image
                    ? <Image source={{ uri: order.items[0].image }} style={{ width:44, height:44, borderRadius:8 }} />
                    : <View style={{ width:44, height:44, borderRadius:8, backgroundColor:"#e0e0e0", justifyContent:"center", alignItems:"center" }}><Ionicons name="image-outline" size={18} color="#aaa" /></View>
                  }
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:13, fontWeight:"700", color:"#2c3e50" }}>{oid}  {order.buyerInfo?.name || order.customerInfo?.fullName || "Customer"}</Text>
                    <Text style={{ fontSize:11, color:"#888", marginTop:1 }} numberOfLines={1}>{(order.items||[]).map(i=>i.name).join(", ")}</Text>
                    <Text style={{ fontSize:12, fontWeight:"700", color:"#27ae60", marginTop:2 }}>UGX {total.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems:"flex-end", gap:3 }}>
                    <View style={{ flexDirection:"row", alignItems:"center", gap:3, backgroundColor:color+"20", borderRadius:6, paddingHorizontal:7, paddingVertical:3 }}>
                      <Ionicons name={icon} size={10} color={color} />
                      <Text style={{ fontSize:9, fontWeight:"700", color }}>{order.status?.toUpperCase()}</Text>
                    </View>
                    <Text style={{ fontSize:10, color:"#aaa" }}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={{ flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:10, borderRadius:8, borderWidth:1, borderColor:"#3498db40", marginTop:4 }}
              onPress={() => navigation.navigate("SellerOrders")}
            >
              <Text style={{ color:"#3498db", fontWeight:"600", fontSize:13 }}>View all {dashOrders.length} orders</Text>
              <Ionicons name="chevron-forward" size={14} color="#3498db" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#3498db" />
            <Text style={styles.quickActionText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AllProducts')}
          >
            <Ionicons name="cube-outline" size={24} color="#9b59b6" />
            <Text style={styles.quickActionText}>All Products</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('BulkUpload')}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#e74c3c" />
            <Text style={styles.quickActionText}>Bulk Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('BulkEdit')}
          >
            <Ionicons name="create-outline" size={24} color="#f39c12" />
            <Text style={styles.quickActionText}>Bulk Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="analytics-outline" size={24} color="#27ae60" />
            <Text style={styles.quickActionText}>View Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('SellerMarketing')}
          >
            <Ionicons name="megaphone-outline" size={24} color="#e74c3c" />
            <Text style={styles.quickActionText}>Marketing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('SellerDrafts')}
          >
            <Ionicons name="document-outline" size={24} color="#7f8c8d" />
            <Text style={styles.quickActionText}>Drafts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('SellerPaymentSettings')}
          >
            <Ionicons name="card-outline" size={24} color="#27ae60" />
            <Text style={styles.quickActionText}>Payment Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="settings-outline" size={24} color="#95a5a6" />
            <Text style={styles.quickActionText}>Shop Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bulk Operations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="layers-outline" size={20} color="#e74c3c" />
            <Text style={styles.sectionTitle}>Bulk Operations</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Manage multiple products at once</Text>
        </View>
        <View style={styles.bulkOperationsContainer}>
          <TouchableOpacity 
            style={styles.bulkOperationCard}
            onPress={() => navigation.navigate('BulkUpload')}
          >
            <View style={styles.bulkOperationIcon}>
              <Ionicons name="cloud-upload" size={28} color="#e74c3c" />
            </View>
            <View style={styles.bulkOperationContent}>
              <Text style={styles.bulkOperationTitle}>Bulk Upload</Text>
              <Text style={styles.bulkOperationDescription}>
                Upload multiple products from Excel or CSV files
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bulkOperationCard}
            onPress={() => navigation.navigate('BulkEdit')}
          >
            <View style={styles.bulkOperationIcon}>
              <Ionicons name="create" size={28} color="#f39c12" />
            </View>
            <View style={styles.bulkOperationContent}>
              <Text style={styles.bulkOperationTitle}>Bulk Edit</Text>
              <Text style={styles.bulkOperationDescription}>
                Edit prices, stock, and categories for multiple products
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bulkOperationCard}
            onPress={() => navigation.navigate('BulkUploadHistory')}
          >
            <View style={styles.bulkOperationIcon}>
              <Ionicons name="time" size={28} color="#9b59b6" />
            </View>
            <View style={styles.bulkOperationContent}>
              <Text style={styles.bulkOperationTitle}>Import History</Text>
              <Text style={styles.bulkOperationDescription}>
                View past uploads and download reports
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderProducts = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Products</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('AllProducts')}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, { borderColor: '#d5e8d4', backgroundColor: '#f0f7f0' }]}
            onPress={() => navigation.navigate('SellerDrafts')}
          >
            <Ionicons name="document-outline" size={16} color="#27ae60" />
            <Text style={[styles.bulkButtonText, { color: '#27ae60' }]}>Drafts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bulkButton, styles.bulkUploadButton]}
            onPress={() => navigation.navigate('BulkUpload')}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#e74c3c" />
            <Text style={[styles.bulkButtonText, { color: '#e74c3c' }]}>Bulk Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bulkButton, styles.bulkEditButton]}
            onPress={() => navigation.navigate('BulkEdit')}
          >
            <Ionicons name="create-outline" size={16} color="#f39c12" />
            <Text style={[styles.bulkButtonText, { color: '#f39c12' }]}>Bulk Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {productsLoading ? (
        <View style={styles.loadingContainer}>
          <Animated.View style={[
            styles.loadingIndicator,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1]
              })
            }
          ]}>
            <Text style={styles.loadingText}>Loading your products...</Text>
          </Animated.View>
          {/* Loading skeleton */}
          {[1, 2, 3].map((item) => (
            <Animated.View 
              key={item}
              style={[
                styles.productItemSkeleton,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1]
                  })
                }
              ]}
            >
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineSmall} />
              </View>
              <View style={styles.skeletonImage} />
            </Animated.View>
          ))}
        </View>
      ) : topProducts.length > 0 ? (
        <>
          <View style={styles.productsHeader}>
            <Text style={styles.productsSubtitle}>
              Showing your top {topProducts.length} products
            </Text>
            <Text style={styles.productsHint}>
              Tap any product to view all products
            </Text>
          </View>
          <FlatList
            data={topProducts}
            renderItem={renderProductItem}
            keyExtractor={item => item._id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
          />
        </>
      ) : (
        <View style={styles.emptyProductsContainer}>
          <View style={styles.emptyProductsIcon}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
          </View>
          <Text style={styles.emptyProductsTitle}>No Products Yet</Text>
          <Text style={styles.emptyProductsText}>
            Start building your shop by adding your first product
          </Text>
          <TouchableOpacity 
            style={styles.createFirstProductButton}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.createFirstProductText}>Create Your First Product</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderOrders = () => {
    const counts = dashOrders.reduce((acc, o) => {
      const s = o.status?.toLowerCase() || 'pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const revenue = dashOrders
      .filter(o => !['cancelled','refund_in_progress'].includes(o.status?.toLowerCase()))
      .reduce((s, o) => s + (o.subtotal || 0) + (o.deliveryFee || 0), 0);

    const STATUS_CHIPS = [
      { key: 'pending',            label: 'Pending',    color: '#9b59b6', icon: 'hourglass-outline'      },
      { key: 'processing',         label: 'Processing', color: '#f39c12', icon: 'time-outline'           },
      { key: 'shipped',            label: 'Shipped',    color: '#3498db', icon: 'car-outline'            },
      { key: 'delivered',          label: 'Delivered',  color: '#27ae60', icon: 'checkmark-circle'       },
      { key: 'refund_in_progress', label: 'Refunds',    color: '#e67e22', icon: 'refresh-circle-outline' },
    ];

    const orderMeta = (status) => ({
      pending:            { color: '#9b59b6', icon: 'hourglass-outline'      },
      processing:         { color: '#f39c12', icon: 'time-outline'           },
      shipped:            { color: '#3498db', icon: 'car-outline'            },
      delivered:          { color: '#27ae60', icon: 'checkmark-circle'       },
      cancelled:          { color: '#e74c3c', icon: 'close-circle'           },
      refund_in_progress: { color: '#e67e22', icon: 'refresh-circle-outline' },
    }[status?.toLowerCase()] || { color: '#95a5a6', icon: 'help-circle' });

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={styles.sectionTitle}>Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SellerOrders')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {dashOrdersLoading ? (
          <ActivityIndicator size="small" color="#3498db" style={{ marginVertical: 30 }} />
        ) : (
          <>
            {/* Revenue + total chip */}
            <TouchableOpacity
              style={{ backgroundColor: '#f0faf4', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#27ae6030', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => navigation.navigate('SellerOrders')}
            >
              <View>
                <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Total Revenue</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#27ae60' }}>UGX {revenue.toLocaleString()}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{dashOrders.length} order{dashOrders.length !== 1 ? 's' : ''} total</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="receipt-outline" size={36} color="#27ae60" />
                <Text style={{ fontSize: 11, color: '#27ae60', fontWeight: '600', marginTop: 4 }}>Manage ?</Text>
              </View>
            </TouchableOpacity>

            {/* Status chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {STATUS_CHIPS.map(chip => (
                <TouchableOpacity
                  key={chip.key}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: chip.color + '15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: chip.color + '40' }}
                  onPress={() => navigation.navigate('SellerOrders')}
                >
                  <Ionicons name={chip.icon} size={14} color={chip.color} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: chip.color }}>{counts[chip.key] || 0}</Text>
                  <Text style={{ fontSize: 12, color: chip.color }}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent 3 orders */}
            {dashOrders.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="receipt-outline" size={48} color="#ccc" />
                <Text style={{ color: '#aaa', marginTop: 10, fontSize: 14 }}>No orders yet</Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 10 }}>Recent Orders</Text>
                {dashOrders.slice(0, 3).map(order => {
                  const meta = orderMeta(order.status);
                  const total = (order.subtotal || 0) + (order.deliveryFee || 0);
                  const orderId = `#${order._id.toString().slice(-6).toUpperCase()}`;
                  return (
                    <TouchableOpacity
                      key={order._id}
                      style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, borderLeftWidth: 3, borderLeftColor: meta.color }}
                      onPress={() => navigation.navigate('SellerOrders')}
                    >
                      {order.items?.[0]?.image
                        ? <Image source={{ uri: order.items[0].image }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                        : <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}><Ionicons name="image-outline" size={20} color="#ccc" /></View>
                      }
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50' }}>{orderId} � {order.buyerInfo?.name || order.customerInfo?.fullName || 'Customer'}</Text>
                        <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }} numberOfLines={1}>
                          {(order.items || []).map(i => i.name).join(', ')}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#27ae60', marginTop: 3 }}>UGX {total.toLocaleString()}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: meta.color + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Ionicons name={meta.icon} size={11} color={meta.color} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: meta.color }}>{order.status?.toUpperCase()}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#aaa' }}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={{ backgroundColor: '#3498db', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 }}
                  onPress={() => navigation.navigate('SellerOrders')}
                >
                  <Ionicons name="receipt-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Open Full Orders Dashboard</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderDelivery = () => {
    const activeZones = deliveryZones.filter(z => z.active);

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>

        {/* Saving indicator */}
        {deliverySaving && (
          <View style={styles.savingBanner}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {renderStatCard('Active Zones', activeZones.length.toString(), 'map-outline', '#3498db')}
          {renderStatCard('Terminals', sellerTerminals.length.toString(), 'location-outline', '#27ae60')}
          {renderStatCard('Default Fee', 'UGX 15,000', 'cash-outline', '#f39c12')}
          {renderStatCard('Processing', `${deliverySettings?.processingDays || 1} day(s)`, 'time-outline', '#9b59b6')}
        </View>

        {/* -- Delivery Zones -- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="map-outline" size={20} color="#3498db" />
              <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Delivery Zones</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowZoneModal(true)}>
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.addButtonText}>Add Zone</Text>
            </TouchableOpacity>
          </View>

          {deliveryLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color="#3498db" />
          ) : deliveryZones.length === 0 ? (
            <View style={styles.emptyDelivery}>
              <Ionicons name="map-outline" size={40} color="#ccc" />
              <Text style={styles.emptyDeliveryText}>No delivery zones yet. Add one to get started.</Text>
            </View>
          ) : (
            deliveryZones.map((zone, idx) => {
              const zoneId = zone._id?.toString() || zone.id || idx.toString();
              return (
                <View key={zoneId} style={styles.deliveryCard}>
                  <View style={[styles.deliveryStatusDot, { backgroundColor: zone.active ? '#27ae60' : '#ccc' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deliveryCardTitle}>{zone.name}</Text>
                    <Text style={styles.deliveryCardSub}>
                      UGX {(zone.fee || 15000).toLocaleString()} � {zone.estimatedDays || '2-3'} days
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleButton, { backgroundColor: zone.active ? '#e8f5e9' : '#f5f5f5' }]}
                    onPress={() => toggleZoneActive(zoneId)}
                  >
                    <Text style={[styles.toggleButtonText, { color: zone.active ? '#27ae60' : '#999' }]}>
                      {zone.active ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeZone(zoneId)}>
                    <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* -- Link Bus Terminals -- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="bus-outline" size={20} color="#e74c3c" />
              <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Link Bus Terminals</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#e74c3c' }]}
              onPress={() => { setShowTerminalModal(true); setTerminalSearch(''); setTerminalSearchResults([]); }}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.addButtonText}>Add Terminal</Text>
            </TouchableOpacity>
          </View>

          {deliveryLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color="#e74c3c" />
          ) : sellerTerminals.length === 0 ? (
            <View style={styles.emptyDelivery}>
              <Ionicons name="bus-outline" size={40} color="#ccc" />
              <Text style={styles.emptyDeliveryText}>No terminals added. Add Link Bus stations where you deliver.</Text>
            </View>
          ) : (
            sellerTerminals.map((terminal, idx) => {
              const t = terminal._id ? terminal : terminal;
              const tId = t._id?.toString() || idx.toString();
              return (
                <View key={tId} style={styles.deliveryCard}>
                  <View style={[styles.deliveryStatusDot, { backgroundColor: '#27ae60' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deliveryCardTitle}>{t.name || 'Terminal'}</Text>
                    <Text style={styles.deliveryCardSub}>{t.city}{t.district ? `, ${t.district}` : ''}</Text>
                    {t.address ? <Text style={styles.deliveryCardContact}>{t.address}</Text> : null}
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeTerminal(tId)}>
                    <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* -- Delivery Settings -- */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="settings-outline" size={20} color="#666" />
            <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Delivery Settings</Text>
          </View>
          <View style={{ marginTop: 15, gap: 12 }}>
            <View style={styles.deliverySettingRow}>
              <Ionicons name="cash-outline" size={20} color="#27ae60" />
              <Text style={styles.deliverySettingText}>Default delivery fee</Text>
              <Text style={styles.deliverySettingValue}>UGX 15,000</Text>
            </View>
            <View style={styles.deliverySettingRow}>
              <Ionicons name="gift-outline" size={20} color="#3498db" />
              <Text style={styles.deliverySettingText}>Free delivery threshold</Text>
              <Text style={styles.deliverySettingValue}>
                {deliverySettings?.freeDeliveryThreshold
                  ? `UGX ${deliverySettings.freeDeliveryThreshold.toLocaleString()}`
                  : 'Not set'}
              </Text>
            </View>
            <View style={styles.deliverySettingRow}>
              <Ionicons name="time-outline" size={20} color="#f39c12" />
              <Text style={styles.deliverySettingText}>Processing time</Text>
              <Text style={styles.deliverySettingValue}>{deliverySettings?.processingDays || 1} day(s)</Text>
            </View>
          </View>
        </View>

        {/* -- Add Zone Modal -- */}
        <Modal visible={showZoneModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Add Delivery Zone</Text>

              <Text style={styles.modalLabel}>Zone / Area Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Kampala Central, Wakiso..."
                value={newZone.name}
                onChangeText={v => setNewZone(p => ({ ...p, name: v }))}
              />

              {/* Select from Map button */}
              <TouchableOpacity
                style={styles.mapPickerBtn}
                onPress={() => { setShowZoneModal(false); setShowMapPicker(true); }}
              >
                <Ionicons name="map" size={18} color="#3498db" />
                <Text style={styles.mapPickerBtnText}>Or select location from map</Text>
                <Ionicons name="chevron-forward" size={16} color="#3498db" />
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Delivery Fee (UGX)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="15000"
                keyboardType="numeric"
                value={newZone.fee}
                onChangeText={v => setNewZone(p => ({ ...p, fee: v }))}
              />

              <Text style={styles.modalLabel}>Estimated Days</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1-2, 2-3"
                value={newZone.estimatedDays}
                onChangeText={v => setNewZone(p => ({ ...p, estimatedDays: v }))}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#f5f5f5' }]}
                  onPress={() => setShowZoneModal(false)}
                >
                  <Text style={{ color: '#666' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#3498db' }]} onPress={addZone}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>Add Zone</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* -- Map Zone Picker (full screen) -- */}
        <Modal visible={showMapPicker} animationType="slide">
          <MapZonePicker
            onSelect={(data) => {
              setNewZone(p => ({ ...p, name: data.name }));
              setShowMapPicker(false);
              setShowZoneModal(true);
            }}
            onClose={() => { setShowMapPicker(false); setShowZoneModal(true); }}
          />
        </Modal>

        {/* -- Add Terminal Modal -- */}
        <Modal visible={showTerminalModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Add Link Bus Terminal</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Filter by city, district or name..."
                value={terminalSearch}
                onChangeText={searchTerminals}
              />
              <ScrollView style={{ maxHeight: 320, marginTop: 10 }}>
                {(terminalSearch.trim() === '' ? allTerminals : terminalSearchResults).length === 0 ? (
                  <Text style={styles.emptyDeliveryText}>
                    {allTerminals.length === 0 ? 'Loading terminals...' : 'No terminals match your search'}
                  </Text>
                ) : (
                  (terminalSearch.trim() === '' ? allTerminals : terminalSearchResults).map(t => {
                    const alreadyAdded = sellerTerminals.some(st => (st._id || st) === t._id);
                    return (
                      <TouchableOpacity
                        key={t._id}
                        style={[styles.terminalRow, alreadyAdded && { opacity: 0.4 }]}
                        onPress={() => !alreadyAdded && addTerminal(t)}
                        disabled={alreadyAdded}
                      >
                        <Ionicons name="bus-outline" size={18} color="#e74c3c" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.terminalRowName}>{t.name}</Text>
                          <Text style={styles.terminalRowSub}>{t.city}, {t.district} � {t.region}</Text>
                        </View>
                        {alreadyAdded
                          ? <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                          : <Ionicons name="add-circle-outline" size={20} color="#3498db" />
                        }
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#f5f5f5', marginTop: 12 }]}
                onPress={() => { setShowTerminalModal(false); setTerminalSearch(''); }}
              >
                <Text style={{ color: '#666', textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    );
  };

  const renderSettings = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Settings</Text>
      
      <View style={styles.settingsSection}>
        <Text style={styles.settingsGroupTitle}>Shop Settings</Text>
        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={() => navigation.navigate('ShopSettings')}
        >
          <Ionicons name="storefront-outline" size={20} color="#666" />
          <Text style={styles.settingsItemText}>Shop Information</Text>
          <Feather name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => navigation.navigate('SellerPaymentSettings')}
        >
          <Ionicons name="card-outline" size={20} color="#666" />
          <Text style={styles.settingsItemText}>Payment Methods</Text>
          <Feather name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsGroupTitle}>Account</Text>
        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={() => navigation.navigate('ProfileSettings')}
        >
          <Ionicons name="person-outline" size={20} color="#666" />
          <Text style={styles.settingsItemText}>Profile Settings</Text>
          <Feather name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#666" />
          <Text style={styles.settingsItemText}>Change Password</Text>
          <Feather name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingsItem}
          onPress={() => navigation.navigate('SellerSettings')}
        >
          <Ionicons name="settings-outline" size={20} color="#666" />
          <Text style={styles.settingsItemText}>All Settings</Text>
          <Feather name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={async () => {
          try {
            await AsyncStorage.removeItem('currentSeller');
            navigation.navigate('SellerLogin');
          } catch (error) {
            console.error('Logout error:', error);
          }
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('home')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <TouchableOpacity 
              style={styles.titleRefreshContainer}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              <Animated.View style={[
                styles.titleWrapper,
                {
                  transform: [
                    { scale: pulseAnim },
                    { 
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }
                  ]
                }
              ]}>
                <Text style={styles.headerTitle}>Seller Dashboard</Text>
                <Animated.View style={[
                  styles.refreshIcon,
                  {
                    opacity: refreshing ? 1 : 0.6,
                    transform: [{
                      rotate: refreshing ? rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      }) : '0deg'
                    }]
                  }
                ]}>
                  <Ionicons 
                    name="refresh" 
                    size={18} 
                    color={refreshing ? "#3498db" : "#666"} 
                  />
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>
            
            {refreshing && (
              <Animated.View style={[
                styles.refreshingIndicator,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1]
                  })
                }
              ]}>
                <Text style={styles.refreshingText}>Refreshing...</Text>
              </Animated.View>
            )}
          </View>
          
          <View style={styles.welcomeContainer}>
            <Animated.View style={[
              styles.typewriterContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }]
              }
            ]}>
              <Text style={styles.headerSubtitle}>
                {typewriterText}
                <Animated.View style={[
                  styles.cursor,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1]
                    })
                  }
                ]}>
                  <Text style={styles.cursorText}>|</Text>
                </Animated.View>
              </Text>
            </Animated.View>
            
            {subtitleText && getSubtitle() !== getWelcomeMessage() && (
              <Animated.View style={[
                styles.shopInfoContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}>
                <Ionicons name="storefront" size={14} color="#888" />
                <Text style={styles.headerInfo}>{subtitleText}</Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          {!showOnboarding && Object.values(onboardingSteps).some(step => !step) && (
            <TouchableOpacity 
              style={styles.showOnboardingButton}
              onPress={() => setShowOnboarding(true)}
            >
              <Ionicons name="rocket-outline" size={18} color="#3498db" />
              <Text style={styles.showOnboardingText}>Setup Guide</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.bulkUploadHeaderButton}
            onPress={() => navigation.navigate('BulkUpload')}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#e74c3c" />
            <Text style={styles.bulkUploadHeaderText}>Bulk Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.notificationButton}>
          <Animated.View style={[
            styles.notificationIconContainer,
            {
              transform: [{ scale: pulseAnim }]
            }
          ]}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <Animated.View style={[
              styles.notificationBadge,
              {
                transform: [{ scale: scaleAnim }]
              }
            ]}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View style={[
        styles.tabBar,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        {[
          { key: 'overview',   label: 'Overview',   icon: 'home-outline'      },
          { key: 'products',   label: 'Products',   icon: 'cube-outline'      },
          { key: 'orders',     label: 'Orders',     icon: 'receipt-outline'   },
          { key: 'delivery',   label: 'Delivery',   icon: 'bicycle-outline'   },
          { key: 'marketing',  label: 'Marketing',  icon: 'megaphone-outline' },
          { key: 'settings',   label: 'Settings',   icon: 'settings-outline'  }
        ].map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTabItem]}
            onPress={() => {
              setActiveTab(tab.key);
              // Add subtle animation when switching tabs
              Animated.sequence([
                Animated.timing(scaleAnim, {
                  toValue: 0.95,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                  toValue: 1,
                  duration: 200,
                  easing: Easing.out(Easing.elastic(1)),
                  useNativeDriver: true,
                }),
              ]).start();
            }}
          >
            <Animated.View style={[
              styles.tabIconContainer,
              {
                transform: [{ scale: activeTab === tab.key ? 1.1 : 1 }]
              }
            ]}>
              <Ionicons
                name={tab.icon}
                size={20}
                color={activeTab === tab.key ? '#3498db' : '#666'}
              />
            </Animated.View>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && (
              <Animated.View style={[
                styles.activeTabIndicator,
                {
                  opacity: fadeAnim,
                  transform: [{ scaleX: scaleAnim }]
                }
              ]} />
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Tab Content */}
      <Animated.View style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'delivery' && renderDelivery()}
        {activeTab === 'marketing' && (
          <MarketingTab 
            navigation={navigation} 
            onCampaignsLoaded={(loadedCampaigns) => setCampaigns(loadedCampaigns)}
          />
        )}
        {activeTab === 'settings' && renderSettings()}
      </Animated.View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    maxWidth: width > 1400 ? 1400 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: width > 768 ? 60 : 50,
    paddingHorizontal: width > 1200 ? 40 : width > 768 ? 30 : 20,
    paddingBottom: width > 768 ? 25 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width > 768 ? 3 : 2 },
    shadowOpacity: 0.1,
    shadowRadius: width > 768 ? 6 : 4,
    elevation: width > 768 ? 4 : 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: width > 768 ? 12 : 8,
    borderRadius: width > 768 ? 8 : 6,
    backgroundColor: '#f8f9fa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
    marginLeft: width > 768 ? 20 : 15,
  },
  titleContainer: {
    position: 'relative',
  },
  titleRefreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: width > 1200 ? 32 : width > 768 ? 28 : 24,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.5,
  },
  refreshIcon: {
    marginLeft: 12,
    padding: 4,
  },
  refreshingIndicator: {
    position: 'absolute',
    top: -8,
    right: 0,
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  refreshingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  welcomeContainer: {
    marginTop: width > 768 ? 8 : 6,
  },
  typewriterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: width > 1200 ? 18 : width > 768 ? 16 : 14,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  cursor: {
    marginLeft: 2,
  },
  cursorText: {
    fontSize: width > 1200 ? 18 : width > 768 ? 16 : 14,
    color: '#3498db',
    fontWeight: 'bold',
  },
  shopInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: width > 768 ? 4 : 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  headerInfo: {
    fontSize: width > 1200 ? 14 : width > 768 ? 12 : 11,
    color: '#888',
    fontStyle: 'italic',
    marginLeft: 6,
    fontWeight: '500',
  },
  showOnboardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3498db40',
  },
  showOnboardingText: {
    color: '#3498db',
    fontSize: 13,
    fontWeight: '600',
  },
  bulkUploadHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e74c3c40',
  },
  bulkUploadHeaderText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationButton: {
    position: 'relative',
    padding: width > 768 ? 12 : 8,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: width > 768 ? -8 : -5,
    right: width > 768 ? -8 : -5,
    backgroundColor: '#e74c3c',
    borderRadius: width > 768 ? 12 : 10,
    width: width > 768 ? 24 : 20,
    height: width > 768 ? 24 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: width > 768 ? 12 : 10,
    fontWeight: 'bold',
  },

  // Tab Bar - Ultra Responsive with Animations
  tabBar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingHorizontal: width > 768 ? 20 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: width > 768 ? 18 : 15,
    paddingHorizontal: width > 768 ? 15 : 10,
    minHeight: width > 768 ? 70 : 60,
    justifyContent: 'center',
    position: 'relative',
  },
  tabIconContainer: {
    padding: 4,
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: width > 768 ? 12 : 10,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#3498db',
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: width > 1200 ? 16 : width > 768 ? 14 : 12,
    color: '#666',
    marginTop: width > 768 ? 6 : 4,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#3498db',
    fontWeight: '600',
  },

  // Content - Ultra Responsive
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: width > 1200 ? 30 : width > 768 ? 25 : 20,
  },

  // Stats - Ultra Responsive Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: width > 768 ? 20 : 15,
    marginBottom: width > 768 ? 30 : 25,
    justifyContent: width > 1200 ? 'flex-start' : 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: width > 768 ? 16 : 12,
    padding: width > 1200 ? 25 : width > 768 ? 22 : 20,
    width: width > 1200 ? (width - 120) / 4 - 15 : width > 768 ? (width - 90) / 2 - 10 : (width - 55) / 2,
    minWidth: width > 768 ? 200 : 150,
    borderLeftWidth: width > 768 ? 5 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width > 768 ? 3 : 2 },
    shadowOpacity: 0.1,
    shadowRadius: width > 768 ? 6 : 4,
    elevation: width > 768 ? 4 : 3,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTitle: {
    fontSize: width > 1200 ? 16 : width > 768 ? 14 : 12,
    color: '#666',
    marginBottom: width > 768 ? 8 : 5,
    lineHeight: width > 768 ? 20 : 16,
  },
  statValue: {
    fontSize: width > 1200 ? 28 : width > 768 ? 24 : 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statIcon: {
    width: width > 1200 ? 50 : width > 768 ? 45 : 40,
    height: width > 1200 ? 50 : width > 768 ? 45 : 40,
    borderRadius: width > 1200 ? 25 : width > 768 ? 22.5 : 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections - Ultra Responsive
  section: {
    backgroundColor: 'white',
    borderRadius: width > 768 ? 16 : 12,
    padding: width > 1200 ? 25 : width > 768 ? 22 : 20,
    marginBottom: width > 768 ? 25 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width > 768 ? 3 : 2 },
    shadowOpacity: 0.1,
    shadowRadius: width > 768 ? 6 : 4,
    elevation: width > 768 ? 4 : 3,
  },
  sectionHeader: {
    flexDirection: width > 480 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: width > 480 ? 'center' : 'flex-start',
    marginBottom: width > 768 ? 20 : 15,
    gap: width > 480 ? 0 : 10,
  },
  sectionTitle: {
    fontSize: width > 1200 ? 24 : width > 768 ? 22 : 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    color: '#3498db',
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: width > 768 ? 20 : 15,
    paddingVertical: width > 768 ? 12 : 8,
    borderRadius: width > 768 ? 8 : 6,
    gap: width > 768 ? 8 : 5,
    minHeight: width > 768 ? 44 : 36,
  },
  addButtonText: {
    color: 'white',
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: width > 768 ? 10 : 8,
  },
  viewAllButton: {
    paddingHorizontal: width > 768 ? 16 : 12,
    paddingVertical: width > 768 ? 10 : 8,
    borderRadius: width > 768 ? 8 : 6,
    borderWidth: 1,
    borderColor: '#3498db',
    backgroundColor: 'transparent',
  },
  viewAllText: {
    color: '#3498db',
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    fontWeight: '500',
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width > 768 ? 12 : 10,
    paddingVertical: width > 768 ? 8 : 6,
    borderRadius: width > 768 ? 6 : 5,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    backgroundColor: '#f8f9fa',
    gap: 4,
  },
  bulkButtonText: {
    fontSize: width > 1200 ? 12 : width > 768 ? 11 : 10,
    fontWeight: '500',
  },
  bulkUploadButton: {
    borderColor: '#ffcdd2',
    backgroundColor: '#ffebee',
  },
  bulkEditButton: {
    borderColor: '#ffe0b2',
    backgroundColor: '#fff3e0',
  },

  // Orders - Ultra Responsive
  orderItem: {
    flexDirection: width > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: width > 768 ? 'center' : 'flex-start',
    paddingVertical: width > 768 ? 18 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: width > 768 ? 0 : 10,
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: width > 768 ? 4 : 2,
  },
  orderProduct: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    marginBottom: width > 768 ? 4 : 2,
    lineHeight: width > 768 ? 20 : 18,
  },
  orderAmount: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  orderStatus: {
    paddingHorizontal: width > 768 ? 16 : 12,
    paddingVertical: width > 768 ? 8 : 6,
    borderRadius: width > 768 ? 20 : 15,
    minWidth: width > 768 ? 80 : 70,
    alignItems: 'center',
  },
  orderStatusText: {
    fontSize: width > 768 ? 12 : 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Products - Ultra Responsive
  productItem: {
    flexDirection: width > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: width > 768 ? 'center' : 'flex-start',
    paddingVertical: width > 768 ? 18 : 15,
    paddingHorizontal: width > 768 ? 15 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: width > 768 ? 0 : 12,
    backgroundColor: 'white',
    borderRadius: width > 768 ? 8 : 6,
    marginBottom: width > 768 ? 8 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: width > 768 ? 6 : 4,
  },
  productPrice: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: width > 768 ? 6 : 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  productStock: {
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    fontWeight: '500',
  },
  productCategory: {
    fontSize: width > 1200 ? 12 : width > 768 ? 11 : 10,
    color: '#666',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productImageContainer: {
    marginHorizontal: width > 768 ? 15 : 0,
  },
  productImageWrapper: {
    width: width > 768 ? 50 : 40,
    height: width > 768 ? 50 : 40,
    borderRadius: width > 768 ? 8 : 6,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  productImagePlaceholder: {
    fontSize: width > 768 ? 20 : 16,
  },
  productActions: {
    flexDirection: 'row',
    gap: width > 768 ? 15 : 10,
  },
  actionButton: {
    padding: width > 768 ? 12 : 8,
    borderRadius: width > 768 ? 8 : 6,
    backgroundColor: '#f8f9fa',
    minWidth: width > 768 ? 44 : 36,
    minHeight: width > 768 ? 44 : 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  
  // Products Header
  productsHeader: {
    marginBottom: width > 768 ? 20 : 15,
    paddingHorizontal: width > 768 ? 5 : 0,
  },
  productsSubtitle: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  productsHint: {
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    color: '#999',
    fontStyle: 'italic',
  },
  productsList: {
    paddingBottom: 20,
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  loadingIndicator: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: width > 768 ? 16 : 14,
    color: '#666',
    fontStyle: 'italic',
  },
  productItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#e1e8ed',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonLineShort: {
    height: 14,
    backgroundColor: '#e1e8ed',
    borderRadius: 4,
    marginBottom: 6,
    width: '60%',
  },
  skeletonLineSmall: {
    height: 12,
    backgroundColor: '#e1e8ed',
    borderRadius: 4,
    width: '40%',
  },
  skeletonImage: {
    width: 50,
    height: 50,
    backgroundColor: '#e1e8ed',
    borderRadius: 8,
    marginLeft: 15,
  },
  
  // Empty State
  emptyProductsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: width > 768 ? 60 : 40,
    paddingHorizontal: 20,
  },
  emptyProductsIcon: {
    marginBottom: width > 768 ? 20 : 15,
  },
  emptyProductsTitle: {
    fontSize: width > 1200 ? 24 : width > 768 ? 22 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: width > 768 ? 12 : 8,
    textAlign: 'center',
  },
  emptyProductsText: {
    fontSize: width > 1200 ? 16 : width > 768 ? 15 : 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: width > 768 ? 24 : 20,
    marginBottom: width > 768 ? 30 : 20,
    maxWidth: 300,
  },
  createFirstProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: width > 768 ? 24 : 20,
    paddingVertical: width > 768 ? 15 : 12,
    borderRadius: width > 768 ? 12 : 8,
    gap: width > 768 ? 10 : 8,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createFirstProductText: {
    color: 'white',
    fontSize: width > 1200 ? 18 : width > 768 ? 16 : 14,
    fontWeight: '600',
  },

  // Quick Actions - Ultra Responsive
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: width > 768 ? 15 : 10,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: width > 1200 ? 20 : width > 768 ? 16 : 12,
    backgroundColor: '#f8f9fa',
    borderRadius: width > 768 ? 16 : 12,
    width: width > 768 ? '30%' : '48%',
    minHeight: width > 768 ? 100 : 80,
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: width > 1200 ? 14 : width > 768 ? 13 : 12,
    color: '#333',
    marginTop: width > 768 ? 10 : 8,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: width > 768 ? 18 : 16,
  },

  // Bulk Operations Styles
  bulkOperationsContainer: {
    gap: 12,
  },
  bulkOperationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bulkOperationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  bulkOperationContent: {
    flex: 1,
  },
  bulkOperationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bulkOperationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 30,
  },

  // Delivery Styles
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  savingText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyDelivery: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyDeliveryText: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 8,
    marginLeft: 6,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 480,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    gap: 8,
    backgroundColor: '#f0f8ff',
  },
  mapPickerBtnText: {
    flex: 1,
    color: '#3498db',
    fontSize: 13,
    fontWeight: '500',
  },
  terminalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  terminalRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  terminalRowSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  deliveryStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deliveryCardTitle: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  deliveryCardSub: {
    fontSize: width > 768 ? 13 : 12,
    color: '#666',
  },
  deliveryCardContact: {
    fontSize: width > 768 ? 12 : 11,
    color: '#3498db',
    marginTop: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deliverySettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  deliverySettingText: {
    flex: 1,
    fontSize: width > 768 ? 15 : 14,
    color: '#333',
  },
  deliverySettingValue: {
    fontSize: width > 768 ? 14 : 13,
    color: '#666',
    marginRight: 4,
  },

  // Settings - Ultra Responsive
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: width > 768 ? 16 : 12,
    marginBottom: width > 768 ? 25 : 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width > 768 ? 3 : 2 },
    shadowOpacity: 0.1,
    shadowRadius: width > 768 ? 6 : 4,
    elevation: width > 768 ? 4 : 3,
  },
  settingsGroupTitle: {
    fontSize: width > 1200 ? 20 : width > 768 ? 18 : 16,
    fontWeight: 'bold',
    color: '#333',
    padding: width > 1200 ? 25 : width > 768 ? 22 : 20,
    paddingBottom: width > 768 ? 15 : 10,
    backgroundColor: '#f8f9fa',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width > 1200 ? 25 : width > 768 ? 22 : 20,
    paddingVertical: width > 768 ? 18 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: width > 768 ? 60 : 50,
  },
  settingsItemText: {
    flex: 1,
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    color: '#333',
    marginLeft: width > 768 ? 18 : 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: width > 768 ? 16 : 12,
    paddingVertical: width > 768 ? 18 : 15,
    marginTop: width > 768 ? 25 : 20,
    gap: width > 768 ? 12 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width > 768 ? 3 : 2 },
    shadowOpacity: 0.1,
    shadowRadius: width > 768 ? 6 : 4,
    elevation: width > 768 ? 4 : 3,
    minHeight: width > 768 ? 54 : 48,
  },
  logoutText: {
    fontSize: width > 1200 ? 18 : width > 768 ? 17 : 16,
    color: '#e74c3c',
    fontWeight: '500',
  },

  // Onboarding Banner Styles
  onboardingBanner: {
    backgroundColor: 'white',
    borderRadius: width > 768 ? 16 : 12,
    padding: width > 768 ? 24 : 20,
    marginBottom: width > 768 ? 25 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#3498db20',
  },
  onboardingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  onboardingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  onboardingTitle: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  onboardingSubtitle: {
    fontSize: width > 768 ? 14 : 13,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    textAlign: 'right',
  },
  onboardingSteps: {
    gap: 12,
  },
  onboardingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: width > 768 ? 16 : 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498db40',
    gap: 12,
  },
  onboardingStepComplete: {
    backgroundColor: '#e8f5e9',
    borderColor: '#27ae6040',
    opacity: 0.7,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: width > 768 ? 16 : 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: width > 768 ? 13 : 12,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  completionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  completionText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default SellerDashboard;

