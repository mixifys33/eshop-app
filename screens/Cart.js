import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, StatusBar, Alert, TextInput, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import API_BASE from '../constants/api';
const API = API_BASE;

// Normalize sellerId whether it's a string or populated object
const getSellerId = (sid) => {
  if (!sid) return null;
  if (typeof sid === 'string') return sid;
  if (typeof sid === 'object') return sid._id || sid.id || null;
  return null;
};
const getShopName = (sid) => {
  if (!sid) return 'Shop';
  if (typeof sid === 'object') return sid.shop?.shopName || sid.email || 'Shop';
  return 'Shop';
};

const Cart = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);

  // { sellerId: { zones, terminals, shopName, hasOptions } }
  const [deliveryOptions, setDeliveryOptions] = useState({});
  // { sellerId: { type, name, fee, estimatedDays, ... } }
  const [selectedDelivery, setSelectedDelivery] = useState({});
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [activeDeliverySeller, setActiveDeliverySeller] = useState(null);
  // User's saved preference from settings
  const [userPreference, setUserPreference] = useState(null);

  useEffect(() => { loadCart(); loadUserPreference(); }, []);

  // Fetch delivery options whenever cart changes
  useEffect(() => {
    if (!cartItems.length) return;
    const ids = [...new Set(cartItems.map(i => getSellerId(i.sellerId)).filter(Boolean))];
    console.log('Cart seller IDs:', ids);

    // If no sellerId on cart items, still load all terminals as fallback
    if (!ids.length) {
      fetch(`${API}/delivery/terminals`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.terminals) {
            const fallback = {
              zones: [],
              terminals: data.terminals.map(t => ({
                id: t._id, name: t.name, city: t.city, district: t.district,
                region: t.region, address: t.address, phone: t.phone,
                fee: 15000, estimatedDays: '2-5', type: 'terminal',
              })),
              hasOptions: true,
              shopName: 'Shop',
            };
            setDeliveryOptions({ unknown: fallback });
          }
        })
        .catch(() => {});
      return;
    }

    ids.forEach(async (sid) => {
      if (deliveryOptions[sid]) return;
      try {
        const res = await fetch(`${API}/delivery/options/${sid}`);
        if (res.ok) {
          const data = await res.json();
          setDeliveryOptions(prev => ({ ...prev, [sid]: data }));
        } else {
          setDeliveryOptions(prev => ({ ...prev, [sid]: { zones: [], terminals: [], hasOptions: false, shopName: '' } }));
        }
      } catch (e) {
        setDeliveryOptions(prev => ({ ...prev, [sid]: { zones: [], terminals: [], hasOptions: false, shopName: '' } }));
      }
    });
  }, [cartItems]);

  // Once delivery options load, pre-select using user's saved preference
  useEffect(() => {
    if (!userPreference || !Object.keys(deliveryOptions).length) return;
    const updates = {};
    Object.keys(deliveryOptions).forEach(sid => {
      if (selectedDelivery[sid]) return; // already chosen
      const opts = deliveryOptions[sid];
      if (!opts?.hasOptions) return;

      if (userPreference.type === 'terminal') {
        // Try to match saved terminal against this seller's terminals
        const match = opts.terminals.find(t =>
          t.id?.toString() === userPreference.terminalId ||
          t.name === userPreference.terminalName
        );
        if (match) {
          updates[sid] = {
            type: 'terminal',
            id: match.id?.toString(),
            name: match.name,
            fee: match.fee ?? 15000,
            estimatedDays: match.estimatedDays || '2-5',
            city: match.city,
          };
        }
      } else if (userPreference.type === 'address') {
        // Try to match against seller's zones
        const match = opts.zones.find(z =>
          z.name?.toLowerCase().includes(userPreference.customCity?.toLowerCase()) ||
          userPreference.customAddress?.toLowerCase().includes(z.name?.toLowerCase())
        );
        if (match) {
          updates[sid] = {
            type: 'zone',
            id: match.id?.toString(),
            name: match.name,
            fee: match.fee ?? 15000,
            estimatedDays: match.estimatedDays || '2-3',
          };
        }
      }
    });
    if (Object.keys(updates).length) {
      setSelectedDelivery(prev => ({ ...prev, ...updates }));
    }
  }, [deliveryOptions, userPreference]);

  const loadUserPreference = async () => {
    try {
      const raw = await AsyncStorage.getItem('userDeliverySettings');
      if (raw) setUserPreference(JSON.parse(raw));
    } catch (_) {}
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('cart');
      if (raw) setCartItems(JSON.parse(raw));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveCart = async (updated) => {
    setCartItems(updated);
    await AsyncStorage.setItem('cart', JSON.stringify(updated));
  };

  const updateQuantity = (id, qty) => {
    if (qty <= 0) { removeItem(id); return; }
    saveCart(cartItems.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeItem = (id) => {
    saveCart(cartItems.filter(i => i.id !== id));
  };

  const clearCart = async () => {
    setCartItems([]);
    setDiscount(0);
    setPromoCode('');
    setSelectedDelivery({});
    await AsyncStorage.removeItem('cart');
  };

  const moveToWishlist = async (product) => {
    const raw = await AsyncStorage.getItem('wishlist');
    const wishlist = raw ? JSON.parse(raw) : [];
    if (!wishlist.find(i => i.id === product.id)) {
      wishlist.push(product);
      await AsyncStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
    saveCart(cartItems.filter(i => i.id !== product.id));
    Alert.alert('Moved to Wishlist', `${product.name} moved to your wishlist`);
  };

  const applyPromoCode = () => {
    const codes = { 'SAVE10': 10, 'WELCOME20': 20, 'STUDENT15': 15, 'FIRST25': 25 };
    const pct = codes[promoCode.toUpperCase()];
    if (pct) { setDiscount(pct); Alert.alert('Promo Applied!', `${pct}% discount applied`); }
    else Alert.alert('Invalid Code', 'Please enter a valid promo code');
  };

  const totalDeliveryFee = Object.values(selectedDelivery).reduce((s, d) => s + (d?.fee || 0), 0);

  const totals = () => {
    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const discountAmt = (subtotal * discount) / 100;
    const total = subtotal - discountAmt + totalDeliveryFee;
    return { subtotal, discountAmt, total };
  };

  // Group items by seller
  const itemsBySeller = cartItems.reduce((acc, item) => {
    const sid = getSellerId(item.sellerId) || 'unknown';
    if (!acc[sid]) acc[sid] = { items: [], shopName: getShopName(item.sellerId) };
    acc[sid].items.push(item);
    return acc;
  }, {});

  const proceedToCheckout = () => {
    if (!cartItems.length) { Alert.alert('Empty Cart', 'Add items before checkout'); return; }
    const sellersWithOptions = Object.keys(deliveryOptions).filter(sid => deliveryOptions[sid]?.hasOptions);
    const missing = sellersWithOptions.filter(sid => !selectedDelivery[sid]);
    if (missing.length) {
      Alert.alert('Select Delivery', 'Please choose a delivery option for all items before checkout.');
      return;
    }
    const { subtotal, discountAmt, total } = totals();
    navigation.navigate('Checkout', {
      cartItems,
      selectedDelivery,
      deliveryOptions,
      subtotal,
      discountAmt,
      discount,
      totalDeliveryFee,
      total: Math.round(total),
    });
  };

  // ── Delivery Picker Modal ──────────────────────────────────
  const DeliveryModal = () => {
    const opts = activeDeliverySeller ? deliveryOptions[activeDeliverySeller] : null;
    if (!opts) return null;
    const current = selectedDelivery[activeDeliverySeller];

    const selectOption = (option) => {
      setSelectedDelivery(prev => ({ ...prev, [activeDeliverySeller]: option }));
      setShowDeliveryModal(false);
    };

    return (
      <Modal visible={showDeliveryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Delivery Option</Text>
              <Text style={styles.modalShop}>{opts.shopName}</Text>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>

              {/* ── Seller Delivery Zones (Home Delivery) ── */}
              {opts.zones.length > 0 && (
                <View>
                  <View style={styles.optGroupHeader}>
                    <Ionicons name="home-outline" size={14} color="#3498db" />
                    <Text style={styles.optGroupLabel}>Home Delivery Zones</Text>
                  </View>
                  <Text style={styles.optGroupDesc}>Seller delivers directly to these areas</Text>
                  {opts.zones.map((z, i) => {
                    const isSelected = current?.id === z.id?.toString() && current?.type === 'zone';
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.optRow, isSelected && styles.optRowSelected]}
                        onPress={() => selectOption({ id: z.id?.toString(), type: 'zone', name: z.name, fee: z.fee ?? 15000, estimatedDays: z.estimatedDays || '2-3' })}
                      >
                        <View style={[styles.optRadio, isSelected && styles.optRadioSelected]}>
                          {isSelected && <View style={styles.optRadioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optName}>{z.name}</Text>
                          <Text style={styles.optSub}>{z.estimatedDays || '2-3'} days</Text>
                        </View>
                        <Text style={styles.optFee}>UGX {(z.fee ?? 15000).toLocaleString()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ── Link Bus Terminals ── */}
              {opts.terminals.length > 0 && (
                <View style={{ marginTop: opts.zones.length > 0 ? 12 : 0 }}>
                  <View style={styles.optGroupHeader}>
                    <Ionicons name="bus-outline" size={14} color="#e74c3c" />
                    <Text style={[styles.optGroupLabel, { color: '#e74c3c' }]}>Link Bus Pickup Terminals</Text>
                  </View>
                  <Text style={styles.optGroupDesc}>Collect your package at a Link Bus station</Text>
                  {opts.terminals.map((t, i) => {
                    const isSelected = current?.id === t.id?.toString() && current?.type === 'terminal';
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.optRow, isSelected && styles.optRowSelected]}
                        onPress={() => selectOption({ id: t.id?.toString(), type: 'terminal', name: t.name, fee: t.fee ?? 15000, estimatedDays: t.estimatedDays || '2-5', city: t.city })}
                      >
                        <View style={[styles.optRadio, isSelected && styles.optRadioSelected]}>
                          {isSelected && <View style={styles.optRadioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optName}>{t.name}</Text>
                          <Text style={styles.optSub}>{t.city}{t.district ? `, ${t.district}` : ''} • {t.estimatedDays || '2-5'} days</Text>
                        </View>
                        <Text style={styles.optFee}>UGX {(t.fee ?? 15000).toLocaleString()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {!opts.zones.length && !opts.terminals.length && (
                <View style={styles.noOptsWrap}>
                  <Ionicons name="alert-circle-outline" size={32} color="#ccc" />
                  <Text style={styles.noOptsText}>This seller hasn't set up delivery options yet.</Text>
                </View>
              )}

              {/* Hint to set preference */}
              <TouchableOpacity
                style={styles.prefHint}
                onPress={() => { setShowDeliveryModal(false); navigation.navigate('UserDeliverySettings'); }}
              >
                <Ionicons name="settings-outline" size={14} color="#667eea" />
                <Text style={styles.prefHintText}>Set a default delivery preference in your profile</Text>
                <Ionicons name="chevron-forward" size={13} color="#667eea" />
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.modalClose} onPress={() => setShowDeliveryModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

// ── Cart Item ──────────────────────────────────────────────
const CartItem = ({ item, onRemove, onUpdateQuantity, onMoveToWishlist, onNavigate }) => {
  const itemTotal = item.price * item.quantity;
  const imageUri = Array.isArray(item.images)
    ? (item.images[0]?.url || item.images[0]?.uri || item.image)
    : item.image;
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => onNavigate('ProductDetails', { product: item })}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
          : <View style={[styles.cardImage, styles.imagePlaceholder]}><Ionicons name="image-outline" size={32} color="#ccc" /></View>
        }
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.removeBtn}>
            <Ionicons name="close" size={18} color="#aaa" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardMeta}>{[item.category, item.brand].filter(Boolean).join(' · ')}</Text>
        {/* Campaign badge on cart item */}
        {item.hasCampaign && item.campaign && (
          <View style={[styles.cartCampaignBadge, { backgroundColor: item.campaign.bannerColor || '#e74c3c' }]}>
            <Ionicons name="pricetag" size={10} color="#fff" />
            <Text style={styles.cartCampaignText}>{item.campaign.title}</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>UGX {item.price?.toLocaleString()}</Text>
          {item.originalPrice > item.price && (
            <Text style={styles.originalPrice}>UGX {item.originalPrice?.toLocaleString()}</Text>
          )}
        </View>
        <View style={styles.stockRow}>
          <View style={[styles.stockDot, { backgroundColor: item.stock > 0 ? '#27ae60' : '#e74c3c' }]} />
          <Text style={[styles.stockText, { color: item.stock > 0 ? '#27ae60' : '#e74c3c' }]}>
            {item.stock > item.quantity ? 'In Stock' : item.stock > 0 ? `Only ${item.stock} left` : 'Out of Stock'}
          </Text>
        </View>
        <View style={styles.cardBottomRow}>
          <View style={styles.qtyPill}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}>
              <Ionicons name="remove" size={16} color="#2c3e50" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}>
              <Ionicons name="add" size={16} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          <Text style={styles.itemTotal}>UGX {itemTotal.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.wishlistLink} onPress={() => onMoveToWishlist(item)}>
          <Ionicons name="heart-outline" size={13} color="#9b59b6" />
          <Text style={styles.wishlistLinkText}>Move to Wishlist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmptyCart = ({ onShop }) => (
  <View style={styles.emptyWrap}>
    <Ionicons name="cart-outline" size={90} color="#ddd" />
    <Text style={styles.emptyTitle}>Your cart is empty</Text>
    <Text style={styles.emptySub}>Browse products and add them here</Text>
    <TouchableOpacity style={styles.shopBtn} onPress={onShop}>
      <Ionicons name="storefront-outline" size={18} color="white" />
      <Text style={styles.shopBtnText}>Start Shopping</Text>
    </TouchableOpacity>
  </View>
);

  if (loading) return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder, paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Shopping Cart</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
      <View style={styles.loadingWrap}><ActivityIndicator size="large" color={theme.primary} /></View>
    </View>
  );

  const { subtotal, discountAmt, total } = totals();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent"
        translucent={true}
      />
      <DeliveryModal />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder, paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Shopping Cart</Text>
            <Text style={styles.headerSub}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={() => navigation.navigate('UserOrders')} style={styles.clearBtn}>
              <Ionicons name="receipt-outline" size={22} color="#3498db" />
              <Text style={{ fontSize: 10, color: '#3498db', fontWeight: '600', marginTop: 1 }}>Orders</Text>
            </TouchableOpacity>
            {cartItems.length > 0
              ? confirmClear
                ? <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity onPress={() => setConfirmClear(false)} style={[styles.clearBtn, { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 8 }]}>
                      <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setConfirmClear(false); clearCart(); }} style={[styles.clearBtn, { backgroundColor: '#fdecea', borderRadius: 8, paddingHorizontal: 8 }]}>
                      <Text style={{ fontSize: 12, color: '#e74c3c', fontWeight: '700' }}>Yes, Clear</Text>
                    </TouchableOpacity>
                  </View>
                : <TouchableOpacity onPress={() => setConfirmClear(true)} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={22} color="#e74c3c" />
                  </TouchableOpacity>
              : null}
          </View>
        </View>
      </View>

      {cartItems.length === 0 ? <EmptyCart onShop={() => navigation.navigate('home')} /> : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={[styles.scrollContent, {
            paddingBottom: insets.bottom + 20,
          }]}
          bounces={true}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === 'android'}
        >

          {/* Cart Items */}
          {cartItems.map(item => (
            <CartItem
              key={item.id}
              item={item}
              onRemove={removeItem}
              onUpdateQuantity={updateQuantity}
              onMoveToWishlist={moveToWishlist}
              onNavigate={navigation.navigate}
            />
          ))}

          {/* ── Delivery per Seller ── */}
          {Object.keys(itemsBySeller).map(sid => {
            const opts = deliveryOptions[sid];
            const chosen = selectedDelivery[sid];
            const shopName = sid === 'unknown' ? 'Your Order' : itemsBySeller[sid].shopName;

            // Show loading spinner while fetching
            if (!opts) return (
              <View key={sid} style={styles.section}>
                <View style={styles.deliveryHeader}>
                  <Ionicons name="bicycle-outline" size={18} color="#27ae60" />
                  <Text style={styles.sectionTitle}>Delivery — {shopName}</Text>
                </View>
                <ActivityIndicator size="small" color="#3498db" style={{ marginVertical: 10 }} />
              </View>
            );

            // No delivery options set by seller
            if (!opts.hasOptions) return (
              <View key={sid} style={styles.section}>
                <View style={styles.deliveryHeader}>
                  <Ionicons name="bicycle-outline" size={18} color="#aaa" />
                  <Text style={[styles.sectionTitle, { color: '#aaa' }]}>Delivery — {shopName}</Text>
                </View>
                <Text style={styles.noDeliveryText}>This seller hasn't set up delivery options yet. Contact them directly.</Text>
              </View>
            );

            return (
              <View key={sid} style={styles.section}>
                <View style={styles.deliveryHeader}>
                  <Ionicons name="bicycle-outline" size={18} color="#27ae60" />
                  <Text style={styles.sectionTitle}>Delivery — {shopName}</Text>
                </View>

                {/* Show what's available as a summary */}
                <View style={styles.deliveryAvailRow}>
                  {opts.zones.length > 0 && (
                    <View style={styles.deliveryAvailBadge}>
                      <Ionicons name="home-outline" size={12} color="#3498db" />
                      <Text style={styles.deliveryAvailText}>{opts.zones.length} zone{opts.zones.length > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                  {opts.terminals.length > 0 && (
                    <View style={[styles.deliveryAvailBadge, { backgroundColor: '#fff0f0' }]}>
                      <Ionicons name="bus-outline" size={12} color="#e74c3c" />
                      <Text style={[styles.deliveryAvailText, { color: '#e74c3c' }]}>{opts.terminals.length} terminal{opts.terminals.length > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                </View>

                {/* Pre-selected from user preference banner */}
                {chosen && userPreference && !selectedDelivery[sid + '_manual'] && (
                  <View style={styles.preSelectedBanner}>
                    <Ionicons name="checkmark-circle" size={14} color="#667eea" />
                    <Text style={styles.preSelectedText}>Pre-selected from your delivery preference</Text>
                  </View>
                )}

                {chosen ? (
                  <TouchableOpacity
                    style={styles.chosenDelivery}
                    onPress={() => { setActiveDeliverySeller(sid); setShowDeliveryModal(true); }}
                  >
                    <Ionicons
                      name={chosen.type === 'terminal' ? 'bus-outline' : 'home-outline'}
                      size={18}
                      color={chosen.type === 'terminal' ? '#e74c3c' : '#3498db'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.chosenName}>{chosen.name}</Text>
                      <Text style={styles.chosenSub}>
                        {chosen.type === 'terminal' ? 'Link Bus Pickup' : 'Home Delivery'} • {chosen.estimatedDays} days
                      </Text>
                    </View>
                    <Text style={styles.chosenFee}>UGX {(chosen.fee ?? 15000).toLocaleString()}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.selectDeliveryBtn}
                    onPress={() => { setActiveDeliverySeller(sid); setShowDeliveryModal(true); }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#3498db" />
                    <Text style={styles.selectDeliveryText}>Select delivery option</Text>
                    <Ionicons name="chevron-forward" size={16} color="#3498db" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Promo Code */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Promo Code</Text>
            <View style={styles.promoRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                placeholderTextColor="#aaa"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.applyBtn} onPress={applyPromoCode}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
                <Text style={styles.discountBadgeText}>{discount}% discount applied</Text>
              </View>
            )}
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>UGX {subtotal.toLocaleString()}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#27ae60' }]}>Discount ({discount}%)</Text>
                <Text style={[styles.summaryValue, { color: '#27ae60' }]}>-UGX {Math.round(discountAmt).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={[styles.summaryValue, !totalDeliveryFee && { color: '#aaa' }]}>
                {totalDeliveryFee ? `UGX ${totalDeliveryFee.toLocaleString()}` : 'Not selected'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>UGX {Math.round(total).toLocaleString()}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.checkoutBtn} onPress={proceedToCheckout}>
            <Ionicons name="card-outline" size={20} color="white" />
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  headerSub: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 1 },
  clearBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6 },
  cardImage: { width: 110, height: 130 },
  imagePlaceholder: { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1a1a1a', lineHeight: 20 },
  removeBtn: { padding: 2, marginLeft: 6 },
  cardMeta: { fontSize: 11, color: '#aaa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  price: { fontSize: 15, fontWeight: '700', color: '#27ae60' },
  originalPrice: { fontSize: 12, color: '#bbb', textDecorationLine: 'line-through' },
  cartCampaignBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 5,
  },
  cartCampaignText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontSize: 11, fontWeight: '600' },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f8', borderRadius: 20, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: '#e8e8e8' },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 10 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: '#3498db' },
  wishlistLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  wishlistLinkText: { fontSize: 11, color: '#9b59b6', fontWeight: '600' },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },

  deliveryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  deliveryAvailRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  deliveryAvailBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8f4fd', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  deliveryAvailText: { fontSize: 11, color: '#3498db', fontWeight: '600' },
  preSelectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f0ff', borderRadius: 8, padding: 8, marginBottom: 8 },
  preSelectedText: { fontSize: 11, color: '#667eea', fontWeight: '500' },
  noDeliveryText: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  selectDeliveryBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#3498db', borderStyle: 'dashed', borderRadius: 10, padding: 12 },
  selectDeliveryText: { flex: 1, color: '#3498db', fontWeight: '600', fontSize: 14 },
  chosenDelivery: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0faf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#27ae60' },
  chosenName: { fontSize: 14, fontWeight: '600', color: '#333' },
  chosenSub: { fontSize: 12, color: '#888', marginTop: 2 },
  chosenFee: { fontSize: 14, fontWeight: '700', color: '#27ae60' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, paddingBottom: 10, maxHeight: '85%' },
  modalHeader: { marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  modalShop: { fontSize: 13, color: '#888', marginTop: 2 },
  optGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optGroupLabel: { fontSize: 12, fontWeight: '700', color: '#3498db', textTransform: 'uppercase', letterSpacing: 0.5 },
  optGroupDesc: { fontSize: 11, color: '#aaa', marginBottom: 4, marginTop: 2 },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f8f8f8', gap: 12 },
  optRowSelected: { backgroundColor: '#f0faf4', borderRadius: 8, paddingHorizontal: 8 },
  optRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  optRadioSelected: { borderColor: '#27ae60' },
  optRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#27ae60' },
  optName: { fontSize: 14, fontWeight: '600', color: '#333' },
  optSub: { fontSize: 12, color: '#888', marginTop: 2 },
  optFee: { fontSize: 14, fontWeight: '700', color: '#27ae60' },
  noOptsWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noOptsText: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  prefHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f0ff', borderRadius: 8, padding: 10, marginTop: 12 },
  prefHintText: { flex: 1, fontSize: 12, color: '#667eea' },
  modalClose: { marginTop: 12, marginBottom: 8, backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalCloseText: { fontSize: 15, color: '#666', fontWeight: '600' },

  promoRow: { flexDirection: 'row', gap: 10 },
  promoInput: { flex: 1, borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1a1a1a', backgroundColor: '#fafafa' },
  applyBtn: { backgroundColor: '#3498db', paddingHorizontal: 18, borderRadius: 10, justifyContent: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  discountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#f0faf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  discountBadgeText: { fontSize: 12, color: '#27ae60', fontWeight: '600' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#777' },
  summaryValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  totalLabel: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  totalValue: { fontSize: 17, fontWeight: '800', color: '#3498db' },

  checkoutBtn: { backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, marginBottom: 4, gap: 10, elevation: 3, shadowColor: '#27ae60', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#2c3e50', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  shopBtn: { backgroundColor: '#3498db', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25, gap: 8 },
  shopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default Cart;

