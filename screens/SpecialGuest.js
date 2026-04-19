import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Dimensions, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const cardWidth = Math.min(width - 40, 480);

// Web: localStorage survives cache clears
// Native: SecureStore (device keychain) survives cache clears, only wiped on uninstall
const STORAGE_KEY = 'sg_verified_v1';

const persistRead = async () => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(STORAGE_KEY) === '1';
    }
    const val = await SecureStore.getItemAsync(STORAGE_KEY);
    return val === '1';
  } catch (_) {
    return false;
  }
};

const persistWrite = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, '1');
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, '1');
  } catch (_) {}
};

// Validate credentials — phone and invitation name
const VALID_PHONES = ['0761819885', '+256761819885'];
const VALID_NAME = 'ado';

const validateCredentials = (phone, name) => {
  const cleanPhone = phone.trim().replace(/\s/g, '');
  const cleanName = name.trim().toLowerCase();
  return VALID_PHONES.includes(cleanPhone) && cleanName === VALID_NAME;
};

const SpecialGuest = ({ navigation }) => {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [phone, setPhone] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    // Check persistent storage on mount
    persistRead().then(alreadyVerified => {
      setVerified(alreadyVerified);
      setChecking(false);
    });
  }, []);

  const handleVerify = async () => {
    setError('');
    if (!phone.trim() || !inviteName.trim()) {
      setError('Please fill in both fields.');
      return;
    }
    if (validateCredentials(phone, inviteName)) {
      await persistWrite();
      setVerified(true);
    } else {
      setError('Incorrect credentials. Please try again.');
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#115061" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color="#115061" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Header */}
        <LinearGradient colors={['#115061', '#1a7a8a']} style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={40} color="#ffd700" />
        </LinearGradient>

        <Text style={styles.title}>Special Guest Section</Text>
        <Text style={styles.subtitle}>
          Access the seller portal to manage your shop, products, and orders.
        </Text>

        {verified ? (
          // ── Verified: show seller options ──
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SellerLogin')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="log-in-outline" size={28} color="#115061" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Seller Login</Text>
                <Text style={styles.cardDesc}>Sign in to your existing seller account</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#115061" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SellerSignup')}
              activeOpacity={0.85}
            >
              <View style={[styles.cardIcon, { backgroundColor: '#fff3cd' }]}>
                <Ionicons name="storefront-outline" size={28} color="#f39c12" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Become a Seller</Text>
                <Text style={styles.cardDesc}>Create a new seller account and start selling</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#115061" />
            </TouchableOpacity>

            <Text style={styles.note}>
              These credentials are separate from your regular user account.
            </Text>
          </>
        ) : (
          // ── Not verified: show credential form ──
          <View style={[styles.card, styles.formCard]}>
            <Text style={styles.formTitle}>Enter Access Credentials</Text>
            <Text style={styles.formSubtitle}>
              This section requires special access credentials provided by the administrator.
            </Text>

            {/* Access Key (phone) */}
            <Text style={styles.label}>Access Key</Text>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={18} color="#95a5a6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter access key"
                placeholderTextColor="#bdc3c7"
                value={phone}
                onChangeText={setPhone}
                secureTextEntry={!showPass}
                keyboardType="default"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#95a5a6" />
              </TouchableOpacity>
            </View>

            {/* Invitation Name */}
            <Text style={styles.label}>Invitation Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color="#95a5a6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter invitation name"
                placeholderTextColor="#bdc3c7"
                value={inviteName}
                onChangeText={setInviteName}
                autoCapitalize="none"
              />
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color="#e74c3c" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
              <Text style={styles.verifyBtnText}>Verify Access</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#115061',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 340,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    width: cardWidth,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#e8f4f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#95a5a6',
    lineHeight: 18,
  },
  note: {
    marginTop: 24,
    fontSize: 12,
    color: '#bdc3c7',
    textAlign: 'center',
    maxWidth: 300,
  },

  // Form styles
  formCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#2c3e50',
    outlineStyle: 'none',
  },
  eyeBtn: {
    padding: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#115061',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  verifyBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SpecialGuest;
