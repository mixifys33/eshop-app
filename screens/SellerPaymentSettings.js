import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';

import API_BASE from '../constants/api';
const API = API_BASE;

const BANKS = [
  'Stanbic Bank Uganda', 'Centenary Bank', 'DFCU Bank', 'Absa Bank Uganda',
  'Standard Chartered Uganda', 'Equity Bank Uganda', 'PostBank Uganda',
  'Housing Finance Bank', 'NC Bank Uganda', 'Cairo Bank Uganda',
  'Finance Trust Bank', 'Tropical Bank', 'Opportunity Bank Uganda',
];

export default function SellerPaymentSettings({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sellerId, setSellerId] = useState(null);
  const { toast, showSuccess, showError, showInfo, showWarning, hideToast } = useToast();

  // MTN MoMo
  const [mtnName, setMtnName] = useState('');
  const [mtnNumber, setMtnNumber] = useState('');

  // Airtel Money
  const [airtelName, setAirtelName] = useState('');
  const [airtelNumber, setAirtelNumber] = useState('');

  // Bank
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  // Preferred
  const [preferredMethod, setPreferredMethod] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      showInfo('Loading your payment settings...');
      const raw = await AsyncStorage.getItem('currentSeller');
      if (!raw) {
        showError('Session expired. Please log in again.');
        setTimeout(() => navigation.goBack(), 1500);
        return;
      }
      const seller = JSON.parse(raw);
      const id = seller.id || seller._id;
      setSellerId(id);

      const res = await fetch(`${API}/sellers/payment/${id}`);
      if (res.ok) {
        const { payment } = await res.json();
        if (payment) {
          setMtnName(payment.mtnName || '');
          setMtnNumber(payment.mtnNumber || '');
          setAirtelName(payment.airtelName || '');
          setAirtelNumber(payment.airtelNumber || '');
          setBankName(payment.bankName || '');
          setBankAccountName(payment.bankAccountName || '');
          setBankAccountNumber(payment.bankAccountNumber || '');
          setBankBranch(payment.bankBranch || '');
          setPreferredMethod(payment.preferredMethod || '');

          const hasAny = payment.mtnNumber || payment.airtelNumber || payment.bankAccountNumber;
          if (hasAny) {
            showSuccess('Payment settings loaded');
          } else {
            showInfo('No payment methods yet. Fill in at least one below.');
          }
        }
      } else {
        showWarning('Could not load saved settings. You can still add new ones.');
      }
    } catch (e) {
      showError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreferred = (method) => {
    setPreferredMethod(method);
    const labels = { mtn: 'MTN Mobile Money', airtel: 'Airtel Money', bank: 'Bank Transfer', all: 'All methods' };
    showInfo(`${labels[method]} set as preferred`);
  };

  const handleSelectBank = (bank) => {
    setBankName(bank);
    setShowBankPicker(false);
    showInfo(`${bank} selected`);
  };

  const save = async () => {
    const hasMtn = mtnNumber.trim();
    const hasAirtel = airtelNumber.trim();
    const hasBank = bankAccountNumber.trim();

    if (!hasMtn && !hasAirtel && !hasBank) {
      showError('Add at least one payment method — MTN, Airtel, or Bank.');
      return;
    }
    if (hasMtn && hasMtn.replace(/\s/g, '').length < 10) {
      showWarning('MTN number must be at least 10 digits.');
      return;
    }
    if (hasAirtel && hasAirtel.replace(/\s/g, '').length < 10) {
      showWarning('Airtel number must be at least 10 digits.');
      return;
    }
    if (hasBank && !bankAccountName.trim()) {
      showWarning('Enter the account holder name for your bank account.');
      return;
    }
    if (hasBank && !bankName) {
      showWarning('Please select your bank name.');
      return;
    }
    if (!preferredMethod) {
      showWarning('Select a preferred payment method so buyers know how to pay you.');
      return;
    }

    try {
      setSaving(true);
      showInfo('Saving and syncing to all your products...');

      const res = await fetch(`${API}/sellers/payment/${sellerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mtnName, mtnNumber, airtelName, airtelNumber,
          bankName, bankAccountName, bankAccountNumber, bankBranch,
          preferredMethod,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showSuccess(`Saved! Payment methods synced to ${data.productsUpdated} product(s).`);
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        showError('Could not save. Please try again.');
      }
    } catch (e) {
      showError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.center}><ActivityIndicator size="large" color="#27ae60" /></View>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} duration={toast.duration} onHide={hideToast} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Settings</Text>
        <TouchableOpacity onPress={save} style={styles.saveBtn} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#3498db" />
          <Text style={styles.infoText}>
            These payment details are shown to buyers at checkout and automatically synced to all your products.
          </Text>
        </View>

        {/* Preferred Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Payment Method</Text>
          <Text style={styles.sectionDesc}>Buyers will see this highlighted at checkout</Text>
          <View style={styles.methodRow}>
            {[
              { key: 'mtn', label: 'MTN MoMo', icon: 'phone-portrait-outline', color: '#f39c12' },
              { key: 'airtel', label: 'Airtel Money', icon: 'phone-portrait-outline', color: '#e74c3c' },
              { key: 'bank', label: 'Bank', icon: 'business-outline', color: '#3498db' },
              { key: 'all', label: 'All', icon: 'checkmark-done-outline', color: '#27ae60' },
            ].map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.methodCard, preferredMethod === m.key && { borderColor: m.color, backgroundColor: m.color + '15' }]}
                onPress={() => handleSelectPreferred(m.key)}
              >
                <Ionicons name={m.icon} size={20} color={preferredMethod === m.key ? m.color : '#ccc'} />
                <Text style={[styles.methodLabel, preferredMethod === m.key && { color: m.color }]}>{m.label}</Text>
                {preferredMethod === m.key && <Ionicons name="checkmark-circle" size={14} color={m.color} style={styles.checkBadge} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* MTN Mobile Money */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.networkBadge, { backgroundColor: '#FFF3CD' }]}>
              <Text style={[styles.networkBadgeText, { color: '#f39c12' }]}>MTN</Text>
            </View>
            <Text style={styles.sectionTitle}>MTN Mobile Money</Text>
          </View>
          <Text style={styles.fieldLabel}>Account Name</Text>
          <TextInput style={styles.input} placeholder="Name registered on MTN MoMo" value={mtnName} onChangeText={setMtnName} />
          <Text style={styles.fieldLabel}>MTN MoMo Number</Text>
          <TextInput style={styles.input} placeholder="e.g. 0771234567" keyboardType="phone-pad" value={mtnNumber} onChangeText={setMtnNumber} />
        </View>

        {/* Airtel Money */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.networkBadge, { backgroundColor: '#FDECEA' }]}>
              <Text style={[styles.networkBadgeText, { color: '#e74c3c' }]}>Airtel</Text>
            </View>
            <Text style={styles.sectionTitle}>Airtel Money</Text>
          </View>
          <Text style={styles.fieldLabel}>Account Name</Text>
          <TextInput style={styles.input} placeholder="Name registered on Airtel Money" value={airtelName} onChangeText={setAirtelName} />
          <Text style={styles.fieldLabel}>Airtel Money Number</Text>
          <TextInput style={styles.input} placeholder="e.g. 0701234567" keyboardType="phone-pad" value={airtelNumber} onChangeText={setAirtelNumber} />
        </View>

        {/* Bank Transfer */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={20} color="#3498db" />
            <Text style={styles.sectionTitle}>Bank Transfer</Text>
          </View>

          <Text style={styles.fieldLabel}>Bank Name</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowBankPicker(!showBankPicker)}>
            <Text style={[styles.pickerBtnText, !bankName && { color: '#aaa' }]}>{bankName || 'Select bank...'}</Text>
            <Ionicons name={showBankPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#aaa" />
          </TouchableOpacity>
          {showBankPicker && (
            <View style={styles.bankList}>
              {BANKS.map(b => (
                <TouchableOpacity key={b} style={[styles.bankRow, bankName === b && styles.bankRowSelected]} onPress={() => handleSelectBank(b)}>
                  <Text style={[styles.bankRowText, bankName === b && { color: '#3498db', fontWeight: '700' }]}>{b}</Text>
                  {bankName === b && <Ionicons name="checkmark" size={16} color="#3498db" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>Account Holder Name</Text>
          <TextInput style={styles.input} placeholder="Name on bank account" value={bankAccountName} onChangeText={setBankAccountName} />
          <Text style={styles.fieldLabel}>Account Number</Text>
          <TextInput style={styles.input} placeholder="Bank account number" keyboardType="numeric" value={bankAccountNumber} onChangeText={setBankAccountNumber} />
          <Text style={styles.fieldLabel}>Branch (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. Kampala Main Branch" value={bankBranch} onChangeText={setBankBranch} />
        </View>

        <TouchableOpacity style={styles.saveBottomBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveBottomBtnText}>Save & Sync to Products</Text></>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} duration={toast.duration} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#27ae60', borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 16 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#e8f4fd', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, color: '#2980b9', lineHeight: 18 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#888', marginBottom: 12 },
  networkBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  networkBadgeText: { fontSize: 12, fontWeight: '800' },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodCard: { width: '47%', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e1e8ed', borderRadius: 10, paddingVertical: 12, gap: 4, position: 'relative' },
  methodLabel: { fontSize: 11, fontWeight: '600', color: '#aaa', textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 5, right: 5 },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#f8f9fa' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#f8f9fa' },
  pickerBtnText: { fontSize: 14, color: '#333' },
  bankList: { borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8, marginTop: 4, backgroundColor: '#fff', maxHeight: 220, overflow: 'hidden' },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  bankRowSelected: { backgroundColor: '#f0f8ff' },
  bankRowText: { fontSize: 14, color: '#333' },
  saveBottomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27ae60', borderRadius: 14, paddingVertical: 16, gap: 10, elevation: 3, shadowColor: '#27ae60', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBottomBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

