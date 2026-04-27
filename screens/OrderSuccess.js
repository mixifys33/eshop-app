import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OrderSuccess({ navigation, route }) {
  const { total = 0, orderCount = 1 } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={90} color="#27ae60" />
        </View>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.sub}>
          {orderCount > 1 ? `${orderCount} orders` : 'Your order'} worth{' '}
          <Text style={styles.amount}>UGX {total.toLocaleString()}</Text> has been placed successfully.
        </Text>
        <Text style={styles.hint}>
          The seller will confirm and prepare your items. You'll be notified when it's on the way.
        </Text>

        <TouchableOpacity
          style={styles.ordersBtn}
          onPress={() => navigation.replace('UserOrders')}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={18} color="#fff" />
          <Text style={styles.ordersBtnText}>View My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.replace('home')}
          activeOpacity={0.7}
        >
          <Text style={styles.homeBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconWrap: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  sub: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 10 },
  amount: { fontWeight: '700', color: '#27ae60' },
  hint: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20, marginBottom: 36 },
  ordersBtn: {
    backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, marginBottom: 12, width: '100%', justifyContent: 'center',
    elevation: 3,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ordersBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  homeBtn: {
    borderWidth: 1.5, borderColor: '#e1e8ed', borderRadius: 14,
    paddingVertical: 13, width: '100%', alignItems: 'center',
  },
  homeBtnText: { fontSize: 15, color: '#555', fontWeight: '600' },
});

