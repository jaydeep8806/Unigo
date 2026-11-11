import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PAYMENT_OPTIONS = [
  { id: 'upi', label: 'UPI apps', icon: 'phone-portrait-outline', detail: 'Google Pay, PhonePe, Paytm and BHIM', providers: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Other UPI app'] },
  { id: 'card', label: 'Credit or debit card', icon: 'card-outline', detail: 'Visa, Mastercard and RuPay' },
  { id: 'bank', label: 'Net banking', icon: 'business-outline', detail: 'Choose your bank', providers: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Bank of Baroda', 'Other bank'] },
  { id: 'wallet', label: 'Wallet', icon: 'wallet-outline', detail: 'UniGo Wallet and other wallets', providers: ['UniGo Wallet', 'Paytm Wallet', 'Other wallet'] },
  { id: 'cod', label: 'Cash on delivery', icon: 'cash-outline', detail: 'Pay when your order arrives' },
];

export function paymentLabel(method, provider) {
  const label = PAYMENT_OPTIONS.find((option) => option.id === method)?.label || 'Cash on delivery';
  return provider ? `${label} · ${provider}` : label;
}

export function DemoPaymentOptions({ method, provider, onSelect, onProvider }) {
  const selected = PAYMENT_OPTIONS.find((option) => option.id === method);
  return <View style={styles.card}>
    <View style={styles.heading}><View style={styles.brandIcon}><Ionicons name="flash" size={21} color="#116440" /></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>UNIGO CHECKOUT</Text><Text style={styles.title}>Choose how to pay</Text></View></View>
    <Text style={styles.caption}>Select a payment method for this simulated order.</Text>
    {PAYMENT_OPTIONS.map((option) => <TouchableOpacity key={option.id} style={[styles.option, method === option.id && styles.selected]} accessibilityRole="radio" accessibilityState={{ checked: method === option.id }} onPress={() => onSelect(option.id)}>
      <View style={styles.optionIcon}><Ionicons name={option.icon} size={22} color="#147B4A" /></View><View style={{ flex: 1 }}><Text style={styles.optionTitle}>{option.label}</Text><Text style={styles.caption}>{option.detail}</Text></View><Ionicons name={method === option.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={method === option.id ? '#147B4A' : '#A4B3AA'} />
    </TouchableOpacity>)}
    {selected?.providers && <View style={styles.providers}><Text style={styles.providerTitle}>Choose {method === 'bank' ? 'a bank' : method === 'wallet' ? 'a wallet' : 'an app'}</Text><View style={styles.chips}>{selected.providers.map((item) => <TouchableOpacity key={item} accessibilityRole="radio" accessibilityState={{ checked: provider === item }} onPress={() => onProvider(item)} style={[styles.chip, provider === item && styles.chipSelected]}><Text style={[styles.chipText, provider === item && styles.chipTextSelected]}>{item}</Text></TouchableOpacity>)}</View></View>}
    <Text style={styles.disclaimer}>Simulation only · No payment information is collected and no money is transferred.</Text>
  </View>;
}

export function DemoPaymentConfirmation({ order }) {
  const [scale] = useState(() => new Animated.Value(0.65));
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, scale]);
  return <View style={styles.confirmation} accessibilityRole="summary">
    <Animated.View style={[styles.successCircle, { opacity, transform: [{ scale }] }]}><Ionicons name="checkmark" size={42} color="#fff" /></Animated.View>
    <Text style={styles.eyebrow}>UNIGO CHECKOUT</Text>
    <Text style={styles.confirmTitle}>{order.payment === 'cod' ? 'Simulated order placed' : 'Simulated payment complete'}</Text>
    <Text style={styles.confirmCopy}>{order.payment === 'cod' ? 'Your simulated order is saved. No cash will be collected.' : 'Your simulated payment and order are saved. No money was transferred.'}</Text>
    <View style={styles.receipt}><Text style={styles.receiptLabel}>SIMULATED TOTAL</Text><Text style={styles.amount}>₹{(order.total / 100).toFixed(2)}</Text><Text style={styles.caption}>{order.paymentLabel || (order.payment === 'cod' ? 'Cash on delivery' : 'Online payment')}</Text><Text style={styles.reference}>Order reference · {order.id}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginVertical: 12, gap: 10 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, brandIcon: { backgroundColor: '#DDF2E4', borderRadius: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: '#208554', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, title: { color: '#18372A', fontSize: 18, fontWeight: '800', marginTop: 3 }, caption: { color: '#728279', fontSize: 12, lineHeight: 18 }, option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E7EEE9', borderRadius: 13, padding: 10 }, selected: { borderColor: '#45A96F', backgroundColor: '#F1FAF4' }, optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F6EC', alignItems: 'center', justifyContent: 'center' }, optionTitle: { color: '#193A2B', fontWeight: '700', fontSize: 14 }, providers: { backgroundColor: '#F6FAF7', padding: 12, borderRadius: 12 }, providerTitle: { color: '#244A36', fontWeight: '700', marginBottom: 9 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderRadius: 20, borderWidth: 1, borderColor: '#DCEAE0', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8 }, chipSelected: { borderColor: '#208554', backgroundColor: '#DDF2E4' }, chipText: { color: '#596E61', fontSize: 12 }, chipTextSelected: { color: '#116440', fontWeight: '700' }, disclaimer: { fontSize: 12, lineHeight: 18, color: '#6F7F75' }, confirmation: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 22, marginBottom: 14 }, successCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#18834D', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, confirmTitle: { color: '#18372A', fontSize: 22, fontWeight: '800', marginTop: 7, textAlign: 'center' }, confirmCopy: { color: '#728279', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 }, receipt: { width: '100%', backgroundColor: '#F3FAF5', borderRadius: 15, padding: 16, marginTop: 20, alignItems: 'center' }, receiptLabel: { color: '#73907C', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, amount: { color: '#116440', fontSize: 27, fontWeight: '800', marginVertical: 5 }, reference: { color: '#728279', fontSize: 11, marginTop: 10, textAlign: 'center' },
});
