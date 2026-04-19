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
  pending:            { label: 'Pending',           color: '#9b59b6', icon: 'hourglass-outline',       next: 'processing' },
  processing:         { label: 'Processing',         color: '#f39c12', icon: 'time-outline',            next: 'shipped'    },
  shipped:            { label: 'Shipped',            color: '#3498db', icon: 'car-outline',             next: 'delivered'  },
  delivered:          { label: 'Delivered',          color: '#27ae60', icon: 'checkmark-circle',        next: null         },
  cancelled:          { label: 'Cancelled',          color: '#e74c3c', icon: 'close-circle',            next: null         },
  refund_in_progress: { label: 'Refund In Progress', color: '#e67e22', icon: 'refresh-circle-outline',  next: null         },
  refunded:           { label: 'Refunded',           color: '#16a085', icon: 'checkmark-done-circle',   next: null         },
};
const getMeta = (s) => STATUS_META[s?.toLowerCase()] || { label: s || 'Unknown', color: '#95a5a6', icon: 'help-circle', next: null };

const TABS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'refund_in_progress', 'refunded', 'cancelled'];
const TAB_LABELS = { All:'All', pending:'Pending', processing:'Processing', shipped:'Shipped', delivered:'Delivered', refund_in_progress:'Refund', refunded:'Refunded', cancelled:'Cancelled' };

export default function SellerOrders({ navigation }) {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [updating, setUpdating]       = useState(null);
  const [selectedTab, setSelectedTab] = useState('All');
  const [detailOrder, setDetailOrder] = useState(null);
  const [imageViewer, setImageViewer] = useState(null);

  const openImage = (images, index = 0) => setImageViewer({ images, index });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('currentSeller');
      if (!raw) { setLoading(false); return; }
      const seller = JSON.parse(raw);
      const sellerId = seller.id || seller._id;
      if (!sellerId) { setLoading(false); return; }
      const res = await fetch(`${API}/orders?sellerId=${sellerId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error('SellerOrders load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, []);

  const updateStatus = async (order, newStatus) => {
    setUpdating(order._id);
    try {
      const res = await fetch(`${API}/orders/${order._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: newStatus } : o));
        if (detailOrder?._id === order._id) setDetailOrder(prev => ({ ...prev, status: newStatus }));
        Toast.show({ type: 'success', text1: 'Status updated', text2: `Order marked as ${getMeta(newStatus).label}` });
      } else {
        Toast.show({ type: 'error', text1: 'Update failed', text2: data.error || 'Please try again.' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Check your connection.' });
    } finally {
      setUpdating(null);
    }
  };

  // For display: treat cancelled+refunded as a separate "refunded" status
  const displayStatus = (o) => {
    if (o.status === 'cancelled' && o.paymentStatus === 'refunded') return 'refunded';
    return o.status?.toLowerCase() || 'pending';
  };

  const filtered = selectedTab === 'All'
    ? orders
    : orders.filter(o => displayStatus(o) === selectedTab);

  const counts = orders.reduce((acc, o) => {
    const s = displayStatus(o);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const totalRevenue = orders
    .filter(o => !['cancelled','refund_in_progress'].includes(o.status?.toLowerCase()))
    .reduce((s, o) => s + (o.subtotal || 0) + (o.deliveryFee || 0), 0);

  // ── Order card ──────────────────────────────────────────────────────────────
  const renderCard = ({ item }) => {
    const orderId = `#${item._id.toString().slice(-6).toUpperCase()}`;
    const total   = (item.subtotal || 0) + (item.deliveryFee || 0);
    const meta    = getMeta(displayStatus(item));
    const isUpdating = updating === item._id;
    const isRefund   = item.status === 'refund_in_progress';
    const isRefunded = item.status === 'cancelled' && item.paymentStatus === 'refunded';

    return (
      <View style={[styles.card, isRefund && styles.refundCard]}>
        {isRefund && (
          <View style={styles.refundBanner}>
            <Ionicons name="refresh-circle-outline" size={14} color="#e67e22" />
            <Text style={styles.refundBannerText}>Refund requested — contact buyer to process refund</Text>
          </View>
        )}
        {isRefunded && (
          <View style={[styles.refundBanner, { backgroundColor: '#e8f8f5', borderColor: '#16a08540' }]}>
            <Ionicons name="checkmark-done-circle" size={14} color="#16a085" />
            <Text style={[styles.refundBannerText, { color: '#16a085' }]}>
              Refund completed on {item.refundDetails?.completedAt ? new Date(item.refundDetails.completedAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardOrderId}>{orderId}</Text>
            <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: meta.color + '20' }]}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Buyer */}
        <View style={styles.buyerRow}>
          <Ionicons name="person-outline" size={14} color="#888" />
          <Text style={styles.buyerText}>
            {item.buyerInfo?.name || item.customerInfo?.fullName || 'Unknown buyer'}
            {item.buyerInfo?.phone || item.customerInfo?.phone ? `  ·  ${item.buyerInfo?.phone || item.customerInfo?.phone}` : ''}
          </Text>
        </View>

        {/* Items preview */}
        <View style={styles.itemsPreview}>
          {(item.items || []).slice(0, 2).map((p, i) => (
            <View key={i} style={styles.itemRow}>
              {p.image
                ? <Image source={{ uri: p.image }} style={styles.itemImg} />
                : <View style={[styles.itemImg, styles.imgPlaceholder]}><Ionicons name="image-outline" size={18} color="#ccc" /></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.itemSub}>Qty {p.quantity} × UGX {(p.price || 0).toLocaleString()}</Text>
              </View>
            </View>
          ))}
          {(item.items || []).length > 2 && <Text style={styles.moreItems}>+{item.items.length - 2} more</Text>}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalText}>UGX {total.toLocaleString()}</Text>
            <Text style={styles.paymentMethod}>{item.paymentMethod?.toUpperCase()} · {item.paymentStatus}</Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.detailBtn} onPress={() => setDetailOrder(item)}>
              <Text style={styles.detailBtnText}>Details</Text>
            </TouchableOpacity>
            {meta.next && (
              <TouchableOpacity
                style={[styles.nextBtn, isUpdating && styles.disabledBtn]}
                disabled={isUpdating}
                onPress={() => updateStatus(item, meta.next)}
              >
                {isUpdating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.nextBtnText}>Mark {getMeta(meta.next).label}</Text>
                }
              </TouchableOpacity>
            )}
            {item.status === 'refund_in_progress' && (
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: '#e67e22' }]}
                onPress={() => navigation.navigate('SellerRefund', { order: item })}
              >
                <Text style={styles.nextBtnText}>Process Refund</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ── Detail Modal ────────────────────────────────────────────────────────────
  const renderDetailModal = () => {
    if (!detailOrder) return null;
    const o      = detailOrder;
    const orderId = `#${o._id.toString().slice(-6).toUpperCase()}`;
    const total   = (o.subtotal || 0) + (o.deliveryFee || 0);
    const meta    = getMeta(o.status);
    const isUpdating = updating === o._id;

    return (
      <Modal visible animationType="slide" onRequestClose={() => setDetailOrder(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailOrder(null)} style={styles.modalBack}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order {orderId}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>

            {/* Status + progress */}
            <View style={[styles.section, { borderLeftColor: meta.color, borderLeftWidth: 4 }]}>
              <View style={styles.statusRow}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
                <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={styles.sectionSub}>Placed {new Date(o.createdAt).toLocaleString()}</Text>

              {/* Status stepper */}
              {!['cancelled','refund_in_progress'].includes(o.status?.toLowerCase()) && (
                <View style={styles.stepper}>
                  {['pending','processing','shipped','delivered'].map((s, i, arr) => {
                    const stepMeta = getMeta(s);
                    const steps = ['pending','processing','shipped','delivered'];
                    const currentIdx = steps.indexOf(o.status?.toLowerCase());
                    const stepIdx = steps.indexOf(s);
                    const done = stepIdx <= currentIdx;
                    return (
                      <React.Fragment key={s}>
                        <View style={styles.stepItem}>
                          <View style={[styles.stepDot, done && { backgroundColor: stepMeta.color }]}>
                            {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                          </View>
                          <Text style={[styles.stepLabel, done && { color: stepMeta.color, fontWeight: '700' }]}>{stepMeta.label}</Text>
                        </View>
                        {i < arr.length - 1 && <View style={[styles.stepLine, done && stepIdx < currentIdx && { backgroundColor: '#27ae60' }]} />}
                      </React.Fragment>
                    );
                  })}
                </View>
              )}

              {o.status === 'refund_in_progress' && (
                <View style={styles.refundNotice}>
                  <Ionicons name="alert-circle-outline" size={15} color="#e67e22" />
                  <Text style={styles.refundNoticeText}>
                    Customer cancelled this order. Please contact them to process the refund of UGX {total.toLocaleString()}.
                  </Text>
                </View>
              )}
            </View>

            {/* Buyer info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer</Text>
              <Text style={styles.infoText}>{o.buyerInfo?.name || o.customerInfo?.fullName || 'N/A'}</Text>
              <Text style={styles.infoSub}>{o.buyerInfo?.email || 'No email'}</Text>
              <Text style={styles.infoSub}>{o.buyerInfo?.phone || o.customerInfo?.phone || 'No phone'}</Text>
              {o.customerInfo?.address ? <Text style={styles.infoSub}>{o.customerInfo.address}{o.customerInfo.city ? `, ${o.customerInfo.city}` : ''}</Text> : null}
              {o.customerInfo?.notes ? <Text style={[styles.infoSub, { fontStyle: 'italic' }]}>Note: {o.customerInfo.notes}</Text> : null}
            </View>

            {/* Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items</Text>
              {(o.items || []).map((item, i) => (
                <View key={i} style={styles.detailItem}>
                  {item.image
                    ? <Image source={{ uri: item.image }} style={styles.detailItemImg} />
                    : <View style={[styles.detailItemImg, styles.imgPlaceholder]}><Ionicons name="image-outline" size={22} color="#ccc" /></View>
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery</Text>
              <Text style={styles.infoText}>{o.delivery?.name || 'N/A'}</Text>
              <Text style={styles.infoSub}>{o.delivery?.type === 'terminal' ? 'Link Bus Pickup' : 'Home Delivery'} · {o.delivery?.estimatedDays || '?'} days</Text>
            </View>

            {/* Payment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment</Text>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Method</Text><Text style={styles.summaryVal}>{o.paymentMethod?.toUpperCase() || 'N/A'}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payment Status</Text>
                <Text style={[styles.summaryVal, { color: o.paymentStatus === 'submitted' ? '#27ae60' : '#f39c12' }]}>{o.paymentStatus || 'pending'}</Text>
              </View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryVal}>UGX {(o.subtotal || 0).toLocaleString()}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery Fee</Text><Text style={styles.summaryVal}>UGX {(o.deliveryFee || 0).toLocaleString()}</Text></View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>UGX {total.toLocaleString()}</Text>
              </View>
            </View>

            {/* Proof images */}
            {(o.proofImages || []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Proof</Text>
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

            {/* Action buttons */}
            {meta.next && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: getMeta(meta.next).color }, isUpdating && styles.disabledBtn]}
                disabled={isUpdating}
                onPress={() => updateStatus(o, meta.next)}
              >
                {isUpdating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name={getMeta(meta.next).icon} size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Mark as {getMeta(meta.next).label}</Text>
                    </>
                }
              </TouchableOpacity>
            )}

            {o.status === 'refund_in_progress' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#e67e22', marginTop: 8 }]}
                onPress={() => { setDetailOrder(null); navigation.navigate('SellerRefund', { order: o }); }}
              >
                <Ionicons name="refresh-circle-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Process Refund</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity style={styles.backBtn} onPress={loadOrders}>
          <Ionicons name="refresh-outline" size={22} color="#555" />
        </TouchableOpacity>
      </View>

      {/* Summary strip */}
      {!loading && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryStrip} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipNum}>{orders.length}</Text>
            <Text style={styles.summaryChipLabel}>Total</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: '#9b59b6' }]}>
            <Text style={[styles.summaryChipNum, { color: '#9b59b6' }]}>{counts.pending || 0}</Text>
            <Text style={styles.summaryChipLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: '#f39c12' }]}>
            <Text style={[styles.summaryChipNum, { color: '#f39c12' }]}>{counts.processing || 0}</Text>
            <Text style={styles.summaryChipLabel}>Processing</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: '#3498db' }]}>
            <Text style={[styles.summaryChipNum, { color: '#3498db' }]}>{counts.shipped || 0}</Text>
            <Text style={styles.summaryChipLabel}>Shipped</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: '#27ae60' }]}>
            <Text style={[styles.summaryChipNum, { color: '#27ae60' }]}>{counts.delivered || 0}</Text>
            <Text style={styles.summaryChipLabel}>Delivered</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: '#e67e22' }]}>
            <Text style={[styles.summaryChipNum, { color: '#e67e22' }]}>{counts.refund_in_progress || 0}</Text>
            <Text style={styles.summaryChipLabel}>Refunds</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: '#16a085' }]}>
            <Text style={[styles.summaryChipNum, { color: '#16a085' }]}>{counts.refunded || 0}</Text>
            <Text style={styles.summaryChipLabel}>Refunded</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: '#27ae60', backgroundColor: '#f0faf4' }]}>
            <Text style={[styles.summaryChipNum, { color: '#27ae60', fontSize: 13 }]}>UGX {totalRevenue.toLocaleString()}</Text>
            <Text style={styles.summaryChipLabel}>Revenue</Text>
          </View>
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.activeTab]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{TAB_LABELS[tab]}</Text>
                {counts[tab] > 0 && (
                  <View style={[styles.tabBadge, selectedTab === tab && styles.activeTabBadge]}>
                    <Text style={[styles.tabBadgeText, selectedTab === tab && { color: '#fff' }]}>{counts[tab]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading
        ? <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 60 }} />
        : <FlatList
            data={filtered}
            renderItem={renderCard}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onRefresh={loadOrders}
            refreshing={loading}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={60} color="#ccc" />
                <Text style={styles.emptyTitle}>No orders yet</Text>
                <Text style={styles.emptySub}>{selectedTab === 'All' ? 'Orders from customers will appear here' : `No ${TAB_LABELS[selectedTab]?.toLowerCase()} orders`}</Text>
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
                  <Image source={{ uri: img.url }} style={styles.ivImage} resizeMode="contain" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e1e8ed', paddingTop: Platform.OS === 'android' ? 40 : 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2c3e50' },

  summaryStrip: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10, maxHeight: 72 },
  summaryChip: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 70 },
  summaryChipNum: { fontSize: 16, fontWeight: '800', color: '#2c3e50' },
  summaryChipLabel: { fontSize: 10, color: '#888', marginTop: 2 },

  tabsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f2f6', gap: 5 },
  activeTab: { backgroundColor: '#3498db' },
  tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#fff' },
  tabBadge: { backgroundColor: '#ddd', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  activeTabBadge: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#555' },

  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
  refundCard: { borderWidth: 1.5, borderColor: '#e67e22' },
  refundBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef9ec', borderRadius: 8, padding: 10, marginBottom: 10 },
  refundBannerText: { flex: 1, fontSize: 12, color: '#e67e22', fontWeight: '600' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardOrderId: { fontSize: 15, fontWeight: '700', color: '#2c3e50' },
  cardDate: { fontSize: 12, color: '#888', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  buyerText: { fontSize: 13, color: '#555' },

  itemsPreview: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  itemImg: { width: 48, height: 48, borderRadius: 8 },
  imgPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 13, fontWeight: '600', color: '#2c3e50' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  moreItems: { fontSize: 12, color: '#888', fontStyle: 'italic' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  totalText: { fontSize: 15, fontWeight: '800', color: '#2c3e50' },
  paymentMethod: { fontSize: 11, color: '#888', marginTop: 2 },
  footerActions: { flexDirection: 'row', gap: 8 },
  detailBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#3498db' },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: '#3498db' },
  nextBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#27ae60', minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  disabledBtn: { opacity: 0.5 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2c3e50', marginTop: 14 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#f4f6f8' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: Platform.OS === 'android' ? 40 : 14 },
  modalBack: { width: 40, height: 40, justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#2c3e50' },
  modalScroll: { padding: 16 },

  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  sectionSub: { fontSize: 12, color: '#888', marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusLabel: { fontSize: 16, fontWeight: '700' },

  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stepLabel: { fontSize: 10, color: '#aaa', textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#ddd', marginBottom: 14 },

  refundNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fef9ec', borderRadius: 8, padding: 10, marginTop: 12 },
  refundNoticeText: { flex: 1, fontSize: 12, color: '#e67e22', lineHeight: 18 },

  infoText: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 3 },
  infoSub: { fontSize: 13, color: '#777', marginBottom: 2 },

  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  detailItemImg: { width: 64, height: 64, borderRadius: 10 },
  detailItemName: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 3 },
  detailItemSub: { fontSize: 12, color: '#888' },
  detailItemTotal: { fontSize: 13, fontWeight: '700', color: '#27ae60', marginTop: 2 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#777' },
  summaryVal: { fontSize: 13, fontWeight: '600', color: '#333' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#2c3e50' },
  totalVal: { fontSize: 15, fontWeight: '800', color: '#3498db' },

  proofGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  proofThumb: { width: 140, height: 100, borderRadius: 10 },
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

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

