import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Image, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../constants/api';

export default function SellerDrafts({ navigation }) {
  const [drafts, setDrafts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('currentSeller');
      if (!raw) return;
      const s = JSON.parse(raw);
      const sid = s._id || s.id;
      const res  = await fetch(`${API_BASE}/products/draft/all?sellerId=${sid}`);
      const data = await res.json();
      if (data.success) setDrafts(data.drafts || []);
    } catch (e) {
      console.error('fetchDrafts error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchDrafts(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchDrafts(); };

  const publishDraft = async (draft) => {
    setPublishing(draft.id);
    try {
      const res  = await fetch(`${API_BASE}/products/draft/${draft.id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDrafts(prev => prev.filter(d => d.id !== draft.id));
        Alert.alert('Published', `"${draft.title}" is now live.`);
      } else {
        Alert.alert('Cannot Publish', data.message || 'Missing required fields.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Try again.');
    } finally {
      setPublishing(null);
    }
  };

  const deleteDraft = (draft) => {
    Alert.alert('Delete Draft', `Delete "${draft.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(draft.id);
          try {
            const res = await fetch(`${API_BASE}/products/draft/${draft.id}`, { method: 'DELETE' });
            if (res.ok) setDrafts(prev => prev.filter(d => d.id !== draft.id));
            else Alert.alert('Error', 'Could not delete draft.');
          } catch (e) {
            Alert.alert('Error', 'Network error.');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const daysLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Saved Drafts</Text>
          <Text style={styles.headerSub}>{drafts.length} draft{drafts.length !== 1 ? 's' : ''} saved</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('CreateProduct')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {drafts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={64} color="#ddd" />
              <Text style={styles.emptyTitle}>No drafts saved</Text>
              <Text style={styles.emptyText}>Products you save as drafts will appear here</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateProduct')}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            drafts.map(draft => {
              const imgUrl = draft.images?.[0]?.url || draft.images?.[0]?.thumbnailUrl || null;
              const days   = daysLeft(draft.draftExpiresAt);
              const urgent = days <= 3;
              return (
                <View key={draft.id} style={styles.card}>
                  {/* Image */}
                  <View style={styles.cardImage}>
                    {imgUrl
                      ? <Image source={{ uri: imgUrl }} style={styles.img} resizeMode="cover" />
                      : <View style={styles.imgPlaceholder}><Ionicons name="image-outline" size={28} color="#ccc" /></View>
                    }
                  </View>

                  {/* Info */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{draft.title || 'Untitled Draft'}</Text>

                    <View style={styles.metaRow}>
                      {draft.category ? (
                        <View style={styles.tag}><Text style={styles.tagText}>{draft.category}</Text></View>
                      ) : null}
                      {draft.salePrice ? (
                        <Text style={styles.price}>UGX {draft.salePrice?.toLocaleString()}</Text>
                      ) : null}
                    </View>

                    {/* Expiry warning */}
                    <View style={[styles.expiryRow, urgent && styles.expiryUrgent]}>
                      <Ionicons name="time-outline" size={12} color={urgent ? '#e74c3c' : '#888'} />
                      <Text style={[styles.expiryText, urgent && { color: '#e74c3c' }]}>
                        {days === 0 ? 'Expires today' : `Expires in ${days} day${days !== 1 ? 's' : ''}`}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.publishBtn}
                        onPress={() => publishDraft(draft)}
                        disabled={publishing === draft.id}
                      >
                        {publishing === draft.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <><Ionicons name="cloud-upload-outline" size={14} color="#fff" /><Text style={styles.publishBtnText}>Publish</Text></>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate('CreateProduct', { draftId: draft.id })}
                      >
                        <Ionicons name="create-outline" size={14} color="#3498db" />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteDraft(draft)}
                        disabled={deleting === draft.id}
                      >
                        {deleting === draft.id
                          ? <ActivityIndicator size="small" color="#e74c3c" />
                          : <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#2c3e50' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 1 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#3498db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#555', marginTop: 14 },
  emptyText: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 6, paddingHorizontal: 30 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3498db', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  cardImage: { width: 100 },
  img: { width: 100, height: '100%' },
  imgPlaceholder: { width: 100, height: '100%', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tag: { backgroundColor: '#e8f4fd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: '#3498db', fontWeight: '600' },
  price: { fontSize: 13, fontWeight: '700', color: '#27ae60' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  expiryUrgent: { backgroundColor: '#fdecea', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  expiryText: { fontSize: 11, color: '#888' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  publishBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: '#27ae60', borderRadius: 8, paddingVertical: 8,
  },
  publishBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: '#e8f4fd', borderRadius: 8, paddingVertical: 8,
  },
  editBtnText: { color: '#3498db', fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#fdecea',
    justifyContent: 'center', alignItems: 'center',
  },
});
