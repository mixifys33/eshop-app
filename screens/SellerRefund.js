import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Image, TextInput, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import API from '../config';

const METHOD_META = {
  mtn:    { label: 'MTN Mobile Money', color: '#f39c12', bg: '#FFF8EC', icon: 'phone-portrait-outline' },
  airtel: { label: 'Airtel Money',     color: '#e74c3c', bg: '#FEF0EF', icon: 'phone-portrait-outline' },
  bank:   { label: 'Bank Transfer',    color: '#3498db', bg: '#EBF5FB', icon: 'business-outline' },
  cod:    { label: 'Cash on Delivery', color: '#27ae60', bg: '#F0FAF4', icon: 'cash-outline' },
};
const getMeta = (m) =>
  METHOD_META[m?.toLowerCase()] || { label: m || 'Unknown', color: '#95a5a6', bg: '#f8f9fa', icon: 'card-outline' };

export default function SellerRefund({ navigation, route }) {
  const { order } = route.params || {};

  const [proofImages, setProofImages]   = useState([]);
  const [verifying, setVerifying]       = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [refundNumber, setRefundNumber] = useState('');
  const [refundRef, setRefundRef]       = useState('');
  const [refundNotes, setRefundNotes]   = useState('');

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
          <Text style={{ color: '#e74c3c', marginTop: 12, fontSize: 15, textAlign: 'center' }}>
            No order data found. Please go back.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: '#3498db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const orderId    = '#' + order._id.toString().slice(-6).toUpperCase();
  const total      = (order.subtotal || 0) + (order.deliveryFee || 0);
  const buyerName  = order.buyerInfo?.name  || order.customerInfo?.fullName || 'Customer';
  const buyerPhone = order.buyerInfo?.phone || order.customerInfo?.phone    || '';
  const buyerEmail = order.buyerInfo?.email || '';
  const meta       = getMeta(order.paymentMethod);
  // The number that SENT the payment = the number that should RECEIVE the refund
  const refundTarget = buyerPhone;

  // ─── Image upload ────────────────────────────────────────────────────────────
  const pickImage = async (source) => {
    if (proofImages.length >= 2) {
      Toast.show({ type: 'info', text1: 'Maximum reached', text2: 'You can only upload 2 screenshots.' });
      return;
    }
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Camera permission required.' }); return; }
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, allowsEditing: true, aspect: [4, 3] });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Gallery permission required.' }); return; }
        result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, allowsEditing: true, aspect: [4, 3], mediaTypes: ['images'] });
      }
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) { Toast.show({ type: 'error', text1: 'Could not read image', text2: 'Please try again.' }); return; }

      const uploadKey = Date.now() + '_' + Math.random();
      setProofImages(prev => [...prev, { uri: asset.uri, uploadKey, uploading: true, url: null, fileId: null }]);
      Toast.show({ type: 'info', text1: 'Uploading screenshot...', text2: 'Please wait.', visibilityTime: 3000 });

      const uploadRes = await fetch(API + '/imagekit/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: asset.base64, fileName: 'refund_' + Date.now() + '.jpg', folder: 'refund_proofs' }),
      });
      const data = await uploadRes.json();

      if (data.success && data.url) {
        setProofImages(prev => {
          const updated = prev.map(img =>
            img.uploadKey === uploadKey
              ? { uri: asset.uri, uploadKey, uploading: false, url: data.url, fileId: data.fileId }
              : img
          );
          const ready = updated.filter(i => i.url);
          if (ready.length === 1) {
            Toast.show({ type: 'success', text1: 'Screenshot 1 uploaded', text2: 'Upload one more screenshot.' });
          }
          if (ready.length >= 2) {
            Toast.show({ type: 'info', text1: 'Both screenshots uploaded', text2: 'AI is verifying your refund...', visibilityTime: 4000 });
            setTimeout(() => verifyRefund(ready.map(i => i.url)), 100);
          }
          return updated;
        });
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: e.message || 'Please try again.' });
      setProofImages(prev => prev.filter(img => !img.uploading));
    }
  };

  const removeImage = (idx) => {
    const img = proofImages[idx];
    if (img?.fileId) {
      fetch(API + '/imagekit/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: img.fileId }),
      }).catch(() => {});
    }
    setProofImages(prev => prev.filter((_, i) => i !== idx));
    setVerifyResult(null);
  };

  // ─── AI verification ─────────────────────────────────────────────────────────
  // Checks that the refund screenshot shows money sent TO the buyer's original number
  const verifyRefund = async (imageUrls) => {
    setVerifying(true);
    setVerifyResult(null);
    Toast.show({ type: 'info', text1: 'Verifying refund...', text2: 'AI is checking your screenshots.', visibilityTime: 5000 });
    try {
      const res = await fetch(API + '/payment-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls,
          expectedAmount: total,
          expectedRecipientName: buyerName,   // refund goes TO the buyer
          expectedPhone: refundTarget,         // must match the buyer's original number
          productNames: 'Refund for order ' + orderId,
          paymentMethod: order.paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const result = data.result;
        setVerifyResult(result);
        if (result.verified === true) {
          Toast.show({ type: 'success', text1: 'Refund verified!', text2: 'Screenshots confirm refund was sent to the correct number.', visibilityTime: 4000 });
        } else if (result.verified === false) {
          Toast.show({ type: 'error', text1: 'Verification failed', text2: result.rejectionReason || 'Screenshots could not be verified.', visibilityTime: 5000 });
        } else {
          Toast.show({ type: 'info', text1: 'Could not verify', text2: 'You can still confirm the refund manually.', visibilityTime: 4000 });
        }
      } else {
        setVerifyResult({ verified: null, summary: 'Verification unavailable. You can still confirm manually.', confidence: 'low' });
        Toast.show({ type: 'info', text1: 'Verification skipped', text2: 'You can still confirm the refund.', visibilityTime: 3000 });
      }
    } catch (e) {
      setVerifyResult({ verified: null, summary: 'Could not verify. You can still confirm manually.', confidence: 'low' });
      Toast.show({ type: 'info', text1: 'Verification unavailable', text2: 'You can still confirm the refund.', visibilityTime: 3000 });
    } finally {
      setVerifying(false);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const doSubmit = async () => {
    const uploaded = proofImages.filter(i => i.url);
    if (uploaded.length < 2) {
      Toast.show({ type: 'error', text1: 'Proof required', text2: 'Upload ' + (2 - uploaded.length) + ' more screenshot(s) of the refund.' });
      return;
    }
    if (!refundNumber.trim()) {
      Toast.show({ type: 'error', text1: 'Missing info', text2: 'Enter the number/account you sent the refund to.' });
      return;
    }
    setSubmitting(true);
    Toast.show({ type: 'info', text1: 'Completing refund...', text2: 'Please wait.', visibilityTime: 6000 });
    try {
      const res = await fetch(API + '/orders/' + order._id + '/complete-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: order.paymentMethod,
          reference: refundRef.trim(),
          notes: refundNotes.trim(),
          refundNumber: refundNumber.trim(),
          proofImages: uploaded.map(i => ({ url: i.url, fileId: i.fileId })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Toast.show({ type: 'success', text1: 'Refund completed!', text2: 'Buyer notified by email. Order marked as refunded.', visibilityTime: 5000 });
        setTimeout(() => navigation.replace('SellerOrders'), 1200);
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: data.error || 'Could not complete refund. Try again.', visibilityTime: 4000 });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };
  //  Render ───────────────────────────────────────────────
  const uploaded = proofImages.filter(i => i.url);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Process Refund</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Warning banner */}
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#e67e22" />
          <Text style={styles.alertText}>
            Send the refund to the <Text style={{ fontWeight: '700' }}>same number that originally paid</Text>, upload 2 proof screenshots, then confirm.
          </Text>
        </View>

        {/* Order summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order to Refund</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Order ID</Text><Text style={styles.infoVal}>{orderId}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer</Text><Text style={styles.infoVal}>{buyerName}</Text></View>
          {!!buyerPhone && <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoVal}>{buyerPhone}</Text></View>}
          {!!buyerEmail && <View style={styles.infoRow}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoVal}>{buyerEmail}</Text></View>}
          <View style={[styles.infoRow, { marginTop: 6 }]}>
            <Text style={styles.infoLabel}>Refund Amount</Text>
            <Text style={[styles.infoVal, { color: '#e74c3c', fontWeight: '800', fontSize: 18 }]}>UGX {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Where to send refund */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Send Refund To</Text>
          <Text style={styles.cardSubtitle}>
            Customer paid via{' '}
            <Text style={{ fontWeight: '700', color: meta.color }}>{meta.label}</Text>.
            {' '}Send the refund back to the same number below.
          </Text>

          <View style={[styles.methodBox, { borderColor: meta.color, backgroundColor: meta.bg }]}>
            <View style={[styles.methodIcon, { backgroundColor: meta.color }]}>
              <Ionicons name={meta.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodLabel, { color: meta.color }]}>{meta.label}</Text>
              <Text style={styles.methodPhone}>{refundTarget || 'No phone on record'}</Text>
              <Text style={styles.methodName}>{buyerName}</Text>
            </View>
            <Ionicons name="arrow-back-circle" size={28} color={meta.color} />
          </View>

          {order.paymentMethod !== 'cod' && (
            <View style={[styles.instructionBox, { borderLeftColor: meta.color }]}>
              <Text style={styles.instructionTitle}>How to send the refund</Text>
              {order.paymentMethod === 'mtn' && (
                <>
                  <Text style={styles.step}>1. Dial <Text style={styles.hl}>*165#</Text> and select Send Money</Text>
                  <Text style={styles.step}>2. Enter number: <Text style={styles.hl}>{refundTarget}</Text></Text>
                  <Text style={styles.step}>3. Amount: <Text style={styles.hl}>UGX {total.toLocaleString()}</Text></Text>
                  <Text style={styles.step}>4. Reference: <Text style={styles.hl}>Refund {orderId}</Text></Text>
                  <Text style={styles.step}>5. Confirm and take a screenshot</Text>
                </>
              )}
              {order.paymentMethod === 'airtel' && (
                <>
                  <Text style={styles.step}>1. Dial <Text style={styles.hl}>*185#</Text> and select Send Money</Text>
                  <Text style={styles.step}>2. Enter number: <Text style={styles.hl}>{refundTarget}</Text></Text>
                  <Text style={styles.step}>3. Amount: <Text style={styles.hl}>UGX {total.toLocaleString()}</Text></Text>
                  <Text style={styles.step}>4. Reference: <Text style={styles.hl}>Refund {orderId}</Text></Text>
                  <Text style={styles.step}>5. Confirm and take a screenshot</Text>
                </>
              )}
              {order.paymentMethod === 'bank' && (
                <>
                  <Text style={styles.step}>1. Log in to your bank app or visit a branch</Text>
                  <Text style={styles.step}>2. Transfer <Text style={styles.hl}>UGX {total.toLocaleString()}</Text> to the customer</Text>
                  <Text style={styles.step}>3. Reference: <Text style={styles.hl}>Refund {orderId}</Text></Text>
                  <Text style={styles.step}>4. Screenshot the confirmation</Text>
                </>
              )}
              <View style={styles.warningRow}>
                <Ionicons name="warning-outline" size={14} color="#e67e22" />
                <Text style={styles.warningText}>
                  Only send to: <Text style={styles.hl}>{refundTarget}</Text>  this is the number that originally paid.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Refund details form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Refund Details</Text>
          <Text style={styles.fieldLabel}>Number / Account Refund Was Sent To *</Text>
          <TextInput
            style={styles.input}
            placeholder={refundTarget || '0771234567'}
            value={refundNumber}
            onChangeText={setRefundNumber}
            keyboardType="phone-pad"
          />
          <Text style={styles.fieldLabel}>Transaction Reference / ID (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. TXN123456789"
            value={refundRef}
            onChangeText={setRefundRef}
          />
          <Text style={styles.fieldLabel}>Note to Customer (optional)</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder="Any message for the customer..."
            value={refundNotes}
            onChangeText={setRefundNotes}
            multiline
          />
        </View>

        {/* Proof upload */}
        <View style={styles.card}>
          <View style={styles.proofHeader}>
            <Ionicons name="camera-outline" size={20} color="#9b59b6" />
            <Text style={styles.proofTitle}>Upload Refund Proof</Text>
            <View style={[styles.proofCountBadge, uploaded.length >= 2 && styles.proofCountDone]}>
              <Text style={styles.proofCountText}>{uploaded.length}/2</Text>
            </View>
          </View>
          <Text style={styles.proofSubtitle}>
            Upload 2 screenshots of the refund confirmation. AI will verify the recipient number matches the customer.
          </Text>

          {proofImages.length > 0 && (
            <View style={styles.proofGrid}>
              {proofImages.map((img, idx) => (
                <View key={idx} style={styles.proofThumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.proofThumb} resizeMode="cover" />
                  {img.uploading ? (
                    <View style={styles.proofOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.proofOverlayText}>Uploading...</Text>
                    </View>
                  ) : img.url ? (
                    <View style={styles.proofDoneOverlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                    </View>
                  ) : null}
                  {!img.uploading && (
                    <TouchableOpacity style={styles.proofRemoveBtn} onPress={() => removeImage(idx)}>
                      <Ionicons name="close-circle" size={22} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {proofImages.length < 2 && (
            <View style={styles.proofBtnRow}>
              <TouchableOpacity style={styles.proofPickBtn} onPress={() => pickImage('gallery')} disabled={proofImages.some(i => i.uploading)}>
                <Ionicons name="images-outline" size={20} color="#9b59b6" />
                <Text style={styles.proofPickText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.proofPickBtn} onPress={() => pickImage('camera')} disabled={proofImages.some(i => i.uploading)}>
                <Ionicons name="camera-outline" size={20} color="#9b59b6" />
                <Text style={styles.proofPickText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.proofHint}>
            {uploaded.length === 0 ? 'Add screenshot 1 of 2' : uploaded.length === 1 ? 'Add screenshot 2 of 2' : 'Both screenshots uploaded'}
          </Text>

          {/* AI verification result */}
          {verifying && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator size="small" color="#9b59b6" />
              <Text style={styles.verifyingText}>AI is verifying your refund screenshots...</Text>
            </View>
          )}

          {!verifying && verifyResult && (
            <View style={[
              styles.verifyCard,
              verifyResult.verified === true  ? styles.verifyPass :
              verifyResult.verified === false ? styles.verifyFail : styles.verifyWarn,
            ]}>
              <View style={styles.verifyHeaderRow}>
                <Ionicons
                  name={verifyResult.verified === true ? 'checkmark-circle' : verifyResult.verified === false ? 'close-circle' : 'alert-circle'}
                  size={20}
                  color={verifyResult.verified === true ? '#27ae60' : verifyResult.verified === false ? '#e74c3c' : '#f39c12'}
                />
                <Text style={[styles.verifyTitle, {
                  color: verifyResult.verified === true ? '#27ae60' : verifyResult.verified === false ? '#e74c3c' : '#f39c12',
                }]}>
                  {verifyResult.verified === true ? 'Refund Verified' : verifyResult.verified === false ? 'Verification Failed' : 'Could Not Verify'}
                </Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>{verifyResult.confidence || 'low'}</Text>
                </View>
              </View>
              <Text style={styles.verifySummary}>{verifyResult.summary}</Text>
              {!!verifyResult.rejectionReason && <Text style={styles.verifyRejection}>{verifyResult.rejectionReason}</Text>}
              {verifyResult.checks && (
                <View style={styles.checksGrid}>
                  {Object.entries(verifyResult.checks).map(([key, val]) => (
                    <View key={key} style={styles.checkRow}>
                      <Ionicons name={val.pass ? 'checkmark-circle' : 'close-circle'} size={14} color={val.pass ? '#27ae60' : '#e74c3c'} />
                      <Text style={styles.checkLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                      {val.found ? <Text style={styles.checkFound} numberOfLines={1}>{val.found}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
              {verifyResult.verified === false && (
                <View style={styles.verifyActions}>
                  <TouchableOpacity
                    style={styles.reuploadBtn}
                    onPress={() => { setProofImages([]); setVerifyResult(null); Toast.show({ type: 'info', text1: 'Screenshots cleared', text2: 'Upload new refund proof.' }); }}
                  >
                    <Ionicons name="refresh-outline" size={15} color="#e74c3c" />
                    <Text style={styles.reuploadText}>Re-upload</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.proceedAnywayBtn} onPress={doSubmit}>
                    <Ionicons name="checkmark-outline" size={15} color="#fff" />
                    <Text style={styles.proceedAnywayText}>Confirm Anyway</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Total row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Refund Amount</Text>
          <Text style={styles.totalValue}>UGX {total.toLocaleString()}</Text>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, (submitting || verifying) && styles.confirmBtnDisabled]}
          onPress={doSubmit}
          disabled={submitting || verifying}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.confirmText}>
                  {uploaded.length < 2
                    ? 'Upload proof (' + uploaded.length + '/2) then confirm'
                    : 'Confirm Refund Completed'}
                </Text>
              </>
            )
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'android' ? 40 : 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2c3e50' },
  scroll: { padding: 16 },

  alertBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fef9ec', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f39c1240' },
  alertText: { flex: 1, fontSize: 13, color: '#e67e22', lineHeight: 19 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#2c3e50', marginBottom: 12 },
  cardSubtitle: { fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 18 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: '#888' },
  infoVal: { fontSize: 13, fontWeight: '600', color: '#2c3e50', flex: 1, textAlign: 'right' },

  methodBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 12 },
  methodIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  methodLabel: { fontSize: 13, fontWeight: '700' },
  methodPhone: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginTop: 3 },
  methodName: { fontSize: 12, color: '#888', marginTop: 2 },

  instructionBox: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 4, borderLeftWidth: 3 },
  instructionTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  step: { fontSize: 13, color: '#555', marginBottom: 5, lineHeight: 20 },
  hl: { fontWeight: '700', color: '#1a1a1a' },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fef9ec', borderRadius: 8, padding: 8, marginTop: 8 },
  warningText: { flex: 1, fontSize: 12, color: '#e67e22', lineHeight: 18 },

  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e1e8ed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#f8f9fa' },

  proofHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  proofTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#333' },
  proofCountBadge: { backgroundColor: '#f0f0f0', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  proofCountDone: { backgroundColor: '#e8f8f0' },
  proofCountText: { fontSize: 12, fontWeight: '700', color: '#555' },
  proofSubtitle: { fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 18 },
  proofGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  proofThumbWrap: { width: 120, height: 120, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  proofThumb: { width: '100%', height: '100%' },
  proofOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  proofOverlayText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  proofDoneOverlay: { position: 'absolute', bottom: 6, right: 6 },
  proofRemoveBtn: { position: 'absolute', top: 4, right: 4 },
  proofBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  proofPickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#9b59b6', backgroundColor: '#faf5ff' },
  proofPickText: { fontSize: 13, color: '#9b59b6', fontWeight: '600' },
  proofHint: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 4 },

  verifyingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, backgroundColor: '#f5f0ff', borderRadius: 8 },
  verifyingText: { fontSize: 13, color: '#9b59b6', flex: 1 },
  verifyCard: { marginTop: 12, borderRadius: 10, padding: 12, borderWidth: 1 },
  verifyPass: { backgroundColor: '#f0faf4', borderColor: '#27ae60' },
  verifyFail: { backgroundColor: '#fef0ef', borderColor: '#e74c3c' },
  verifyWarn: { backgroundColor: '#fef9ec', borderColor: '#f39c12' },
  verifyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  verifyTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  confidenceBadge: { backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  confidenceText: { fontSize: 10, color: '#555', fontWeight: '600', textTransform: 'uppercase' },
  verifySummary: { fontSize: 13, color: '#444', lineHeight: 18, marginBottom: 4 },
  verifyRejection: { fontSize: 12, color: '#e74c3c', marginTop: 4, lineHeight: 17 },
  checksGrid: { marginTop: 8, gap: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkLabel: { fontSize: 12, color: '#555', textTransform: 'capitalize', flex: 1 },
  checkFound: { fontSize: 11, color: '#888', maxWidth: 120 },
  verifyActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reuploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#e74c3c', backgroundColor: '#fff' },
  reuploadText: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },
  proceedAnywayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e74c3c' },
  proceedAnywayText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#e74c3c' },

  confirmBtn: { backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 10, elevation: 3, shadowColor: '#27ae60', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  confirmBtnDisabled: { backgroundColor: '#95a5a6' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

