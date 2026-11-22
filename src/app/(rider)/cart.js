import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { reverseGeocode } from '../../services/geocoding';
import PressableScale from '../../components/PressableScale';
import { useFoodCart } from '../../context/FoodCartProvider';
import { useWallet } from '../../context/WalletProvider';
import { useLocation } from '../../context/LocationProvider';
import { foodImage } from '../../data/foodImages';
import { RESTAURANTS } from '../../data/restaurants';
import { saveFoodOrder } from '../../services/foodOrders';
import { THEME } from '../../constants/theme';

function createOrderId() {
  return `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
function createOrderNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, totalItems, itemTotal, updateQuantity, clearCart } = useFoodCart();
  const { balance, deductMoney } = useWallet();
  const { selectedCity } = useLocation();

  const [step, setStep] = useState('cart'); // 'cart' | 'payment'
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'wallet' | 'upi' | 'bank'
  const [paymentProvider, setPaymentProvider] = useState('Google Pay');
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [placing, setPlacing] = useState(false);

  // Group items by restaurant
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

  // Bill Calculations
  const subtotal = itemTotal;
  const deliveryFee = subtotal >= 299 ? 0 : 25;
  const platformFee = 5;
  const taxes = Math.round(subtotal * 0.05); // 5% GST

  let discount = 0;
  if (appliedCoupon === 'UNIGO50') {
    discount = Math.min(50, Math.round(subtotal * 0.5));
  } else if (appliedCoupon === 'FREEFEES') {
    discount = deliveryFee;
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee + platformFee + taxes - discount);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    setCouponError('');
    if (code === 'UNIGO50') {
      setAppliedCoupon('UNIGO50');
      setCouponCode('');
    } else if (code === 'FREEFEES') {
      setAppliedCoupon('FREEFEES');
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon. Try "UNIGO50" or "FREEFEES".');
    }
  };

  const locateAddress = async () => {
    setLocating(true);
    setLocationMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission denied. Enter your address manually.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const place = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      setAddress([place.title, place.subtitle].filter(Boolean).join(', '));
      setLocationMessage('Location detected! Add your flat/house number and landmark.');
    } catch (error) {
      setLocationMessage(error.message || 'Could not get your location. Enter address manually.');
    } finally {
      setLocating(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (placing) return;

    const finalAddress = address.trim() || `Main Road, ${selectedCity?.name || 'Rajkot'}`;

    if (paymentMethod === 'wallet' && balance < grandTotal) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `Your wallet balance is ₹${Number(balance).toFixed(2)}, but order total is ₹${grandTotal.toFixed(2)}. Please choose another payment method or top up.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setPlacing(true);
    try {
      // Deduct wallet if selected
      if (paymentMethod === 'wallet') {
        const success = await deductMoney(grandTotal, `Food order from ${groups[0]?.name || 'UniGo'}`);
        if (!success) throw new Error('Wallet payment failed');
      }

      const primaryRestaurant = groups[0] || {};
      const restaurantRecord = RESTAURANTS.find((r) => r.id === primaryRestaurant.id);

      const order = {
        id: createOrderId(),
        orderNumber: createOrderNumber(),
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
        restaurantId: primaryRestaurant.id,
        restaurantName: primaryRestaurant.name || 'UniGo Restaurant',
        restaurantCategory: restaurantRecord?.category || 'thali',
        items,
        itemTotal: subtotal,
        deliveryFee,
        platformFee,
        taxes,
        discount,
        total: grandTotal,
        deliveryAddress: finalAddress,
        instructions: instructions.trim(),
        paymentMethod,
        paymentMethodLabel:
          paymentMethod === 'cod'
            ? 'Cash on Delivery'
            : paymentMethod === 'wallet'
            ? 'UniGo Wallet'
            : paymentMethod === 'upi'
            ? `UPI (${paymentProvider})`
            : 'Net Banking',
      };

      await saveFoodOrder(order);
      clearCart();

      // Navigate to Live Food Order Tracking Screen
      router.replace({ pathname: '/(rider)/food-order', params: { id: order.id } });
    } catch (error) {
      Alert.alert('Order Failed', error.message || 'Could not place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale
          onPress={() => (step === 'payment' ? setStep('cart') : router.back())}
          accessibilityRole="button"
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={23} color={THEME.colors.text} />
        </PressableScale>
        <Text style={styles.title}>{step === 'cart' ? 'Your Food Cart' : 'Delivery & Payment'}</Text>
      </View>

      {totalItems === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={54} color={THEME.colors.primary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.muted}>Explore local restaurants and add delicious dishes to get started.</Text>
          <PressableScale style={styles.button} onPress={() => router.push('/(rider)/food')}>
            <Text style={styles.buttonText}>Browse Restaurants</Text>
          </PressableScale>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
            {step === 'cart' ? (
              <>
                <Text style={styles.muted}>
                  {totalItems} item{totalItems === 1 ? '' : 's'} from {groups.length} restaurant{groups.length === 1 ? '' : 's'}
                </Text>

                {/* Items List */}
                {groups.map((group) => (
                  <View style={styles.card} key={group.id}>
                    <View style={styles.restaurantHeader}>
                      <Ionicons name="restaurant" size={18} color="#0F7A56" />
                      <Text style={styles.sectionTitle}>{group.name}</Text>
                    </View>

                    {group.items.map((item) => {
                      const restaurant = RESTAURANTS.find((entry) => entry.id === group.id);
                      return (
                        <View style={styles.itemRow} key={item.id}>
                          <Image
                            source={foodImage(restaurant?.category, item.name, item.id)}
                            style={styles.image}
                            contentFit="cover"
                          />
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemPriceText}>₹{item.price} each</Text>
                          </View>
                          <View style={styles.quantity}>
                            <PressableScale onPress={() => updateQuantity(item.id, -1)} style={styles.quantityButton}>
                              <Ionicons name="remove" size={18} color="#0F7A56" />
                            </PressableScale>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <PressableScale onPress={() => updateQuantity(item.id, 1)} style={styles.quantityButton}>
                              <Ionicons name="add" size={18} color="#0F7A56" />
                            </PressableScale>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}

                {/* Add More Food */}
                <PressableScale style={styles.outlineButton} onPress={() => router.push('/(rider)/food')}>
                  <Ionicons name="add-circle-outline" size={18} color="#0F7A56" style={{ marginRight: 6 }} />
                  <Text style={styles.outlineText}>Add more food</Text>
                </PressableScale>

                {/* Coupon Card */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Apply Coupon</Text>
                  {appliedCoupon ? (
                    <View style={styles.appliedCouponRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.couponAppliedTitle}>🎉 {appliedCoupon} Applied!</Text>
                        <Text style={styles.couponAppliedSub}>You saved ₹{discount} on this order</Text>
                      </View>
                      <TouchableOpacity onPress={() => setAppliedCoupon(null)}>
                        <Text style={styles.removeCouponText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.couponInputRow}>
                      <TextInput
                        style={styles.couponInput}
                        placeholder="Enter UNIGO50 or FREEFEES"
                        value={couponCode}
                        onChangeText={setCouponCode}
                        autoCapitalize="characters"
                      />
                      <PressableScale style={styles.applyBtn} onPress={applyCoupon}>
                        <Text style={styles.applyBtnText}>Apply</Text>
                      </PressableScale>
                    </View>
                  )}
                  {!!couponError && <Text style={styles.errorText}>{couponError}</Text>}
                </View>
              </>
            ) : (
              <>
                {/* Step 2: Address */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                  <Text style={styles.muted}>Your food will be delivered to this location.</Text>
                  <PressableScale
                    style={styles.locationButton}
                    onPress={locateAddress}
                    disabled={locating}
                  >
                    <Ionicons name="locate" size={18} color="#0F7A56" />
                    <Text style={styles.locationButtonText}>{locating ? 'Detecting GPS location…' : 'Use current location'}</Text>
                  </PressableScale>
                  {!!locationMessage && <Text style={styles.muted}>{locationMessage}</Text>}
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder={`House/flat number, street, landmark, ${selectedCity?.name || 'Rajkot'}`}
                    multiline
                  />
                  <TextInput
                    style={[styles.input, { minHeight: 44, marginTop: 8 }]}
                    value={instructions}
                    onChangeText={setInstructions}
                    placeholder="Delivery instructions (e.g. Leave at door, don't ring bell)"
                  />
                </View>

                {/* Step 2: Payment Method */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>

                  {/* Cash on delivery */}
                  <PressableScale
                    style={styles.paymentRow}
                    onPress={() => setPaymentMethod('cod')}
                  >
                    <Ionicons name={paymentMethod === 'cod' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#0F7A56" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.paymentLabel}>Cash on Delivery</Text>
                      <Text style={styles.muted}>Pay cash when food arrives</Text>
                    </View>
                  </PressableScale>

                  {/* UniGo Wallet */}
                  <PressableScale
                    style={styles.paymentRow}
                    onPress={() => setPaymentMethod('wallet')}
                  >
                    <Ionicons name={paymentMethod === 'wallet' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#0F7A56" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.paymentLabel}>UniGo Wallet (₹{Number(balance || 0).toFixed(2)})</Text>
                      <Text style={styles.muted}>
                        {balance >= grandTotal ? 'Instant 1-tap payment' : 'Insufficient balance'}
                      </Text>
                    </View>
                    {balance < grandTotal && (
                      <TouchableOpacity onPress={() => router.push('/(rider)/wallet')}>
                        <Text style={styles.topUpLink}>Top up</Text>
                      </TouchableOpacity>
                    )}
                  </PressableScale>

                  {/* UPI */}
                  <PressableScale
                    style={styles.paymentRow}
                    onPress={() => setPaymentMethod('upi')}
                  >
                    <Ionicons name={paymentMethod === 'upi' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#0F7A56" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.paymentLabel}>UPI Apps</Text>
                      <Text style={styles.muted}>Google Pay, PhonePe, Paytm, BHIM</Text>
                    </View>
                  </PressableScale>

                  {paymentMethod === 'upi' && (
                    <View style={styles.providerList}>
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((prov) => (
                        <PressableScale
                          key={prov}
                          style={styles.providerRow}
                          onPress={() => setPaymentProvider(prov)}
                        >
                          <Ionicons
                            name={paymentProvider === prov ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color="#0F7A56"
                          />
                          <Text style={styles.providerLabel}>{prov}</Text>
                        </PressableScale>
                      ))}
                    </View>
                  )}

                  {/* Net Banking */}
                  <PressableScale
                    style={styles.paymentRow}
                    onPress={() => setPaymentMethod('bank')}
                  >
                    <Ionicons name={paymentMethod === 'bank' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#0F7A56" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.paymentLabel}>Net Banking</Text>
                      <Text style={styles.muted}>SBI, HDFC, ICICI, Axis Bank</Text>
                    </View>
                  </PressableScale>
                </View>
              </>
            )}

            {/* Bill Summary */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Bill Summary</Text>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={styles.billValue}>
                  {deliveryFee === 0 ? <Text style={{ color: '#0F7A56', fontWeight: '800' }}>FREE</Text> : `₹${deliveryFee}`}
                </Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Platform Fee</Text>
                <Text style={styles.billValue}>₹{platformFee}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST & Restaurant Charges (5%)</Text>
                <Text style={styles.billValue}>₹{taxes}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: '#0F7A56', fontWeight: '700' }]}>Discount ({appliedCoupon})</Text>
                  <Text style={[styles.billValue, { color: '#0F7A56', fontWeight: '800' }]}>-₹{discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.billRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>To Pay</Text>
                <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Bar */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            {step === 'cart' ? (
              <PressableScale style={styles.button} onPress={() => setStep('payment')}>
                <Text style={styles.buttonText}>Proceed to Delivery & Payment (₹{grandTotal.toFixed(2)})</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </PressableScale>
            ) : (
              <PressableScale
                style={[styles.button, placing && { opacity: 0.7 }]}
                onPress={handlePlaceOrder}
                disabled={placing}
              >
                <Text style={styles.buttonText}>
                  {placing ? 'Placing Order…' : `Place Order · ₹${grandTotal.toFixed(2)}`}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </PressableScale>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  back: { width: 42, height: 42, justifyContent: 'center' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  restaurantHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  muted: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  image: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#E6F4EA' },
  itemInfo: { flex: 1 },
  itemName: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  itemPriceText: { color: '#64748B', fontSize: 13, marginTop: 2 },
  quantity: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#0F7A56', borderRadius: 8, backgroundColor: '#F0FDF4' },
  quantityButton: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  quantityText: { color: '#0F7A56', fontWeight: '800', minWidth: 20, textAlign: 'center', fontSize: 14 },
  outlineButton: { flexDirection: 'row', borderWidth: 1, borderColor: '#0F7A56', borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: '#0F7A56', fontWeight: '800', fontSize: 14 },

  /* Coupon */
  couponInputRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  couponInput: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, height: 44, color: '#0F172A', fontWeight: '700' },
  applyBtn: { backgroundColor: '#0F7A56', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '800' },
  appliedCouponRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  couponAppliedTitle: { color: '#065F46', fontWeight: '800', fontSize: 14 },
  couponAppliedSub: { color: '#047857', fontSize: 12, marginTop: 2 },
  removeCouponText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  errorText: { color: '#DC2626', fontSize: 12 },

  /* Inputs */
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, minHeight: 65, color: '#0F172A', textAlignVertical: 'top' },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  locationButtonText: { color: '#0F7A56', fontWeight: '700' },

  /* Payments */
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  paymentLabel: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  topUpLink: { color: '#0F7A56', fontWeight: '800', fontSize: 13 },
  providerList: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 8, marginTop: 6 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  providerLabel: { color: '#334155', fontSize: 14, fontWeight: '600' },

  /* Bill Summary */
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  billLabel: { fontSize: 13, color: '#64748B' },
  billValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  totalRow: { marginTop: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#0F7A56' },

  /* Bottom Footer */
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  button: { flexDirection: 'row', backgroundColor: '#0F7A56', borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
});
