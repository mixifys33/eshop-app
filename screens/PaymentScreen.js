import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import API from '../config';

const METHODS = {
  mtn:    { label: 'MTN Mobile Money', color: '#f39c12', bg: '#FFF8EC', icon: 'phone-portrait-outline' },
  airtel: { label: 'Airtel Money',     color: '#e74c3c', bg: '#FEF0EF', icon: 'phone-portrait-outline' },
  bank:   { label: 'Bank Transfer',    color: '#3498db', bg: '#EBF5FB', icon: 'business-outline'       },
};

export default function PaymentScreen({ navigation, route }) {
  const { orderPayload = [], sellerPayments = {}, selectedPayment = {}, total = 0 } = route.params || {};

  const [placing, setPlacing] = useState(false);
  const [chosenPayment, setChosenPayment] = useState({ ...selectedPayment });
  const [expandedSeller, setExpandedSeller] = useState(null);

  // Proof images: [{ uri, uploading, url, fileId }]
  const [proofImages, setProofImages] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // null | { verified, confidence, checks, summary, rejectionReason }

  const getDetail = (sid, key) => {
    const p = sellerPayments[sid] || {};
    if (key === 'mtn')    return { number: p.mtnNumber,        name: p.mtnName,         extra: null };
    if (key === 'airtel') return { number: p.airtelNumber,     name: p.airtelName,      extra: null };
    if (key === 'bank')   return { number: p.bankAccountNumber, name: p.bankAccountName, extra: [p.bankName, p.bankBranch].filter(Boolean).join(' • ') };
    return {};
  };

  // Get all product names across all orders for the "reason" field
  const allProductNames = orderPayload
    .flatMap(o => o.items || [])
    .map(i => i.name)
    .filter(Boolean)
    .join(', ');

  const pickImage = async (source) => {
    if (proofImages.length >= 2) {
      Toast.show({ type: 'info', text1: 'Maximum reached', text2: 'You can only upload 2 proof images.' });
      return;
    }

    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Camera permission is required.' });
          return;
        }
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, allowsEditing: true, aspect: [4, 3] });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Gallery permission is required.' });
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, allowsEditing: true, aspect: [4, 3], mediaTypes: ['images'] });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Toast.show({ type: 'error', text1: 'Could not read image', text2: 'Please try again.' });
        return;
      }

      const uploadKey = `${Date.now()}_${Math.random()}`;

      setProofImages(prev => {
        if (prev.length >= 2) return prev;
        return [...prev, { uri: asset.uri, uploadKey, uploading: true, url: null, fileId: null }];
      });

      Toast.show({ type: 'info', text1: 'Uploading screenshot...', text2: 'Please wait while we upload your proof image.', visibilityTime: 3000 });

      const uploadRes = await fetch(`${API}/imagekit/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: asset.base64,
          fileName: `proof_${Date.now()}.jpg`,
          folder: 'payment_proofs',
        }),
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
            Toast.show({ type: 'success', text1: 'Screenshot 1 uploaded', text2: 'Now upload your second screenshot.' });
          }
          if (ready.length >= 2) {
            Toast.show({ type: 'info', text1: 'Both screenshots uploaded', text2: 'AI is now verifying your payment...', visibilityTime: 4000 });
            setTimeout(() => verifyPayment(ready.map(i => i.url)), 100);
          }
          return updated;
        });
      } else {
        throw new Error(data.message || data.error || 'Upload failed');
      }
    } catch (e) {
      console.error('Image pick/upload error:', e);
      Toast.show({ type: 'error', text1: 'Upload failed', text2: e.message || 'Could not upload image. Please try again.' });
      setProofImages(prev => prev.filter(img => !img.uploading));
    }
  };

  const removeImage = async (idx) => {
    const img = proofImages[idx];
    // Delete from ImageKit if already uploaded
    if (img?.fileId) {
      try {
        await fetch(`${API}/imagekit/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: img.fileId }),
        });
      } catch (e) {
        console.log('ImageKit delete failed (non-critical):', e.message);
      }
    }
    setProofImages(prev => prev.filter((_, i) => i !== idx));
    setVerifyResult(null); // reset verification when image removed
  };

  const verifyPayment = async (imageUrls) => {
    setVerifying(true);
    setVerifyResult(null);
    Toast.show({ type: 'info', text1: 'Verifying payment...', text2: 'AI is checking your screenshots.', visibilityTime: 5000 });
    try {
      const firstOrder = orderPayload[0] || {};
      const sid = firstOrder.sellerId;
      const p = sellerPayments[sid] || {};
      const method = chosenPayment[sid];
      const expectedPhone = method === 'mtn' ? p.mtnNumber : method === 'airtel' ? p.airtelNumber : p.bankAccountNumber;
      const expectedName = method === 'mtn' ? p.mtnName : method === 'airtel' ? p.airtelName : p.bankAccountName;
      const expectedAmount = orderPayload.reduce((s, o) => s + (o.subtotal || 0) + (o.deliveryFee || 0), 0);

      const res = await fetch(`${API}/payment-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls,
          expectedAmount,
          expectedRecipientName: expectedName,
          expectedPhone,
          productNames: allProductNames,
          paymentMethod: method,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const result = data.result;
        setVerifyResult(result);
        if (result.verified === true) {
          Toast.show({ type: 'success', text1: 'Payment verified!', text2: 'Your payment looks good. You can now confirm your order.', visibilityTime: 4000 });
        } else if (result.verified === false) {
          Toast.show({ type: 'error', text1: 'Verification failed', text2: result.rejectionReason || 'Screenshots could not be verified. You can still proceed.', visibilityTime: 5000 });
        } else {
          Toast.show({ type: 'info', text1: 'Could not verify', text2: 'Verification was inconclusive. You can still proceed.', visibilityTime: 4000 });
        }
      } else {
        setVerifyResult({ verified: null, summary: data.message || 'Verification failed', confidence: 'low' });
        Toast.show({ type: 'info', text1: 'Verification skipped', text2: 'You can still proceed to confirm your order.', visibilityTime: 4000 });
      }
    } catch (e) {
      console.error('Verify error:', e);
      setVerifyResult({ verified: null, summary: 'Could not verify. You can still proceed.', confidence: 'low' });
      Toast.show({ type: 'info', text1: 'Verification unavailable', text2: 'You can still proceed to confirm your order.', visibilityTime: 4000 });
    } finally {
      setVerifying(false);
    }
  };

  const showPickerOptions = () => {
    // no-op — replaced by inline buttons
  };

  const confirmOrder = async () => {
    if (!orderPayload || orderPayload.length === 0) {
      Toast.show({ type: 'error', text1: 'No order data', text2: 'Please go back and try again.' });
      return;
    }
    const uploaded = proofImages.filter(img => img.url);
    if (uploaded.length < 2) {
      Toast.show({ type: 'error', text1: 'Proof required', text2: `Please upload ${2 - uploaded.length} more screenshot(s) of your payment.` });
      return;
    }
    // If verification explicitly failed, warn but allow proceeding — no blocking Alert
    // The inline verifyCard already shows the failure with a "Proceed Anyway" button
    // So here we just proceed regardless
    submitOrder(uploaded);
  };

  const submitOrder = async (uploaded) => {
    setPlacing(true);
    Toast.show({ type: 'info', text1: 'Placing your order...', text2: 'Please wait, do not close the app.', visibilityTime: 8000 });
    try {
      let buyerInfo = {};
      try {
        let raw = await AsyncStorage.getItem('currentUser');
        if (!raw) raw = await AsyncStorage.getItem('userData');
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

      const proofPayload = uploaded.map(img => ({ url: img.url, fileId: img.fileId }));

      console.log('Placing orders, payload count:', orderPayload.length);

      const results = await Promise.all(orderPayload.map(async (body) => {
        const sid = body.sellerId;
        const finalBody = {
          ...body,
          paymentMethod: chosenPayment[sid] || chosenPayment['unknown'] || body.paymentMethod,
          buyerInfo,
          proofImages: proofPayload,
          paymentStatus: 'submitted',
        };
        console.log('Posting order for seller:', sid, 'method:', finalBody.paymentMethod);
        try {
          const res = await fetch(`${API}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody),
          });
          const data = await res.json();
          console.log('Order response:', res.status, JSON.stringify(data));
          if (!res.ok) {
            console.error('Order creation failed:', data);
            Toast.show({ type: 'error', text1: 'Order failed', text2: data.detail || data.error || 'Could not create order. Please try again.' });
          }
          return res.ok;
        } catch (fetchErr) {
          console.error('Order fetch error:', fetchErr.message);
          Toast.show({ type: 'error', text1: 'Network error', text2: 'Could not reach server. Check your connection.' });
          return false;
        }
      }));

      console.log('Order results:', results);

      if (results.every(Boolean)) {
        await AsyncStorage.removeItem('cart');
        Toast.show({ type: 'success', text1: 'Order placed!', text2: 'Your order has been confirmed successfully.', visibilityTime: 3000 });
        setTimeout(() => navigation.replace('OrderSuccess', { total, orderCount: orderPayload.length }), 800);
      } else if (results.some(Boolean)) {
        await AsyncStorage.removeItem('cart');
        Toast.show({ type: 'info', text1: 'Partially placed', text2: 'Some orders were placed. Check your orders for details.', visibilityTime: 4000 });
        setTimeout(() => navigation.replace('UserOrders'), 1200);
      } else {
        Toast.show({ type: 'error', text1: 'Order failed', text2: 'None of your orders could be placed. Please try again.', visibilityTime: 5000 });
      }
    } catch (e) {
      console.error('submitOrder error:', e);
      Toast.show({ type: 'error', text1: 'Something went wrong', text2: e.message || 'Could not place order. Please try again.' });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#3498db" />
          <Text style={styles.infoText}>
            Follow the details below, upload 2 proof screenshots, then confirm your order.
          </Text>
        </View>

        {/* Debug: show orderPayload status */}
        {orderPayload.length === 0 && (
          <View style={[styles.infoBanner, { backgroundColor: '#fdecea' }]}>
            <Ionicons name="alert-circle-outline" size={18} color="#e74c3c" />
            <Text style={[styles.infoText, { color: '#e74c3c' }]}>
              No order data received. Please go back and try again.
            </Text>
          </View>
        )}

        {orderPayload.map((order) => {
          const sid = order.sellerId;
          const method = chosenPayment[sid];
          const meta = METHODS[method];
          const detail = getDetail(sid, method);
          const p = sellerPayments[sid] || {};
          const isExpanded = expandedSeller === sid;
          const amountDue = (order.subtotal || 0) + (order.deliveryFee || 0);
          const options = [p.mtnNumber && 'mtn', p.airtelNumber && 'airtel', p.bankAccountNumber && 'bank'].filter(Boolean);

          return (
            <View key={sid || 'unknown'} style={styles.card}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount Due</Text>
                <Text style={styles.amountValue}>UGX {amountDue.toLocaleString()}</Text>
              </View>

              {/* Selected method */}
              {meta && detail.number ? (
                <View style={[styles.methodCard, { borderColor: meta.color, backgroundColor: meta.bg }]}>
                  <View style={[styles.methodIcon, { backgroundColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={22} color="#fff" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={[styles.methodLabel, { color: meta.color }]}>{meta.label}</Text>
                    {detail.name ? <Text style={styles.methodName}>{detail.name}</Text> : null}
                    <Text style={styles.methodNumber}>{detail.number}</Text>
                    {detail.extra ? <Text style={styles.methodExtra}>{detail.extra}</Text> : null}
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={meta.color} />
                </View>
              ) : (
                <View style={[styles.methodCard, { borderColor: '#eee' }]}>
                  <Ionicons name="help-circle-outline" size={22} color="#aaa" />
                  <Text style={{ color: '#aaa', marginLeft: 10, fontSize: 13 }}>No payment method selected</Text>
                </View>
              )}

              {/* Instructions for mobile money */}
              {meta && method !== 'bank' && (
                <View style={[styles.instructionBox, { borderLeftColor: meta.color }]}>
                  <Text style={styles.instructionTitle}>How to pay via {meta.label}</Text>
                  <Text style={styles.step}>1. Dial <Text style={styles.hl}>*165#</Text></Text>
                  <Text style={styles.step}>2. Select <Text style={styles.hl}>"Send Money"</Text></Text>
                  <Text style={styles.step}>3. Enter number: <Text style={styles.hl}>{detail.number}</Text></Text>
                  <Text style={styles.step}>4. Enter amount: <Text style={styles.hl}>UGX {amountDue.toLocaleString()}</Text></Text>
                  <Text style={styles.step}>5. For reason/reference, enter: <Text style={styles.hl}>{allProductNames || 'Product payment'}</Text></Text>
                  <Text style={styles.step}>6. Confirm and send</Text>
                  {detail.name ? (
                    <View style={styles.senderWarning}>
                      <Ionicons name="warning-outline" size={14} color="#e67e22" />
                      <Text style={styles.senderWarningText}>
                        Only confirm if the recipient name shown is exactly: <Text style={styles.hl}>{detail.name}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Instructions for bank */}
              {meta && method === 'bank' && (
                <View style={[styles.instructionBox, { borderLeftColor: meta.color }]}>
                  <Text style={styles.instructionTitle}>Bank Transfer Details</Text>
                  {p.bankName ? <Text style={styles.step}>Bank: <Text style={styles.hl}>{p.bankName}</Text></Text> : null}
                  {p.bankAccountName ? <Text style={styles.step}>Account Name: <Text style={styles.hl}>{p.bankAccountName}</Text></Text> : null}
                  <Text style={styles.step}>Account No: <Text style={styles.hl}>{p.bankAccountNumber}</Text></Text>
                  {p.bankBranch ? <Text style={styles.step}>Branch: <Text style={styles.hl}>{p.bankBranch}</Text></Text> : null}
                  <Text style={styles.step}>Amount: <Text style={styles.hl}>UGX {amountDue.toLocaleString()}</Text></Text>
                  <Text style={styles.step}>Reference/Narration: <Text style={styles.hl}>{allProductNames || 'Product payment'}</Text></Text>
                  {p.bankAccountName ? (
                    <View style={styles.senderWarning}>
                      <Ionicons name="warning-outline" size={14} color="#e67e22" />
                      <Text style={styles.senderWarningText}>
                        Ensure account name matches exactly: <Text style={styles.hl}>{p.bankAccountName}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Switch method */}
              {options.length > 1 && (
                <TouchableOpacity style={styles.switchBtn} onPress={() => setExpandedSeller(isExpanded ? null : sid)}>
                  <Ionicons name="swap-horizontal-outline" size={15} color="#3498db" />
                  <Text style={styles.switchText}>{isExpanded ? 'Hide options' : 'Switch payment method'}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color="#3498db" />
                </TouchableOpacity>
              )}

              {isExpanded && (
                <View style={styles.optionsList}>
                  {options.map(key => {
                    const m = METHODS[key];
                    const d = getDetail(sid, key);
                    const isSel = chosenPayment[sid] === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.optionRow, isSel && { borderColor: m.color, backgroundColor: m.color + '12' }]}
                        onPress={() => { setChosenPayment(prev => ({ ...prev, [sid]: key })); setExpandedSeller(null); }}
                      >
                        <View style={[styles.radio, isSel && { borderColor: m.color }]}>
                          {isSel && <View style={[styles.radioDot, { backgroundColor: m.color }]} />}
                        </View>
                        <Ionicons name={m.icon} size={16} color={isSel ? m.color : '#aaa'} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optLabel, isSel && { color: m.color }]}>{m.label}</Text>
                          {d.name ? <Text style={styles.optSub}>{d.name}</Text> : null}
                          <Text style={styles.optSub}>{d.number}</Text>
                        </View>
                        {isSel && <Ionicons name="checkmark" size={16} color={m.color} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Proof Upload Section */}
        <View style={styles.card}>
          <View style={styles.proofHeader}>
            <Ionicons name="camera-outline" size={20} color="#9b59b6" />
            <Text style={styles.proofTitle}>Upload Payment Proof</Text>
            <View style={[styles.proofCountBadge, proofImages.filter(i => i.url).length >= 2 && styles.proofCountDone]}>
              <Text style={styles.proofCountText}>{proofImages.filter(i => i.url).length}/2</Text>
            </View>
          </View>
          <Text style={styles.proofSubtitle}>
            Upload 2 screenshots or photos of your payment confirmation message. This is required to verify your payment.
          </Text>

          {/* Uploaded thumbnails */}
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

          {/* Direct pick buttons — no Alert middleman */}
          {proofImages.length < 2 && (
            <View style={styles.proofBtnRow}>
              <TouchableOpacity
                style={styles.proofPickBtn}
                onPress={() => pickImage('gallery')}
                disabled={proofImages.some(i => i.uploading)}
              >
                <Ionicons name="images-outline" size={20} color="#9b59b6" />
                <Text style={styles.proofPickText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.proofPickBtn}
                onPress={() => pickImage('camera')}
                disabled={proofImages.some(i => i.uploading)}
              >
                <Ionicons name="camera-outline" size={20} color="#9b59b6" />
                <Text style={styles.proofPickText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.proofHint}>
            {proofImages.length === 0
              ? 'Add screenshot 1 of 2'
              : proofImages.length === 1
              ? 'Add screenshot 2 of 2'
              : 'Both screenshots uploaded ✓'}
          </Text>

          {/* AI Verification Result */}
          {verifying && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator size="small" color="#9b59b6" />
              <Text style={styles.verifyingText}>AI is verifying your payment screenshots...</Text>
            </View>
          )}
          {!verifying && verifyResult && (
            <View style={[styles.verifyCard, verifyResult.verified === true ? styles.verifyPass : verifyResult.verified === false ? styles.verifyFail : styles.verifyWarn]}>
              <View style={styles.verifyHeader}>
                <Ionicons
                  name={verifyResult.verified === true ? 'checkmark-circle' : verifyResult.verified === false ? 'close-circle' : 'alert-circle'}
                  size={20}
                  color={verifyResult.verified === true ? '#27ae60' : verifyResult.verified === false ? '#e74c3c' : '#f39c12'}
                />
                <Text style={[styles.verifyTitle, { color: verifyResult.verified === true ? '#27ae60' : verifyResult.verified === false ? '#e74c3c' : '#f39c12' }]}>
                  {verifyResult.verified === true ? 'Payment Verified' : verifyResult.verified === false ? 'Verification Failed' : 'Could Not Verify'}
                </Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>{verifyResult.confidence || 'low'}</Text>
                </View>
              </View>
              <Text style={styles.verifySummary}>{verifyResult.summary}</Text>
              {verifyResult.rejectionReason ? (
                <Text style={styles.verifyRejection}>{verifyResult.rejectionReason}</Text>
              ) : null}
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
              {/* Inline actions when verification failed */}
              {verifyResult.verified === false && (
                <View style={styles.verifyActions}>
                  <TouchableOpacity
                    style={styles.reuploadBtn}
                    onPress={() => { setProofImages([]); setVerifyResult(null); Toast.show({ type: 'info', text1: 'Screenshots cleared', text2: 'Please upload new payment screenshots.' }); }}
                  >
                    <Ionicons name="refresh-outline" size={15} color="#e74c3c" />
                    <Text style={styles.reuploadText}>Re-upload Screenshots</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.proceedAnywayBtn}
                    onPress={() => {
                      const uploaded = proofImages.filter(img => img.url);
                      submitOrder(uploaded);
                    }}
                  >
                    <Ionicons name="checkmark-outline" size={15} color="#fff" />
                    <Text style={styles.proceedAnywayText}>Proceed Anyway</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>UGX {total.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, verifying && styles.confirmBtnDisabled]}
          onPress={confirmOrder}
          disabled={placing || verifying}
        >
          {placing
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="checkmark-circle-outline" size={22} color="#fff" /><Text style={styles.confirmText}>
                {proofImages.filter(i => i.url).length < 2
                  ? `Upload proof (${proofImages.filter(i => i.url).length}/2) then confirm`
                  : "I've Paid — Confirm Order"}
              </Text></>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  scroll: { padding: 16 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#e8f4fd', borderRadius: 10, padding: 12, marginBottom: 14 },
  infoText: { flex: 1, fontSize: 13, color: '#2980b9', lineHeight: 18 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  amountLabel: { fontSize: 14, color: '#777' },
  amountValue: { fontSize: 20, fontWeight: '800', color: '#27ae60' },
  methodCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 12 },
  methodIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 13, fontWeight: '700' },
  methodName: { fontSize: 13, color: '#555', marginTop: 2 },
  methodNumber: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginTop: 3 },
  methodExtra: { fontSize: 12, color: '#888', marginTop: 2 },
  instructionBox: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 3 },
  instructionTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  step: { fontSize: 13, color: '#555', marginBottom: 5, lineHeight: 20 },
  hl: { fontWeight: '700', color: '#1a1a1a' },
  senderWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fef9ec', borderRadius: 8, padding: 8, marginTop: 8 },
  senderWarningText: { flex: 1, fontSize: 12, color: '#e67e22', lineHeight: 18 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#e8f4fd', borderRadius: 8, marginBottom: 8 },
  switchText: { fontSize: 13, color: '#3498db', fontWeight: '600' },
  optionsList: { gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e1e8ed', borderRadius: 10, padding: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  optLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  optSub: { fontSize: 12, color: '#888', marginTop: 1 },
  // Proof upload
  proofHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  proofTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#333' },
  proofCountBadge: { backgroundColor: '#f0f0f0', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  proofCountDone: { backgroundColor: '#e8f8f0' },
  proofCountText: { fontSize: 12, fontWeight: '700', color: '#555' },
  proofSubtitle: { fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 18 },
  proofGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  proofThumbWrap: { width: 120, height: 120, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  proofThumb: { width: '100%', height: '100%' },
  proofOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  proofOverlayText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  proofDoneOverlay: { position: 'absolute', bottom: 6, right: 6 },
  proofRemoveBtn: { position: 'absolute', top: 4, right: 4 },
  proofAddBtn: { width: 120, height: 120, borderRadius: 10, borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#faf5ff' },
  proofAddText: { fontSize: 11, color: '#9b59b6', fontWeight: '600', textAlign: 'center' },
  proofWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#fef9ec', borderRadius: 8, padding: 8 },
  proofWarningText: { flex: 1, fontSize: 12, color: '#e67e22' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#3498db' },
  confirmBtn: { backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 10, elevation: 3, shadowColor: '#27ae60', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  confirmBtnDisabled: { backgroundColor: '#aaa', shadowColor: '#aaa', elevation: 0 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  proofBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  proofPickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#9b59b6', borderRadius: 10, paddingVertical: 12, backgroundColor: '#faf5ff' },
  proofPickText: { fontSize: 13, color: '#9b59b6', fontWeight: '600' },
  proofHint: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 4 },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, backgroundColor: '#f5f0ff', borderRadius: 8 },
  verifyingText: { fontSize: 13, color: '#9b59b6', flex: 1 },
  verifyCard: { marginTop: 12, borderRadius: 10, padding: 12, borderWidth: 1 },
  verifyPass: { backgroundColor: '#f0faf4', borderColor: '#27ae60' },
  verifyFail: { backgroundColor: '#fef0ef', borderColor: '#e74c3c' },
  verifyWarn: { backgroundColor: '#fef9ec', borderColor: '#f39c12' },
  verifyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
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
});

