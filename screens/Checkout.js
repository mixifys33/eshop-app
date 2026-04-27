import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import API from '../config';

const getSellerId = (sid) => {
  if (!sid) return null;
  if (typeof sid === 'string') return sid;
  if (typeof sid === 'object') return sid._id || sid.id || null;
  return null;
};

export default function Checkout({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    cartItems = [],
    selectedDelivery = {},
    deliveryOptions = {},
    subtotal = 0,
    discountAmt = 0,
    discount = 0,
    totalDeliveryFee = 0,
    total = 0,
  } = route.params || {};

  const [placing, setPlacing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  // Coupon code
  const [couponCode, setCouponCode]         = useState('');
  const [couponLoading, setCouponLoading]   = useState(false);
  const [appliedCoupon, setAppliedCoupon]   = useState(null); // { discountType, discountValue, title }
  const [couponError, setCouponError]       = useState('');

  // { sellerId: { mtnNumber, mtnName, airtelNumber, airtelName, bankName, bankAccountName, bankAccountNumber, preferredMethod } }
  const [sellerPayments, setSellerPayments] = useState({});
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState({});

  // Group cart items by seller
  const itemsBySeller = cartItems.reduce((acc, item) => {
    const sid = getSellerId(item.sellerId) || 'unknown';
    if (!acc[sid]) acc[sid] = { items: [], shopName: item.shopName || 'Shop' };
    acc[sid].items.push(item);
    return acc;
  }, {});

  useEffect(() => {
    loadUser();
    fetchAllSellerPayments();
  }, []);

  const loadUser = async () => {
    try {
      // Try currentUser first, fall back to userData (older sessions)
      let raw = await AsyncStorage.getItem('currentUser');
      if (!raw) raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const u = JSON.parse(raw);
        const uid = u.id || u._id;
        setUserId(uid);
        setFullName(u.name || u.fullName || '');
        setPhone(u.phone || u.phoneNumber || '');
        // Backfill currentUser so future reads work
        if (!await AsyncStorage.getItem('currentUser')) {
          await AsyncStorage.setItem('currentUser', raw);
        }
      }
    } catch (_) {}
  };

  const fetchAllSellerPayments = async () => {
    setPaymentLoading(true);

    // First try to get payment from the cart items themselves (already synced from seller)
    const fromCart = {};
    cartItems.forEach(item => {
      const sid = getSellerId(item.sellerId);
      if (!sid) return;
      if (!fromCart[sid] && item.paymentMethods) {
        const p = item.paymentMethods;
        if (p.mtnNumber || p.airtelNumber || p.bankAccountNumber) {
          fromCart[sid] = p;
        }
      }
    });

    // For any seller not found in cart items, fetch from API
    const sellerIds = [...new Set(
      cartItems.map(i => getSellerId(i.sellerId)).filter(Boolean)
    )];

    const results = { ...fromCart };

    await Promise.all(sellerIds.map(async (sid) => {
      if (results[sid]) return; // already got it from cart item
      try {
        const res = await fetch(`${API}/sellers/payment/${sid}`);
        const data = await res.json();
        console.log(`API payment for ${sid}:`, JSON.stringify(data.payment));
        results[sid] = data.payment || {};
      } catch (e) {
        console.log(`Failed to fetch payment for ${sid}:`, e.message);
        results[sid] = {};
      }
    }));

    console.log('Final payment data:', JSON.stringify(results));
    setSellerPayments(results);

    // Auto-select preferred method
    const defaults = {};
    Object.keys(results).forEach(sid => {
      const p = results[sid];
      if (!p) return;
      if (p.preferredMethod && p.preferredMethod !== 'all') defaults[sid] = p.preferredMethod;
      else if (p.mtnNumber) defaults[sid] = 'mtn';
      else if (p.airtelNumber) defaults[sid] = 'airtel';
      else if (p.bankAccountNumber) defaults[sid] = 'bank';
    });
    setSelectedPayment(defaults);
    setPaymentLoading(false);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);
    try {
      // Find the seller IDs from cart items
      const sellerIds = [...new Set(cartItems.map(i => getSellerId(i.sellerId)).filter(Boolean))];
      // Try each seller's campaigns for this coupon
      let found = null;
      for (const sid of sellerIds) {
        const res  = await fetch(`${API}/campaigns/seller/${sid}`);
        const data = await res.json();
        if (data.success) {
          const match = data.campaigns.find(c =>
            c.couponCode === couponCode.trim().toUpperCase() && c.status === 'active'
          );
          if (match) { found = match; break; }
        }
      }
      if (!found) {
        setCouponError('Invalid or expired coupon code');
      } else {
        setAppliedCoupon({
          id:            found._id,
          title:         found.title,
          discountType:  found.discountType,
          discountValue: found.discountValue,
          minOrderAmount: found.minOrderAmount || 0,
        });
      }
    } catch (e) {
      setCouponError('Could not validate coupon. Try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  // Compute coupon discount on top of existing subtotal
  const getCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.minOrderAmount > subtotal) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.round(subtotal * appliedCoupon.discountValue / 100);
    }
    return Math.min(appliedCoupon.discountValue, subtotal);
  };

  const couponDiscount = getCouponDiscount();
  const finalTotal = Math.max(0, total - couponDiscount);

  const validate = () => {
    if (!fullName.trim()) { Alert.alert('Missing Info', 'Please enter your full name.'); return false; }
    if (!phone.trim()) { Alert.alert('Missing Info', 'Please enter your phone number.'); return false; }
    const needsAddress = Object.values(selectedDelivery).some(d => d?.type === 'zone');
    if (needsAddress && !address.trim()) { Alert.alert('Missing Info', 'Please enter your delivery address.'); return false; }
    if (needsAddress && !city.trim()) { Alert.alert('Missing Info', 'Please enter your city.'); return false; }
    for (const sid of Object.keys(itemsBySeller)) {
      if (sid === 'unknown') continue;
      const p = sellerPayments[sid] || {};
      const hasOptions = p.mtnNumber || p.airtelNumber || p.bankAccountNumber;
      if (hasOptions && !selectedPayment[sid]) {
        Alert.alert('Select Payment', 'Please select a payment method for all sellers.');
        return false;
      }
    }
    return true;
  };

  // Check if ALL selected payments across sellers are COD
  const allCOD = () => {
    const sids = Object.keys(itemsBySeller).filter(s => s !== 'unknown');
    return sids.length > 0 && sids.every(sid => selectedPayment[sid] === 'cod');
  };

  const handleProceed = () => {
    if (!validate()) return;

    const sellerIds = Object.keys(itemsBySeller);

    // Build order payload for each seller
    const orderPayload = sellerIds.map(sid => {
      const { items } = itemsBySeller[sid];
      const delivery = selectedDelivery[sid] || {};
      return {
        userId,
        sellerId: sid === 'unknown' ? null : sid,
        items: items.map(i => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: Array.isArray(i.images) ? (i.images[0]?.url || i.images[0]?.uri || i.image) : i.image,
        })),
        delivery: { type: delivery.type || 'terminal', name: delivery.name || '', fee: delivery.fee || 0, estimatedDays: delivery.estimatedDays || '' },
        paymentMethod: selectedPayment[sid] || 'cod',
        subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
        deliveryFee: delivery.fee || 0,
        customerInfo: { fullName, phone, address, city, notes },
      };
    });

    if (allCOD()) {
      // Place order directly — no payment screen needed
      placeOrdersDirect(orderPayload, sellerIds.length);
    } else {
      // Navigate to payment screen with only non-COD sellers
      navigation.navigate('PaymentScreen', {
        orderPayload,
        sellerPayments,
        selectedPayment,
        total: finalTotal,
      });
    }
  };

  const placeOrdersDirect = async (orderPayload, count) => {
    setPlacing(true);
    try {
      // Enrich each order with buyerInfo from stored user
      let buyerInfo = {};
      try {
        const raw = await AsyncStorage.getItem('currentUser');
        if (raw) {
          const u = JSON.parse(raw);
          buyerInfo = {
            userId: u.id || u._id,
            name: u.name || u.fullName || '',
            email: u.email || '',
            phone: u.phone || u.phoneNumber || '',
          };
        }
      } catch (_) {}

      const results = await Promise.all(orderPayload.map(async (body) => {
        try {
          const finalBody = { ...body, buyerInfo, paymentStatus: 'pending' };
          const res = await fetch(`${API}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody),
          });
          const data = await res.json();
          console.log('COD order response:', res.status, JSON.stringify(data));
          if (!res.ok) {
            console.error('Order creation failed:', data);
          }
          return res.ok;
        } catch (fetchErr) {
          console.error('Order fetch error:', fetchErr.message);
          return false;
        }
      }));

      console.log('COD order results:', results);
      await AsyncStorage.removeItem('cart');

      if (results.every(Boolean)) {
        // ── Fire local notification confirming order placement ──
        try {
          const { sendLocalNotification } = require('../services/pushNotificationService');
          await sendLocalNotification(
            '🎉 Order Placed!',
            `Your order worth UGX ${total.toLocaleString()} has been placed successfully.`,
            { type: 'new_order', screen: 'UserOrders' },
            'orders'
          );
        } catch (_) {}
        navigation.replace('OrderSuccess', { total, orderCount: count });
      } else {
        Alert.alert('Order Error', 'Some orders could not be placed. Please try again or contact support.', [
          { text: 'View Orders', onPress: () => navigation.replace('UserOrders') },
          { text: 'OK' },
        ]);
      }
    } catch (e) {
      console.error('placeOrdersDirect error:', e);
      Alert.alert('Error', 'Could not place order: ' + e.message);
    } finally {
      setPlacing(false);
    }
  };

  const PaymentSelector = ({ sid }) => {
    if (sid === 'unknown') return null;

    if (paymentLoading) {
      return (
        <View style={styles.paymentLoading}>
          <ActivityIndicator size="small" color="#9b59b6" />
          <Text style={styles.paymentLoadingText}>Loading payment options...</Text>
        </View>
      );
    }

    const p = sellerPayments[sid] || {};

    // Cash on delivery: only available if ALL items for this seller have it enabled
    const sellerItems = itemsBySeller[sid]?.items || [];
    const codAvailable = sellerItems.length > 0 && sellerItems.every(i => i.cashOnDelivery === 'Yes');

    const options = [
      p.mtnNumber    && { key: 'mtn',    label: 'MTN MoMo',      detail: p.mtnNumber,    name: p.mtnName,         color: '#f39c12', icon: 'phone-portrait-outline' },
      p.airtelNumber && { key: 'airtel', label: 'Airtel Money',   detail: p.airtelNumber, name: p.airtelName,      color: '#e74c3c', icon: 'phone-portrait-outline' },
      p.bankAccountNumber && { key: 'bank', label: 'Bank Transfer', detail: `${p.bankName || ''} • ${p.bankAccountNumber}`, name: p.bankAccountName, color: '#3498db', icon: 'business-outline' },
    ].filter(Boolean);

    if (!options.length && !codAvailable) {
      return <Text style={styles.noPaymentText}>Seller hasn't set up payment methods yet. Contact them directly.</Text>;
    }

    return (
      <View style={styles.paymentOptions}>
        {options.map(opt => {
          const isSelected = selectedPayment[sid] === opt.key;
          const isPreferred = p.preferredMethod === opt.key || p.preferredMethod === 'all';
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.paymentOption, isSelected && { borderColor: opt.color, backgroundColor: opt.color + '12' }]}
              onPress={() => setSelectedPayment(prev => ({ ...prev, [sid]: opt.key }))}
            >
              <View style={[styles.radio, isSelected && { borderColor: opt.color }]}>
                {isSelected && <View style={[styles.radioDot, { backgroundColor: opt.color }]} />}
              </View>
              <Ionicons name={opt.icon} size={18} color={isSelected ? opt.color : '#bbb'} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.optLabel, isSelected && { color: opt.color }]}>{opt.label}</Text>
                  {isPreferred && <View style={styles.preferredBadge}><Text style={styles.preferredBadgeText}>Preferred</Text></View>}
                </View>
                {opt.name ? <Text style={styles.optSub}>{opt.name}</Text> : null}
                <Text style={styles.optSub}>{opt.detail}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Cash on Delivery option */}
        {codAvailable ? (
          <TouchableOpacity
            style={[styles.paymentOption, selectedPayment[sid] === 'cod' && { borderColor: '#27ae60', backgroundColor: '#27ae6012' }]}
            onPress={() => setSelectedPayment(prev => ({ ...prev, [sid]: 'cod' }))}
          >
            <View style={[styles.radio, selectedPayment[sid] === 'cod' && { borderColor: '#27ae60' }]}>
              {selectedPayment[sid] === 'cod' && <View style={[styles.radioDot, { backgroundColor: '#27ae60' }]} />}
            </View>
            <Ionicons name="cash-outline" size={18} color={selectedPayment[sid] === 'cod' ? '#27ae60' : '#bbb'} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.optLabel, selectedPayment[sid] === 'cod' && { color: '#27ae60' }]}>Pay on Delivery</Text>
                <View style={styles.codAvailBadge}><Text style={styles.codAvailText}>Available</Text></View>
              </View>
              <Text style={styles.optSub}>Pay cash when your order arrives</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.codUnavailRow}>
            <Ionicons name="cash-outline" size={18} color="#ccc" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.codUnavailLabel}>Pay on Delivery</Text>
                <View style={styles.codUnavailBadge}><Text style={styles.codUnavailBadgeText}>Unavailable</Text></View>
              </View>
              <Text style={styles.optSub}>Not available for one or more items in this order</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scroll, {
          paddingBottom: insets.bottom + 20,
        }]} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
      >

        {/* Delivery Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color="#3498db" />
            <Text style={styles.sectionTitle}>Delivery Information</Text>
          </View>
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput style={styles.input} placeholder="Your full name" value={fullName} onChangeText={setFullName} />
          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <TextInput style={styles.input} placeholder="e.g. 0771234567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Text style={styles.fieldLabel}>Delivery Address</Text>
          <TextInput style={styles.input} placeholder="Street / area (for home delivery)" value={address} onChangeText={setAddress} />
          <Text style={styles.fieldLabel}>City</Text>
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <Text style={styles.fieldLabel}>Order Notes (optional)</Text>
          <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} placeholder="Any special instructions..." value={notes} onChangeText={setNotes} multiline />
        </View>

        {/* Per-seller: delivery + payment */}
        {Object.keys(itemsBySeller).map(sid => {
          const delivery = selectedDelivery[sid];
          const shopName = deliveryOptions[sid]?.shopName || itemsBySeller[sid].shopName;
          return (
            <View key={sid} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="storefront-outline" size={16} color="#555" />
                <Text style={styles.sectionTitle}>{shopName}</Text>
              </View>

              {/* Delivery summary */}
              {delivery ? (
                <View style={styles.deliverySummary}>
                  <Ionicons name={delivery.type === 'terminal' ? 'bus-outline' : 'home-outline'} size={16} color={delivery.type === 'terminal' ? '#e74c3c' : '#3498db'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.deliveryName}>{delivery.name}</Text>
                    <Text style={styles.deliverySub}>{delivery.type === 'terminal' ? 'Link Bus Pickup' : 'Home Delivery'} • {delivery.estimatedDays} days</Text>
                  </View>
                  <Text style={styles.deliveryFee}>UGX {(delivery.fee || 0).toLocaleString()}</Text>
                </View>
              ) : (
                <Text style={styles.noPaymentText}>No delivery selected</Text>
              )}

              {/* Payment */}
              <View style={{ marginTop: 14 }}>
                <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                  <Ionicons name="card-outline" size={16} color="#9b59b6" />
                  <Text style={[styles.sectionTitle, { fontSize: 14, color: '#9b59b6' }]}>Pay Seller</Text>
                </View>
                <PaymentSelector sid={sid} />
              </View>
            </View>
          );
        })}

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={18} color="#333" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>

          {/* Coupon Code */}
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter coupon code"
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={v => { setCouponCode(v.toUpperCase()); setCouponError(''); setAppliedCoupon(null); }}
            />
            <TouchableOpacity
              style={[styles.couponBtn, appliedCoupon && { backgroundColor: '#27ae60' }]}
              onPress={appliedCoupon ? () => { setAppliedCoupon(null); setCouponCode(''); } : applyCoupon}
              disabled={couponLoading}
            >
              {couponLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.couponBtnText}>{appliedCoupon ? 'Remove' : 'Apply'}</Text>
              }
            </TouchableOpacity>
          </View>
          {couponError ? (
            <Text style={styles.couponError}>{couponError}</Text>
          ) : appliedCoupon ? (
            <View style={styles.couponSuccess}>
              <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
              <Text style={styles.couponSuccessText}>
                "{appliedCoupon.title}" — {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% off` : `UGX ${appliedCoupon.discountValue?.toLocaleString()} off`}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</Text>
            <Text style={styles.summaryValue}>UGX {subtotal.toLocaleString()}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#27ae60' }]}>Discount ({discount}%)</Text>
              <Text style={[styles.summaryValue, { color: '#27ae60' }]}>-UGX {Math.round(discountAmt).toLocaleString()}</Text>
            </View>
          )}
          {couponDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#9b59b6' }]}>Coupon ({couponCode})</Text>
              <Text style={[styles.summaryValue, { color: '#9b59b6' }]}>-UGX {couponDiscount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>UGX {totalDeliveryFee.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>UGX {finalTotal.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.placeBtn} onPress={handleProceed} disabled={placing}>
          {placing
            ? <ActivityIndicator size="small" color="#fff" />
            : allCOD()
              ? <><Ionicons name="checkmark-circle-outline" size={22} color="#fff" /><Text style={styles.placeBtnText}>Place Order • UGX {finalTotal.toLocaleString()}</Text></>
              : <><Ionicons name="card-outline" size={22} color="#fff" /><Text style={styles.placeBtnText}>Proceed to Payment • UGX {finalTotal.toLocaleString()}</Text></>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  scroll: { padding: 16 },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#f8f9fa' },
  deliverySummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0faf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#27ae60' },
  deliveryName: { fontSize: 14, fontWeight: '600', color: '#333' },
  deliverySub: { fontSize: 12, color: '#888', marginTop: 2 },
  deliveryFee: { fontSize: 14, fontWeight: '700', color: '#27ae60' },
  paymentLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  paymentLoadingText: { fontSize: 13, color: '#aaa' },
  noPaymentText: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  paymentOptions: { gap: 8 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e1e8ed', borderRadius: 10, padding: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  optSub: { fontSize: 12, color: '#888', marginTop: 2 },
  preferredBadge: { backgroundColor: '#fff3cd', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  preferredBadgeText: { fontSize: 10, color: '#f39c12', fontWeight: '700' },
  codAvailBadge: { backgroundColor: '#e8f8f0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  codAvailText: { fontSize: 10, color: '#27ae60', fontWeight: '700' },
  codUnavailRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#f0f0f0', borderRadius: 10, padding: 12, backgroundColor: '#fafafa', opacity: 0.7 },
  codUnavailLabel: { fontSize: 14, fontWeight: '600', color: '#bbb' },
  codUnavailBadge: { backgroundColor: '#fdecea', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  codUnavailBadgeText: { fontSize: 10, color: '#e74c3c', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#777' },
  summaryValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  totalLabel: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  totalValue: { fontSize: 17, fontWeight: '800', color: '#3498db' },

  // Coupon
  couponRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  couponInput: {
    flex: 1, borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#333', backgroundColor: '#f8f9fa', letterSpacing: 1,
  },
  couponBtn: {
    backgroundColor: '#9b59b6', borderRadius: 8,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
  },
  couponBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  couponError: { fontSize: 12, color: '#e74c3c', marginBottom: 10 },
  couponSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#e8f8f0', borderRadius: 8, padding: 8, marginBottom: 10,
  },
  couponSuccessText: { fontSize: 12, color: '#27ae60', fontWeight: '600', flex: 1 },
  placeBtn: {
    backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14, gap: 10, elevation: 3,
    shadowColor: '#27ae60', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  placeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

