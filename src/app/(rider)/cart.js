import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import PressableScale from '../../components/PressableScale';
import { useFoodCart } from '../../context/FoodCartProvider';
import { foodImage } from '../../data/foodImages';
import { RESTAURANTS } from '../../data/restaurants';
import { THEME } from '../../constants/theme';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, totalItems, itemTotal, updateQuantity } = useFoodCart();
  const [step, setStep] = useState('cart');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const groups = useMemo(() => {
    const grouped = [];
    items.forEach((item) => {
      let group = grouped.find((entry) => entry.id === item.restaurantId);
      if (!group) {
        group = { id: item.restaurantId, name: item.restaurantName, items: [] };
        grouped.push(group);
      }
      group.items.push(item);
    });
    return grouped;
  }, [items]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <PressableScale onPress={() => step === 'payment' ? setStep('cart') : router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
          <Ionicons name="arrow-back" size={23} color={THEME.colors.text} />
        </PressableScale>
        <Text style={styles.title}>{step === 'cart' ? 'Your food cart' : 'Delivery and payment'}</Text>
      </View>
      {totalItems === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={54} color={THEME.colors.primary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.muted}>Add dishes from any restaurant to see them here.</Text>
          <PressableScale style={styles.button} onPress={() => router.push('/(rider)/food')}><Text style={styles.buttonText}>Browse food</Text></PressableScale>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}>
            {step === 'cart' ? (
              <>
                <Text style={styles.muted}>{totalItems} item{totalItems === 1 ? '' : 's'} from {groups.length} restaurant{groups.length === 1 ? '' : 's'}</Text>
                {groups.map((group) => (
                  <View style={styles.card} key={group.id}>
                    <Text style={styles.sectionTitle}>{group.name}</Text>
                    {group.items.map((item) => {
                      const restaurant = RESTAURANTS.find((entry) => entry.id === group.id);
                      return (
                        <View style={styles.itemRow} key={item.id}>
                          <Image source={foodImage(restaurant?.category, item.name, item.id)} style={styles.image} contentFit="cover" />
                          <View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.muted}>₹{item.price} each</Text></View>
                          <View style={styles.quantity}>
                            <PressableScale onPress={() => updateQuantity(item.id, -1)} style={styles.quantityButton} accessibilityRole="button" accessibilityLabel={`Remove one ${item.name}`}><Ionicons name="remove" size={20} color={THEME.colors.primary} /></PressableScale>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <PressableScale onPress={() => updateQuantity(item.id, 1)} style={styles.quantityButton} accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`}><Ionicons name="add" size={20} color={THEME.colors.primary} /></PressableScale>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
                <PressableScale style={styles.outlineButton} onPress={() => router.push('/(rider)/food')}><Text style={styles.outlineText}>+ Add more food</Text></PressableScale>
              </>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Delivery address</Text>
                  <Text style={styles.muted}>Enter your full address, including building and street.</Text>
                  <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="House, street, area and city" multiline accessibilityLabel="Delivery address" />
                </View>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Payment method</Text>
                  {[['cod', 'Cash on delivery'], ['wallet', 'UniGo Wallet'], ['upi', 'UPI']].map(([key, label]) => (
                    <PressableScale key={key} style={styles.paymentRow} onPress={() => setPaymentMethod(key)} accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === key }}>
                      <Ionicons name={paymentMethod === key ? 'radio-button-on' : 'radio-button-off'} size={22} color={THEME.colors.primary} />
                      <Text style={styles.paymentLabel}>{label}</Text>
                    </PressableScale>
                  ))}
                  <Text style={styles.notice}>Ordering and payments are not available yet. Your cart will remain here while you browse.</Text>
                </View>
              </>
            )}
            <View style={styles.card}>
              <View style={styles.totalRow}><Text style={styles.sectionTitle}>Items subtotal</Text><Text style={styles.sectionTitle}>₹{itemTotal.toFixed(2)}</Text></View>
              <Text style={styles.muted}>Delivery fees, taxes and offers will be confirmed when ordering is available.</Text>
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            {step === 'cart' ? <PressableScale style={styles.button} onPress={() => setStep('payment')}><Text style={styles.buttonText}>Continue to payment</Text></PressableScale> : <View style={[styles.button, styles.disabled]}><Text style={styles.buttonText}>Ordering unavailable</Text></View>}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  back: { width: 42, height: 42, justifyContent: 'center' },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  muted: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  image: { width: 58, height: 58, borderRadius: 10, backgroundColor: '#E6F4EA' },
  itemInfo: { flex: 1 },
  itemName: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  quantity: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#0F7A56', borderRadius: 8 },
  quantityButton: { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
  quantityText: { color: '#0F7A56', fontWeight: '700', minWidth: 18, textAlign: 'center' },
  outlineButton: { borderWidth: 1, borderColor: '#0F7A56', borderRadius: 12, padding: 14, alignItems: 'center' },
  outlineText: { color: '#0F7A56', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, minHeight: 70, color: '#0F172A', textAlignVertical: 'top' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  paymentLabel: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  notice: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16 },
  button: { backgroundColor: '#0F7A56', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  disabled: { backgroundColor: '#94A3B8' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
});
