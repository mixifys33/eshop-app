import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator, Switch,
  SafeAreaView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../constants/api';

const { width } = Dimensions.get('window');

const CAMPAIGN_TYPES = [
  { key: 'discount',      label: 'Discount',      icon: 'pricetag-outline',    color: '#e74c3c' },
  { key: 'flash_sale',    label: 'Flash Sale',     icon: 'flash-outline',       color: '#f39c12' },
  { key: 'buy_x_get_y',  label: 'Buy X Get Y',    icon: 'gift-outline',        color: '#9b59b6' },
  { key: 'free_shipping', label: 'Free Shipping',  icon: 'bicycle-outline',     color: '#3498db' },
  { key: 'bundle',        label: 'Bundle Deal',    icon: 'layers-outline',      color: '#27ae60' },
];

const STATUS_META = {
  active:  { label: 'Active',  color: '#27ae60', bg: '#e8f5e9' },
  draft:   { label: 'Draft',   color: '#f39c12', bg: '#fff8e1' },
  paused:  { label: 'Paused',  color: '#95a5a6', bg: '#f5f5f5' },
  ended:   { label: 'Ended',   color: '#e74c3c', bg: '#fdecea' },
};

const BANNER_COLORS = ['#e74c3c','#f39c12','#27ae60','#3498db','#9b59b6','#1abc9c','#e67e22','#2c3e50'];

const today = () => new Date().toISOString().split('T')[0];
const inDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const emptyForm = () => ({
  title: '',
  description: '',
  type: 'discount',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxUsage: '',
  couponCode: '',
  appliesTo: 'all_products',
  startDate: today(),
  endDate: inDays(7),
  bannerColor: '#e74c3c',
});

export default function SellerMarketing({ navigation }) {
  const [campaigns, setCampaigns]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [sellerId, setSellerId]           = useState(null);
  const [showModal, setShowModal]         = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const [form, setForm]                   = useState(emptyForm());
  const [filterStatus, setFilterStatus]   = useState('all');

  // Product / category selector state
  const [sellerProducts, setSellerProducts]         = useState([]);
  const [productsLoading, setProductsLoading]       = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [productSearch, setProductSearch]           = useState('');

  const loadSeller = useCallback(async () => {
    const raw = await AsyncStorage.getItem('currentSeller');
    if (!raw) return;
    const s = JSON.parse(raw);
    setSellerId(s.id || s._id);
    return s.id || s._id;
  }, []);

  const fetchCampaigns = useCallback(async (sid) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/campaigns/seller/${sid}`);
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns);
    } catch (e) {
      console.error('fetchCampaigns error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const sid = await loadSeller();
      if (sid) fetchCampaigns(sid);
    })();
  }, []);

  const fetchSellerProducts = useCallback(async (sid) => {
    try {
      setProductsLoading(true);
      const res  = await fetch(`${API_BASE}/products/seller/${sid}`);
      const data = await res.json();
      if (data.success && data.products) {
        setSellerProducts(data.products.filter(p => p.status === 'active' && !p.isDraft));
      }
    } catch (e) {
      console.error('fetchSellerProducts error:', e);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setSelectedProductIds([]);
    setSelectedCategories([]);
    setProductSearch('');
    setShowModal(true);
    if (sellerId) fetchSellerProducts(sellerId);
  };

  const openEdit = (campaign) => {
    setEditTarget(campaign._id);
    setForm({
      title: campaign.title,
      description: campaign.description || '',
      type: campaign.type,
      discountType: campaign.discountType,
      discountValue: String(campaign.discountValue || ''),
      minOrderAmount: String(campaign.minOrderAmount || ''),
      maxUsage: campaign.maxUsage ? String(campaign.maxUsage) : '',
      couponCode: campaign.couponCode || '',
      appliesTo: campaign.appliesTo,
      startDate: campaign.startDate?.split('T')[0] || today(),
      endDate: campaign.endDate?.split('T')[0] || inDays(7),
      bannerColor: campaign.bannerColor || '#e74c3c',
    });
    setSelectedProductIds(campaign.productIds?.map(id => id.toString()) || []);
    setSelectedCategories(campaign.categories || []);
    setProductSearch('');
    setShowModal(true);
    if (sellerId) fetchSellerProducts(sellerId);
  };

  const saveCampaign = async () => {
    if (!form.title.trim()) return Alert.alert('Validation', 'Campaign title is required');
    if (!form.startDate || !form.endDate) return Alert.alert('Validation', 'Start and end dates are required');
    if (new Date(form.endDate) <= new Date(form.startDate)) return Alert.alert('Validation', 'End date must be after start date');
    if (form.appliesTo === 'specific_products' && selectedProductIds.length === 0)
      return Alert.alert('Validation', 'Please select at least one product');
    if (form.appliesTo === 'specific_categories' && selectedCategories.length === 0)
      return Alert.alert('Validation', 'Please select at least one category');

    setSaving(true);
    try {
      const body = {
        sellerId,
        ...form,
        discountValue:  parseFloat(form.discountValue)  || 0,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxUsage:       form.maxUsage ? parseInt(form.maxUsage) : null,
        couponCode:     form.couponCode.trim().toUpperCase() || undefined,
        productIds:     form.appliesTo === 'specific_products'   ? selectedProductIds : [],
        categories:     form.appliesTo === 'specific_categories' ? selectedCategories : [],
      };

      const url    = editTarget ? `${API_BASE}/campaigns/${editTarget}` : `${API_BASE}/campaigns`;
      const method = editTarget ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchCampaigns(sellerId);
      } else {
        Alert.alert('Error', data.message || 'Could not save campaign');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign) => {
    try {
      const res  = await fetch(`${API_BASE}/campaigns/${campaign._id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.map(c => c._id === campaign._id ? data.campaign : c));
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  const deleteCampaign = (campaign) => {
    Alert.alert('Delete Campaign', `Delete "${campaign.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const res  = await fetch(`${API_BASE}/campaigns/${campaign._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
              setCampaigns(prev => prev.filter(c => c._id !== campaign._id));
            } else {
              Alert.alert('Error', data.message || 'Could not delete campaign. Please try again.');
            }
          } catch (e) {
            console.error('Delete campaign error:', e);
            Alert.alert('Error', 'Network error. Could not delete campaign.');
          }
        },
      },
    ]);
  };

  const typeInfo = (key) => CAMPAIGN_TYPES.find(t => t.key === key) || CAMPAIGN_TYPES[0];

  const filtered = filterStatus === 'all' ? campaigns : campaigns.filter(c => c.status === filterStatus);

  // Unique categories from seller's products
  const uniqueCategories = [...new Set(sellerProducts.map(p => p.category).filter(Boolean))];

  // Products filtered by search
  const filteredProducts = productSearch.trim()
    ? sellerProducts.filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase()))
    : sellerProducts;

  const toggleProduct = (id) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    );
  };

  const [confirmDelete, setConfirmDelete] = useState(null); // holds campaign to delete

  const doDelete = async () => {
    if (!confirmDelete) return;
    const campaign = confirmDelete;
    setConfirmDelete(null);
    try {
      const res  = await fetch(`${API_BASE}/campaigns/${campaign._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns(prev => prev.filter(c => c._id !== campaign._id));
      } else {
        Alert.alert('Error', data.message || 'Could not delete campaign.');
      }
    } catch (e) {
      console.error('Delete error:', e);
      Alert.alert('Error', 'Network error. Could not delete campaign.');
    }
  };

  // Summary stats
  const stats = {
    total:  campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    draft:  campaigns.filter(c => c.status === 'draft').length,
    ended:  campaigns.filter(c => c.status === 'ended').length,
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('SellerDashboard')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Marketing & Campaigns</Text>
          <Text style={styles.headerSub}>Boost your sales with promotions</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total',  value: stats.total,  color: '#3498db' },
            { label: 'Active', value: stats.active, color: '#27ae60' },
            { label: 'Draft',  value: stats.draft,  color: '#f39c12' },
            { label: 'Ended',  value: stats.ended,  color: '#e74c3c' },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Campaign type guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Types</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {CAMPAIGN_TYPES.map(t => (
              <View key={t.key} style={[styles.typeChip, { borderColor: t.color + '60', backgroundColor: t.color + '12' }]}>
                <Ionicons name={t.icon} size={16} color={t.color} />
                <Text style={[styles.typeChipText, { color: t.color }]}>{t.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {['all', 'active', 'draft', 'paused', 'ended'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filterStatus === f && styles.filterTabActive]}
              onPress={() => setFilterStatus(f)}
            >
              <Text style={[styles.filterTabText, filterStatus === f && styles.filterTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Campaign list */}
        <View style={styles.section}>
          {loading ? (
            <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={56} color="#ddd" />
              <Text style={styles.emptyTitle}>No campaigns yet</Text>
              <Text style={styles.emptyText}>Create your first campaign to start boosting sales</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Campaign</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map(campaign => {
              const ti  = typeInfo(campaign.type);
              const sm  = STATUS_META[campaign.status] || STATUS_META.draft;
              const isActive = campaign.status === 'active';
              const isEnded  = campaign.status === 'ended';
              return (
                <View key={campaign._id} style={[styles.campaignCard, { borderLeftColor: campaign.bannerColor || ti.color }]}>
                  {/* Top row */}
                  <View style={styles.cardTop}>
                    <View style={[styles.typeIcon, { backgroundColor: ti.color + '20' }]}>
                      <Ionicons name={ti.icon} size={20} color={ti.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{campaign.title}</Text>
                      <Text style={styles.cardType}>{ti.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                      <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
                    </View>
                  </View>

                  {/* Discount info */}
                  {campaign.discountValue > 0 && (
                    <View style={styles.discountRow}>
                      <Ionicons name="pricetag" size={14} color="#e74c3c" />
                      <Text style={styles.discountText}>
                        {campaign.discountType === 'percentage'
                          ? `${campaign.discountValue}% off`
                          : `UGX ${campaign.discountValue.toLocaleString()} off`}
                        {campaign.minOrderAmount > 0 ? ` (min UGX ${campaign.minOrderAmount.toLocaleString()})` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Coupon code */}
                  {campaign.couponCode && (
                    <View style={styles.couponRow}>
                      <Ionicons name="ticket-outline" size={14} color="#9b59b6" />
                      <Text style={styles.couponCode}>{campaign.couponCode}</Text>
                    </View>
                  )}

                  {/* Dates */}
                  <View style={styles.datesRow}>
                    <Ionicons name="calendar-outline" size={13} color="#888" />
                    <Text style={styles.datesText}>
                      {new Date(campaign.startDate).toLocaleDateString()} – {new Date(campaign.endDate).toLocaleDateString()}
                    </Text>
                    {campaign.maxUsage && (
                      <Text style={styles.usageText}>
                        {campaign.usageCount}/{campaign.maxUsage} uses
                      </Text>
                    )}
                  </View>

                  {/* Applies to summary */}
                  <View style={styles.appliesToSummary}>
                    <Ionicons name={
                      campaign.appliesTo === 'all_products' ? 'apps-outline' :
                      campaign.appliesTo === 'specific_categories' ? 'grid-outline' : 'list-outline'
                    } size={12} color="#3498db" />
                    <Text style={styles.appliesToSummaryText}>
                      {campaign.appliesTo === 'all_products'
                        ? 'All products'
                        : campaign.appliesTo === 'specific_categories'
                          ? `${campaign.categories?.length || 0} categor${campaign.categories?.length === 1 ? 'y' : 'ies'}`
                          : `${campaign.productIds?.length || 0} product${campaign.productIds?.length === 1 ? '' : 's'}`
                      }
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {!isEnded && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isActive ? '#fff8e1' : '#e8f5e9' }]}
                        onPress={() => toggleCampaign(campaign)}
                      >
                        <Ionicons name={isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={isActive ? '#f39c12' : '#27ae60'} />
                        <Text style={[styles.actionBtnText, { color: isActive ? '#f39c12' : '#27ae60' }]}>
                          {isActive ? 'Pause' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e8f4fd' }]} onPress={() => openEdit(campaign)}>
                      <Ionicons name="create-outline" size={16} color="#3498db" />
                      <Text style={[styles.actionBtnText, { color: '#3498db' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fdecea' }]} onPress={() => setConfirmDelete(campaign)}>
                      <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                      <Text style={[styles.actionBtnText, { color: '#e74c3c' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Campaign' : 'New Campaign'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '85%' }}>
              {/* Title */}
              <Text style={styles.label}>Campaign Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Summer Flash Sale"
                value={form.title}
                onChangeText={v => setForm(p => ({ ...p, title: v }))}
              />

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Describe your campaign..."
                multiline
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
              />

              {/* Type */}
              <Text style={styles.label}>Campaign Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CAMPAIGN_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeSelectChip, form.type === t.key && { backgroundColor: t.color, borderColor: t.color }]}
                    onPress={() => setForm(p => ({ ...p, type: t.key }))}
                  >
                    <Ionicons name={t.icon} size={15} color={form.type === t.key ? '#fff' : t.color} />
                    <Text style={[styles.typeSelectText, form.type === t.key && { color: '#fff' }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Discount */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Discount Type</Text>
                  <View style={styles.segmentRow}>
                    {['percentage', 'fixed'].map(dt => (
                      <TouchableOpacity
                        key={dt}
                        style={[styles.segment, form.discountType === dt && styles.segmentActive]}
                        onPress={() => setForm(p => ({ ...p, discountType: dt }))}
                      >
                        <Text style={[styles.segmentText, form.discountType === dt && styles.segmentTextActive]}>
                          {dt === 'percentage' ? '% Off' : 'Fixed'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Value</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={form.discountType === 'percentage' ? '10' : '5000'}
                    keyboardType="numeric"
                    value={form.discountValue}
                    onChangeText={v => setForm(p => ({ ...p, discountValue: v }))}
                  />
                </View>
              </View>

              {/* Min order + max usage */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Min Order (UGX)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={form.minOrderAmount}
                    onChangeText={v => setForm(p => ({ ...p, minOrderAmount: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Max Uses</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Unlimited"
                    keyboardType="numeric"
                    value={form.maxUsage}
                    onChangeText={v => setForm(p => ({ ...p, maxUsage: v }))}
                  />
                </View>
              </View>

              {/* Coupon code */}
              <Text style={styles.label}>Coupon Code (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SAVE20"
                autoCapitalize="characters"
                value={form.couponCode}
                onChangeText={v => setForm(p => ({ ...p, couponCode: v.toUpperCase() }))}
              />

              {/* Applies To */}
              <Text style={styles.label}>Applies To *</Text>
              <View style={styles.appliesToRow}>
                {[
                  { key: 'all_products',        label: 'All Products',  icon: 'apps-outline'     },
                  { key: 'specific_categories', label: 'By Category',   icon: 'grid-outline'     },
                  { key: 'specific_products',   label: 'Pick Products', icon: 'list-outline'     },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.appliesToBtn, form.appliesTo === opt.key && styles.appliesToBtnActive]}
                    onPress={() => setForm(p => ({ ...p, appliesTo: opt.key }))}
                  >
                    <Ionicons name={opt.icon} size={16} color={form.appliesTo === opt.key ? '#fff' : '#555'} />
                    <Text style={[styles.appliesToText, form.appliesTo === opt.key && styles.appliesToTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category selector */}
              {form.appliesTo === 'specific_categories' && (
                <View style={styles.selectorBox}>
                  <Text style={styles.selectorHint}>
                    Select categories ({selectedCategories.length} selected)
                  </Text>
                  {uniqueCategories.length === 0 ? (
                    <Text style={styles.selectorEmpty}>No categories found in your products</Text>
                  ) : (
                    <View style={styles.categoryGrid}>
                      {uniqueCategories.map(cat => {
                        const selected = selectedCategories.includes(cat);
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                            onPress={() => toggleCategory(cat)}
                          >
                            {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                            <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Product selector */}
              {form.appliesTo === 'specific_products' && (
                <View style={styles.selectorBox}>
                  <Text style={styles.selectorHint}>
                    Select products ({selectedProductIds.length} selected)
                  </Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 10 }]}
                    placeholder="Search products..."
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                  {productsLoading ? (
                    <ActivityIndicator color="#3498db" style={{ marginVertical: 10 }} />
                  ) : filteredProducts.length === 0 ? (
                    <Text style={styles.selectorEmpty}>No products found</Text>
                  ) : (
                    filteredProducts.map(product => {
                      const selected = selectedProductIds.includes(product._id.toString());
                      const imgUrl   = product.images?.[0]?.url || product.images?.[0]?.thumbnailUrl;
                      return (
                        <TouchableOpacity
                          key={product._id}
                          style={[styles.productRow, selected && styles.productRowSelected]}
                          onPress={() => toggleProduct(product._id.toString())}
                        >
                          <View style={[styles.productRowCheck, selected && styles.productRowCheckSelected]}>
                            {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <View style={styles.productRowThumb}>
                            {imgUrl
                              ? <View style={[styles.productRowThumb, { backgroundColor: '#f0f0f0' }]}><Ionicons name="image-outline" size={16} color="#ccc" /></View>
                              : <View style={[styles.productRowThumb, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="cube-outline" size={16} color="#ccc" /></View>
                            }
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.productRowName} numberOfLines={1}>{product.title}</Text>
                            <Text style={styles.productRowMeta}>{product.category} · UGX {(product.salePrice || 0).toLocaleString()}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {/* Dates */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Start Date *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.startDate}
                    onChangeText={v => setForm(p => ({ ...p, startDate: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>End Date *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.endDate}
                    onChangeText={v => setForm(p => ({ ...p, endDate: v }))}
                  />
                </View>
              </View>

              {/* Banner color */}
              <Text style={styles.label}>Banner Color</Text>
              <View style={styles.colorRow}>
                {BANNER_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, form.bannerColor === c && styles.colorDotSelected]}
                    onPress={() => setForm(p => ({ ...p, bannerColor: c }))}
                  />
                ))}
              </View>

              {/* Save button */}
              <TouchableOpacity style={styles.saveBtn} onPress={saveCampaign} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.saveBtnText}>{editTarget ? 'Update Campaign' : 'Create Campaign'}</Text></>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Inline Delete Confirmation Modal */}
      <Modal visible={!!confirmDelete} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%' }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fdecea', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="trash-outline" size={28} color="#e74c3c" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#2c3e50', marginBottom: 6 }}>Delete Campaign</Text>
              <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                Delete "{confirmDelete?.title}"? This cannot be undone.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center' }}
                onPress={() => setConfirmDelete(null)}
              >
                <Text style={{ fontWeight: '700', color: '#555' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#e74c3c', alignItems: 'center' }}
                onPress={doDelete}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#2c3e50' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 1 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e74c3c', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderTopWidth: 3,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2c3e50' },

  // Type chips (guide)
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    marginRight: 8,
  },
  typeChipText: { fontSize: 12, fontWeight: '600' },

  // Filter tabs
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: { backgroundColor: '#3498db' },
  filterTabText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },

  // Campaign card
  campaignCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#2c3e50' },
  cardType: { fontSize: 11, color: '#888', marginTop: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  discountText: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },

  couponRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6,
    backgroundColor: '#f3e5f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  couponCode: { fontSize: 13, fontWeight: '800', color: '#9b59b6', letterSpacing: 1 },

  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  datesText: { fontSize: 12, color: '#888', flex: 1 },
  usageText: { fontSize: 11, color: '#3498db', fontWeight: '600' },

  appliesToSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 12, backgroundColor: '#e8f4fd',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  appliesToSummaryText: { fontSize: 11, color: '#3498db', fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: 8, paddingVertical: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#555', marginTop: 14 },
  emptyText: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 6, paddingHorizontal: 30 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#e74c3c', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2c3e50' },

  // Form
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333',
    backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', marginTop: 0 },

  // Type select chips (in modal)
  typeSelectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  typeSelectText: { fontSize: 12, fontWeight: '600', color: '#555' },

  // Segment control
  segmentRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fafafa' },
  segmentActive: { backgroundColor: '#3498db' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#666' },
  segmentTextActive: { color: '#fff' },

  // Color picker
  colorRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#2c3e50', transform: [{ scale: 1.15 }] },

  // Save button
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e74c3c', borderRadius: 14, paddingVertical: 15, marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Applies To
  appliesToRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  appliesToBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 8, backgroundColor: '#fafafa',
    minWidth: 100,
  },
  appliesToBtnActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  appliesToText: { fontSize: 12, fontWeight: '600', color: '#555' },
  appliesToTextActive: { color: '#fff' },

  // Selector box
  selectorBox: {
    marginTop: 10, borderWidth: 1, borderColor: '#e8e8e8',
    borderRadius: 12, padding: 12, backgroundColor: '#fafafa',
  },
  selectorHint: { fontSize: 12, color: '#888', marginBottom: 10, fontWeight: '600' },
  selectorEmpty: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 12 },

  // Category chips
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff',
  },
  categoryChipSelected: { backgroundColor: '#3498db', borderColor: '#3498db' },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  categoryChipTextSelected: { color: '#fff' },

  // Product rows
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10,
    marginBottom: 6, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#eee',
  },
  productRowSelected: { borderColor: '#3498db', backgroundColor: '#e8f4fd' },
  productRowCheck: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#ccc', justifyContent: 'center', alignItems: 'center',
  },
  productRowCheckSelected: { backgroundColor: '#3498db', borderColor: '#3498db' },
  productRowThumb: { width: 36, height: 36, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  productRowName: { fontSize: 13, fontWeight: '700', color: '#2c3e50' },
  productRowMeta: { fontSize: 11, color: '#888', marginTop: 2 },
});
