import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, FlatList, ActivityIndicator, Modal, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import API from '../config';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STATUS_META = {
  pending:            { label: 'Pending',           color: '#9b59b6', icon: 'hourglass-outline' },
  processing:         { label: 'Processing',         color: '#f39c12', icon: 'time-outline' },
  shipped:            { label: 'Shipped',            color: '#3498db', icon: 'car-outline' },
  delivered:          { label: 'Delivered',          color: '#27ae60', icon: 'checkmark-circle' },
  cancelled:          { label: 'Cancelled',          color: '#e74c3c', icon: 'close-circle' },
  refund_in_progress: { label: 'Refund In Progress', color: '#e67e22', icon: 'refresh-circle-outline' },
  refunded:           { label: 'Refunded',           color: '#16a085', icon: 'checkmark-done-circle' },
};

const getMeta = (status) => STATUS_META[status?.toLowerCase()] || { label: status || 'Unknown', color: '#95a5a6', icon: 'help-circle' };

// Derive display status — cancelled+refunded shows as "refunded"
const getDisplayStatus = (order) => {
  if (order.status === 'cancelled' && order.paymentStatus === 'refunded') return 'refunded';
  return order.status?.toLowerCase() || 'pending';
};

const UserOrders = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [imageViewer, setImageViewer] = useState(null);

  const openImage = (images, index = 0) => setImageViewer({ images, index });

  // Always fetch fresh order data when opening details so refundDetails is current
  const openDetail = async (order) => {
    setDetailOrder(order); // show immediately with cached data
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/orders/${order._id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailOrder(data.order);
      }
    } catch (_) {}
    finally { setDetailLoading(false); }
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      let raw = await AsyncStorage.getItem('currentUser');
      if (!raw) raw = await AsyncStorage.getItem('userData');
      if (!raw) { setLoading(false); return; }
      const user = JSON.parse(raw);
      const userId = user.id || user._id;
      if (!userId) { setLoading(false); return; }
      const res = await fetch(`${API}/orders?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, []);

  const tabs = ['All', 'pending', 'processing', 'shipped', 'delivered', 'refund_in_progress', 'refunded', 'cancelled'];
  const tabLabels = {
    All: 'All', pending: 'Pending', processing: 'Processing',
    shipped: 'Shipped', delivered: 'Delivered',
    refund_in_progress: 'Refund', refunded: 'Refunded', cancelled: 'Cancelled',
  };

  const filteredOrders = selectedTab === 'All'
    ? orders
    : orders.filter(o => getDisplayStatus(o) === selectedTab);

  const handleCancel = (order) => {
    // Close detail modal first if open, then show inline confirmation
    setDetailOrder(null);
    setConfirmOrder(order);
  };

  const confirmCancel = async (order) => {
    setCancelling(order._id);
    Toast.show({ type: 'info', text1: 'Cancelling order...', text2: 'Please wait.', visibilityTime: 3000 });
    try {
      const res = await fetch(`${API}/orders/${order._id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        // Update local state immediately
        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'refund_in_progress', paymentStatus: 'refund_pending' } : o));
        Toast.show({ type: 'success', text1: 'Order cancelled', text2: 'The seller has been notified. Your refund is in progress.', visibilityTime: 5000 });
      } else {
        Toast.show({ type: 'error', text1: 'Could not cancel', text2: data.error || 'Please try again.', visibilityTime: 4000 });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Check your connection and try again.', visibilityTime: 4000 });
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (status) => ['pending', 'processing'].includes(status?.toLowerCase());

  const renderOrderCard = ({ item }) => {
    const orderId = `#${item._id.toString().slice(-6).toUpperCase()}`;
    const total = (item.subtotal || 0) + (item.deliveryFee || 0);
    const meta = getMeta(getDisplayStatus(item));
    const isCancelling = cancelling === item._id;
    const isRefund = item.status === 'refund_in_progress';
    const isRefunded = item.status === 'cancelled' && item.paymentStatus === 'refunded';

    return (
      <View style={[styles.orderCard, isRefund && styles.refundCard, isRefunded && styles.refundedCard]}>
        {isRefund && (
          <View style={styles.refundBanner}>
            <Ionicons name="refresh-circle-outline" size={16} color="#e67e22" />
            <Text style={styles.refundBannerText}>Refund In Progress — Seller has been notified</Text>
          </View>
        )}
        {isRefunded && (
          <View style={[styles.refundBanner, { backgroundColor: '#e8f8f5', borderColor: '#16a08540' }]}>
            <Ionicons name="checkmark-done-circle" size={16} color="#16a085" />
            <Text style={[styles.refundBannerText, { color: '#16a085' }]}>
              Refund completed — tap Details to verify
            </Text>
          </View>
        )}

        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>{orderId}</Text>
            <Text style={styles.orderDate}>{new Date(item.createdAt || item.date).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.color + '20' }]}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          {(item.items || []).slice(0, 2).map((product, index) => (
            <View key={index} style={styles.orderItem}>
              {product.image
                ? <Image source={{ uri: product.image }} style={styles.productImage} />
                : <View style={[styles.productImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={22} color="#ccc" />
                  </View>
              }
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productPrice}>UGX {(product.price || 0).toLocaleString()} × {product.quantity}</Text>
              </View>
            </View>
          ))}
          {(item.items || []).length > 2 && (
            <Text style={styles.moreItems}>+{item.items.length - 2} more item(s)</Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.orderTotal}>UGX {total.toLocaleString()}</Text>
            {item.delivery?.name && (
              <Text style={styles.deliveryInfo}>
                {item.delivery.type === 'terminal' ? '🚌' : '🏠'} {item.delivery.name}
              </Text>
            )}
          </View>
          <View style={styles.orderActions}>
            {canCancel(item.status) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton, isCancelling && styles.disabledButton]}
                onPress={() => handleCancel(item)}
                disabled={isCancelling}
              >
                {isCancelling
                  ? <ActivityIndicator size="small" color="#e74c3c" />
                  : <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => openDetail(item)}
            >
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!detailOrder) return null;
    const o = detailOrder;
    const rawId = o._id || o.id || '';
    const orderId = rawId ? '#' + rawId.toString().slice(-6).toUpperCase() : '#------';
    const total = (o.subtotal || 0) + (o.deliveryFee || 0);
    const meta = getMeta(getDisplayStatus(o));
    const rd = o.refundDetails || {};
    const isRefunded = getDisplayStatus(o) === 'refunded';

    return (
      <Modal visible animationType="slide" onRequestClose={() => setDetailOrder(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailOrder(null)} style={styles.modalBack}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order {orderId}</Text>
            {detailLoading
              ? <ActivityIndicator size="small" color="#3498db" style={{ width: 40 }} />
              : <View style={{ width: 40 }} />
            }
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Status */}
            <View style={[styles.detailSection, { borderLeftColor: meta.color, borderLeftWidth: 4 }]}>
              <View style={styles.detailRow}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
                <Text style={[styles.detailStatusLabel, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={styles.detailMeta}>Placed on {new Date(o.createdAt).toLocaleString()}</Text>
              {o.status === 'refund_in_progress' && (
                <View style={styles.refundNotice}>
                  <Ionicons name="information-circle-outline" size={15} color="#e67e22" />
                  <Text style={styles.refundNoticeText}>The seller has been notified and will process your refund within 3–5 business days.</Text>
                </View>
              )}
              {getDisplayStatus(o) === 'refunded' && (
                <View style={[styles.refundNotice, { backgroundColor: '#e8f8f5' }]}>
                  <Ionicons name="checkmark-done-circle" size={15} color="#16a085" />
                  <Text style={[styles.refundNoticeText, { color: '#16a085' }]}>
                    Your refund has been completed by the seller. Check the Refund Details section below to verify.
                  </Text>
                </View>
              )}
            </View>

            {/* Items */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Items</Text>
              {(o.items || []).map((item, i) => (
                <View key={i} style={styles.detailItem}>
                  {item.image
                    ? <Image source={{ uri: item.image }} style={styles.detailItemImage} />
                    : <View style={[styles.detailItemImage, styles.imagePlaceholder]}><Ionicons name="image-outline" size={22} color="#ccc" /></View>
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailItemName}>{item.name}</Text>
                    <Text style={styles.detailItemSub}>Qty: {item.quantity} × UGX {(item.price || 0).toLocaleString()}</Text>
                    <Text style={styles.detailItemTotal}>UGX {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Delivery */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Delivery</Text>
              <Text style={styles.detailText}>{o.delivery?.name || 'N/A'}</Text>
              <Text style={styles.detailSubText}>{o.delivery?.type === 'terminal' ? 'Link Bus Pickup' : 'Home Delivery'} · {o.delivery?.estimatedDays || '?'} days</Text>
              <Text style={styles.detailSubText}>Fee: UGX {(o.deliveryFee || 0).toLocaleString()}</Text>
            </View>

            {/* Customer Info */}
            {o.customerInfo?.fullName && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Delivery Info</Text>
                <Text style={styles.detailText}>{o.customerInfo.fullName}</Text>
                <Text style={styles.detailSubText}>{o.customerInfo.phone}</Text>
                {o.customerInfo.address ? <Text style={styles.detailSubText}>{o.customerInfo.address}{o.customerInfo.city ? `, ${o.customerInfo.city}` : ''}</Text> : null}
                {o.customerInfo.notes ? <Text style={styles.detailSubText}>Note: {o.customerInfo.notes}</Text> : null}
              </View>
            )}

            {/* Payment */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Payment</Text>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Method</Text><Text style={styles.summaryValue}>{o.paymentMethod?.toUpperCase() || 'N/A'}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Status</Text><Text style={[styles.summaryValue, { color: o.paymentStatus === 'submitted' ? '#27ae60' : '#f39c12' }]}>{o.paymentStatus || 'pending'}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>UGX {(o.subtotal || 0).toLocaleString()}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery</Text><Text style={styles.summaryValue}>UGX {(o.deliveryFee || 0).toLocaleString()}</Text></View>
              <View style={[styles.summaryRow, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>UGX {total.toLocaleString()}</Text></View>
            </View>

            {/* Proof images */}
            {(o.proofImages || []).length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment Proof</Text>
                <View style={styles.proofGrid}>
                  {o.proofImages.map((p, i) => (
                    <TouchableOpacity key={i} onPress={() => openImage(o.proofImages, i)} activeOpacity={0.85}>
                      <Image source={{ uri: p.url }} style={styles.proofThumb} resizeMode="cover" />
                      <View style={styles.proofZoomHint}>
                        <Ionicons name="expand-outline" size={12} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Refund details — shown when seller has completed the refund */}
            {isRefunded && (
              <View style={[styles.detailSection, { borderLeftColor: '#16a085', borderLeftWidth: 4 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#16a085" />
                  <Text style={[styles.detailSectionTitle, { color: '#16a085', marginBottom: 0 }]}>Refund Details from Seller</Text>
                  {detailLoading && <ActivityIndicator size="small" color="#16a085" />}
                </View>

                {detailLoading && !rd.method ? (
                  <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>Loading refund details...</Text>
                ) : !rd.method && !rd.refundNumber ? (
                  <Text style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic' }}>Refund details not yet available. Pull to refresh.</Text>
                ) : (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Refund Method</Text>
                      <Text style={styles.summaryValue}>{rd.method?.toUpperCase() || 'N/A'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Sent To Number</Text>
                      <Text style={[styles.summaryValue, { color: '#16a085', fontWeight: '700' }]}>{rd.refundNumber || 'N/A'}</Text>
                    </View>
                    {rd.reference ? (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Transaction Ref</Text>
                        <Text style={[styles.summaryValue, { color: '#16a085', fontWeight: '700' }]}>{rd.reference}</Text>
                      </View>
                    ) : null}
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Refund Amount</Text>
                      <Text style={[styles.summaryValue, { color: '#16a085', fontWeight: '800' }]}>UGX {total.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Completed On</Text>
                      <Text style={styles.summaryValue}>
                        {rd.completedAt ? new Date(rd.completedAt).toLocaleString() : 'N/A'}
                      </Text>
                    </View>
                    {rd.notes ? (
                      <View style={[styles.refundNotice, { backgroundColor: '#e8f8f5', marginTop: 8 }]}>
                        <Ionicons name="chatbubble-outline" size={14} color="#16a085" />
                        <Text style={[styles.refundNoticeText, { color: '#16a085' }]}>{rd.notes}</Text>
                      </View>
                    ) : null}

                    {/* Seller's refund proof images */}
                    {(rd.proofImages || []).length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={[styles.detailSectionTitle, { fontSize: 13, marginBottom: 6 }]}>Refund Proof Screenshots</Text>
                        <Text style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                          Uploaded by the seller to confirm the refund was sent. Tap to view full screen.
                        </Text>
                        <View style={styles.proofGrid}>
                          {rd.proofImages.map((p, i) => (
                            <TouchableOpacity key={i} onPress={() => openImage(rd.proofImages, i)} activeOpacity={0.85}>
                              <Image source={{ uri: p.url }} style={[styles.proofThumb, { width: 150, height: 110 }]} resizeMode="cover" />
                              <View style={styles.proofZoomHint}>
                                <Ionicons name="expand-outline" size={12} color="#fff" />
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}

                <View style={[styles.refundNotice, { backgroundColor: '#fef9ec', marginTop: 12 }]}>
                  <Ionicons name="information-circle-outline" size={14} color="#e67e22" />
                  <Text style={[styles.refundNoticeText, { color: '#e67e22' }]}>
                    If you haven't received your refund, contact EasyShop support with order ID: {orderId}
                  </Text>
                </View>
              </View>
            )}

            {/* Cancel button inside modal */}
            {canCancel(o.status) && (
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => handleCancel(o)}
              >
                <Ionicons name="close-circle-outline" size={18} color="#e74c3c" />
                <Text style={styles.modalCancelText}>Cancel This Order</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadOrders}>
          <Ionicons name="refresh-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.activeTab]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                  {tabLabels[tab]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading
        ? <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 60 }} />
        : <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={item => item._id || item.id}
            contentContainerStyle={styles.ordersList}
            showsVerticalScrollIndicator={false}
            onRefresh={loadOrders}
            refreshing={loading}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="bag-outline" size={64} color="#bdc3c7" />
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedTab === 'All' ? "You haven't placed any orders yet" : `No ${tabLabels[selectedTab]?.toLowerCase()} orders`}
                </Text>
                <TouchableOpacity style={styles.shopButton} onPress={() => navigation?.navigate('home')}>
                  <Text style={styles.shopButtonText}>Start Shopping</Text>
                </TouchableOpacity>
              </View>
            }
          />
      }

      {renderDetailModal()}

      {/* ── Fullscreen Image Viewer ── */}
      {imageViewer && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setImageViewer(null)}>
          <View style={styles.ivOverlay}>
            <TouchableOpacity style={styles.ivClose} onPress={() => setImageViewer(null)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: imageViewer.index * SCREEN_W, y: 0 }}
            >
              {imageViewer.images.map((img, i) => (
                <View key={i} style={styles.ivPage}>
                  <Image
                    source={{ uri: img.url }}
                    style={styles.ivImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.ivDots}>
              {imageViewer.images.map((_, i) => (
                <View key={i} style={[styles.ivDot, i === imageViewer.index && styles.ivDotActive]} />
              ))}
            </View>
            <Text style={styles.ivHint}>Swipe to see more · Tap × to close</Text>
          </View>
        </Modal>
      )}

      {/* ── Inline Cancel Confirmation Modal ── */}
      {confirmOrder && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmOrder(null)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmSheet}>
              <View style={styles.confirmIconWrap}>
                <Ionicons name="alert-circle-outline" size={40} color="#e74c3c" />
              </View>
              <Text style={styles.confirmTitle}>Cancel Order?</Text>
              <Text style={styles.confirmBody}>
                Order #{confirmOrder._id.toString().slice(-6).toUpperCase()}{'\n\n'}
                If you already paid, the seller will be notified to process your refund.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.confirmKeepBtn}
                  onPress={() => setConfirmOrder(null)}
                >
                  <Text style={styles.confirmKeepText}>Keep Order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmCancelBtn, cancelling && styles.disabledButton]}
                  disabled={!!cancelling}
                  onPress={() => {
                    const order = confirmOrder;
                    setConfirmOrder(null);
                    confirmCancel(order);
                  }}
                >
                  {cancelling
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.confirmCancelText}>Yes, Cancel</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e1e8ed' },
  backButton: { padding: 8 },
  refreshButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50' },
  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e1e8ed' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, marginRight: 6, borderRadius: 20, backgroundColor: '#f1f2f6' },
  activeTab: { backgroundColor: '#3498db' },
  tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#fff' },
  ordersList: { padding: 16 },

  orderCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  refundCard: { borderWidth: 1.5, borderColor: '#e67e22' },
  refundedCard: { borderWidth: 1.5, borderColor: '#16a085' },
  refundBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef9ec', borderRadius: 8, padding: 10, marginBottom: 12 },
  refundBannerText: { flex: 1, fontSize: 12, color: '#e67e22', fontWeight: '600' },

  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 15, fontWeight: '700', color: '#2c3e50', marginBottom: 2 },
  orderDate: { fontSize: 13, color: '#7f8c8d' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, gap: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },

  orderItems: { marginBottom: 14 },
  orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  productImage: { width: 56, height: 56, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', color: '#2c3e50', marginBottom: 3 },
  productPrice: { fontSize: 13, color: '#27ae60', fontWeight: '600' },
  moreItems: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 4 },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 14 },
  orderTotal: { fontSize: 15, fontWeight: '800', color: '#2c3e50' },
  deliveryInfo: { fontSize: 11, color: '#888', marginTop: 2 },
  orderActions: { flexDirection: 'row', gap: 8 },
  actionButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e1e8ed', minWidth: 70, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#3498db', borderColor: '#3498db' },
  cancelButton: { borderColor: '#e74c3c' },
  disabledButton: { opacity: 0.5 },
  actionButtonText: { fontSize: 12, fontWeight: '700', color: '#666' },
  primaryButtonText: { color: '#fff' },
  cancelButtonText: { color: '#e74c3c' },

  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#2c3e50', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#7f8c8d', textAlign: 'center', marginBottom: 24 },
  shopButton: { backgroundColor: '#3498db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  shopButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e1e8ed', paddingTop: Platform.OS === 'android' ? 40 : 14 },
  modalBack: { width: 40, height: 40, justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#2c3e50' },
  modalScroll: { padding: 16 },

  detailSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  detailStatusLabel: { fontSize: 16, fontWeight: '700' },
  detailMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  refundNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fef9ec', borderRadius: 8, padding: 10, marginTop: 10 },
  refundNoticeText: { flex: 1, fontSize: 12, color: '#e67e22', lineHeight: 18 },
  detailSectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  detailItemImage: { width: 64, height: 64, borderRadius: 10 },
  detailItemName: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 3 },
  detailItemSub: { fontSize: 12, color: '#888' },
  detailItemTotal: { fontSize: 13, fontWeight: '700', color: '#27ae60', marginTop: 2 },
  detailText: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 3 },
  detailSubText: { fontSize: 13, color: '#777', marginBottom: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#777' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#333' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#2c3e50' },
  totalValue: { fontSize: 15, fontWeight: '800', color: '#3498db' },
  proofGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  proofThumb: { width: 130, height: 100, borderRadius: 10 },
  proofZoomHint: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: 3 },

  // Fullscreen image viewer
  ivOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  ivClose: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 54, right: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 },
  ivPage: { width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' },
  ivImage: { width: SCREEN_W, height: SCREEN_H * 0.8 },
  ivDots: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  ivDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  ivDotActive: { backgroundColor: '#fff', width: 18 },
  ivHint: { position: 'absolute', bottom: 36, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  modalCancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e74c3c', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#e74c3c' },

  // Inline cancel confirmation
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmSheet: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center' },
  confirmIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fdecea', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: '#2c3e50', marginBottom: 10, textAlign: 'center' },
  confirmBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmKeepBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center' },
  confirmKeepText: { fontSize: 15, fontWeight: '700', color: '#555' },
  confirmCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center' },
  confirmCancelText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default UserOrders;

