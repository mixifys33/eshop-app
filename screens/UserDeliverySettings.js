import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import API_BASE from '../constants/api';
const API = API_BASE;

// All Link Bus terminals grouped by region for display
const REGIONS = ['Central', 'Western'];

export default function UserDeliverySettings({ navigation }) {
  const [allTerminals, setAllTerminals] = useState([]);
  const [savedSettings, setSavedSettings] = useState(null); // { type, terminalId, terminalName, address, city, district, customAddress, notes }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Terminal picker modal
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminalSearch, setTerminalSearch] = useState('');

  // Custom address modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [notes, setNotes] = useState('');

  // Selected option: 'terminal' | 'address' | null
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTerminal, setSelectedTerminal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [terminalsRes, saved] = await Promise.all([
        fetch(`${API}/delivery/terminals`),
        AsyncStorage.getItem('userDeliverySettings'),
      ]);
      if (terminalsRes.ok) {
        const { terminals } = await terminalsRes.json();
        setAllTerminals(terminals || []);
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedSettings(parsed);
        setSelectedType(parsed.type);
        if (parsed.type === 'terminal') {
          setSelectedTerminal({ _id: parsed.terminalId, name: parsed.terminalName, city: parsed.city, district: parsed.district, address: parsed.address, phone: parsed.phone });
        } else if (parsed.type === 'address') {
          setCustomAddress(parsed.customAddress || '');
          setCustomCity(parsed.customCity || '');
          setNotes(parsed.notes || '');
        }
      }
    } catch (e) {
      console.error('loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settings) => {
    try {
      setSaving(true);
      await AsyncStorage.setItem('userDeliverySettings', JSON.stringify(settings));
      setSavedSettings(settings);
      Alert.alert('Saved', 'Your delivery preference has been saved.');
    } catch (e) {
      Alert.alert('Error', 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const selectTerminal = (terminal) => {
    setSelectedTerminal(terminal);
    setSelectedType('terminal');
    setShowTerminalModal(false);
    saveSettings({
      type: 'terminal',
      terminalId: terminal._id,
      terminalName: terminal.name,
      city: terminal.city,
      district: terminal.district,
      address: terminal.address,
      phone: terminal.phone,
      fee: 15000,
    });
  };

  const saveCustomAddress = () => {
    if (!customAddress.trim()) { Alert.alert('Required', 'Please enter your address.'); return; }
    setSelectedType('address');
    setShowAddressModal(false);
    saveSettings({
      type: 'address',
      customAddress: customAddress.trim(),
      customCity: customCity.trim(),
      notes: notes.trim(),
      fee: 15000,
    });
  };

  const clearSettings = () => {
    Alert.alert('Clear Preference', 'Remove your saved delivery preference?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('userDeliverySettings');
          setSavedSettings(null);
          setSelectedType(null);
          setSelectedTerminal(null);
          setCustomAddress('');
          setCustomCity('');
          setNotes('');
        }
      }
    ]);
  };

  // Filter terminals by search
  const filteredTerminals = terminalSearch.trim()
    ? allTerminals.filter(t =>
        t.name.toLowerCase().includes(terminalSearch.toLowerCase()) ||
        t.city.toLowerCase().includes(terminalSearch.toLowerCase()) ||
        t.district.toLowerCase().includes(terminalSearch.toLowerCase()) ||
        t.region.toLowerCase().includes(terminalSearch.toLowerCase())
      )
    : allTerminals;

  // Group by region
  const grouped = REGIONS.reduce((acc, r) => {
    const items = filteredTerminals.filter(t => t.region === r);
    if (items.length) acc[r] = items;
    return acc;
  }, {});

  if (loading) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Preferences</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.center}><ActivityIndicator size="large" color="#667eea" /></View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Preferences</Text>
        {savedSettings
          ? <TouchableOpacity onPress={clearSettings} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={20} color="white" />
            </TouchableOpacity>
          : <View style={{ width: 40 }} />
        }
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Current saved preference */}
        {savedSettings && (
          <View style={styles.savedCard}>
            <View style={styles.savedCardHeader}>
              <Ionicons
                name={savedSettings.type === 'terminal' ? 'bus' : 'home'}
                size={20}
                color="#27ae60"
              />
              <Text style={styles.savedCardTitle}>Your Saved Preference</Text>
              <View style={styles.savedBadge}><Text style={styles.savedBadgeText}>Active</Text></View>
            </View>
            {savedSettings.type === 'terminal' ? (
              <>
                <Text style={styles.savedName}>{savedSettings.terminalName}</Text>
                <Text style={styles.savedSub}>{savedSettings.city}, {savedSettings.district}</Text>
                <Text style={styles.savedSub}>{savedSettings.address}</Text>
                {savedSettings.phone ? <Text style={styles.savedPhone}>{savedSettings.phone}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.savedName}>{savedSettings.customAddress}</Text>
                {savedSettings.customCity ? <Text style={styles.savedSub}>{savedSettings.customCity}</Text> : null}
                {savedSettings.notes ? <Text style={styles.savedSub}>Note: {savedSettings.notes}</Text> : null}
              </>
            )}
            <View style={styles.feeRow}>
              <Ionicons name="cash-outline" size={14} color="#27ae60" />
              <Text style={styles.feeText}>Estimated delivery fee: UGX 15,000</Text>
            </View>
          </View>
        )}

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#3498db" />
          <Text style={styles.infoText}>
            Set your preferred delivery location once here. It will be pre-selected when you checkout.
          </Text>
        </View>

        {/* Option 1: Link Bus Terminal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bus-outline" size={20} color="#e74c3c" />
            <Text style={styles.sectionTitle}>Link Bus Terminal Pickup</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Choose a Link Bus station near you. The seller will send your package via Link Bus and you collect it there.
          </Text>

          <TouchableOpacity
            style={[styles.optionBtn, selectedType === 'terminal' && styles.optionBtnActive]}
            onPress={() => setShowTerminalModal(true)}
          >
            <Ionicons name="location-outline" size={18} color={selectedType === 'terminal' ? '#fff' : '#e74c3c'} />
            <Text style={[styles.optionBtnText, selectedType === 'terminal' && { color: '#fff' }]}>
              {selectedTerminal ? `Change: ${selectedTerminal.name}` : 'Select a Link Bus Terminal'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={selectedType === 'terminal' ? '#fff' : '#e74c3c'} />
          </TouchableOpacity>

          {/* Estimated fee */}
          <View style={styles.feeCard}>
            <Text style={styles.feeCardLabel}>Estimated fee via Link Bus</Text>
            <Text style={styles.feeCardValue}>UGX 15,000</Text>
            <Text style={styles.feeCardNote}>Fee may vary per seller's zone settings</Text>
          </View>
        </View>

        {/* Option 2: Custom Address / Home Delivery */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="home-outline" size={20} color="#3498db" />
            <Text style={styles.sectionTitle}>Home / Custom Address</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Enter your home or office address for direct delivery. Only available if the seller covers your area.
          </Text>

          <TouchableOpacity
            style={[styles.optionBtn, { borderColor: '#3498db' }, selectedType === 'address' && { backgroundColor: '#3498db' }]}
            onPress={() => setShowAddressModal(true)}
          >
            <Ionicons name="pencil-outline" size={18} color={selectedType === 'address' ? '#fff' : '#3498db'} />
            <Text style={[styles.optionBtnText, { color: selectedType === 'address' ? '#fff' : '#3498db' }]}>
              {savedSettings?.type === 'address' ? `Change: ${savedSettings.customAddress}` : 'Enter My Address'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={selectedType === 'address' ? '#fff' : '#3498db'} />
          </TouchableOpacity>

          <View style={styles.feeCard}>
            <Text style={styles.feeCardLabel}>Estimated home delivery fee</Text>
            <Text style={styles.feeCardValue}>UGX 15,000</Text>
            <Text style={styles.feeCardNote}>Depends on seller's delivery zones</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Terminal Picker Modal ── */}
      <Modal visible={showTerminalModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTerminalModal(false)} style={styles.backBtn2}>
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Link Bus Terminal</Text>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#aaa" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by city, district or name..."
              value={terminalSearch}
              onChangeText={setTerminalSearch}
              autoFocus
            />
            {terminalSearch ? (
              <TouchableOpacity onPress={() => setTerminalSearch('')}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView style={{ flex: 1 }}>
            {Object.keys(grouped).map(region => (
              <View key={region}>
                <View style={styles.regionHeader}>
                  <Text style={styles.regionLabel}>{region} Region</Text>
                </View>
                {grouped[region].map(t => {
                  const isSelected = selectedTerminal?._id === t._id;
                  return (
                    <TouchableOpacity
                      key={t._id}
                      style={[styles.terminalRow, isSelected && styles.terminalRowSelected]}
                      onPress={() => selectTerminal(t)}
                    >
                      <Ionicons name="bus-outline" size={18} color={isSelected ? '#27ae60' : '#e74c3c'} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.terminalName, isSelected && { color: '#27ae60' }]}>{t.name}</Text>
                        <Text style={styles.terminalSub}>{t.city}, {t.district}</Text>
                        <Text style={styles.terminalAddr}>{t.address}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#27ae60" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            {Object.keys(grouped).length === 0 && (
              <Text style={styles.noResults}>No terminals match your search</Text>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Custom Address Modal ── */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetBox}>
            <Text style={styles.modalTitle}>Enter Your Address</Text>

            <Text style={styles.fieldLabel}>Street / Area *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Plot 12, Kampala Road"
              value={customAddress}
              onChangeText={setCustomAddress}
            />

            <Text style={styles.fieldLabel}>City / Town</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Kampala, Entebbe..."
              value={customCity}
              onChangeText={setCustomCity}
            />

            <Text style={styles.fieldLabel}>Delivery Notes (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="e.g. Near the blue gate, call on arrival..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddressModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCustomAddress}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Address</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  clearBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll: { padding: 16 },

  // Saved card
  savedCard: {
    backgroundColor: '#f0faf4', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#27ae60', marginBottom: 16,
  },
  savedCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  savedCardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#27ae60' },
  savedBadge: { backgroundColor: '#27ae60', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  savedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  savedName: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 3 },
  savedSub: { fontSize: 13, color: '#666', marginBottom: 2 },
  savedPhone: { fontSize: 12, color: '#3498db', marginTop: 2 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  feeText: { fontSize: 13, color: '#27ae60', fontWeight: '600' },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#e8f4fd', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#2980b9', lineHeight: 18 },

  // Section
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  sectionDesc: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 14 },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e74c3c', borderRadius: 10,
    padding: 13, marginBottom: 12,
  },
  optionBtnActive: { backgroundColor: '#e74c3c' },
  optionBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#e74c3c' },

  feeCard: {
    backgroundColor: '#fff9f0', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#f39c12',
  },
  feeCardLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  feeCardValue: { fontSize: 18, fontWeight: '800', color: '#f39c12', marginBottom: 2 },
  feeCardNote: { fontSize: 11, color: '#aaa' },

  // Terminal modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn2: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#333', flex: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 12, backgroundColor: '#f4f6f8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e1e8ed',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  regionHeader: {
    backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  regionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  terminalRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  terminalRowSelected: { backgroundColor: '#f0faf4' },
  terminalName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  terminalSub: { fontSize: 12, color: '#888' },
  terminalAddr: { fontSize: 11, color: '#aaa', marginTop: 1 },
  noResults: { textAlign: 'center', color: '#aaa', padding: 30, fontSize: 14 },

  // Address modal
  bottomSheet: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, paddingBottom: 36,
  },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 12 },
  fieldInput: {
    borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333',
    backgroundColor: '#f8f9fa',
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

