import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../constants/theme';
import { CURRENCY_SYMBOL } from '../../constants/config';
import PressableScale from '../../components/PressableScale';
import { RESTAURANTS } from '../../data/restaurants';
import { useLocation } from '../../context/LocationProvider';
import { useWallet } from '../../context/WalletProvider';
import { useActivity } from '../../context/ActivityProvider';

const { width: SW } = Dimensions.get('window');

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { selectedCity, coordinates } = useLocation();
  const { balance, deductMoney } = useWallet();
  const { addRide } = useActivity();

  const restaurant = useMemo(
    () => RESTAURANTS.find((r) => r.id === params.restaurantId) || RESTAURANTS[0],
    [params.restaurantId]
  );

  // Cart format passed as JSON string: { [itemId]: quantity }
  const [cartItems, setCartItems] = useState(() => {
    try {
      return params.cart ? JSON.parse(params.cart) : {};
    } catch {
      return {};
    }
  });

  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'wallet' | 'upi'
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);
  const [placedOrderData, setPlacedOrderData] = useState(null);

  // Flatten items map
  const itemsMap = useMemo(() => {
    const map = {};
    restaurant.menu.forEach((cat) => {
      cat.items.forEach((item) => {
        map[item.id] = item;
      });
    });
    return map;
  }, [restaurant]);

  // Cart operations
  const updateQty = (id, delta) => {
    setCartItems((prev) => {
      const next = { ...prev };
      const current = next[id] || 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[id];
      } else {
        next[id] = updated;
      }
      return next;
    });
  };

  // Bill calculations
  const itemTotal = useMemo(() => {
    return Object.entries(cartItems).reduce((sum, [id, qty]) => {
      const item = itemsMap[id];
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [cartItems, itemsMap]);

  // Delivery fee
  const deliveryFee = itemTotal > 299 ? 0 : restaurant.deliveryFee || 25;
  const platformFee = 5;
  const taxes = Math.round(itemTotal * 0.05); // 5% GST

  // Offer calculation
  const discount = useMemo(() => {
    if (!restaurant.offer) return 0;
    if (restaurant.offerType === 'flat' && itemTotal >= 200) return 50;
    if (restaurant.offerType === 'percent') {
      const d = Math.round(itemTotal * 0.2);
      return Math.min(d, 80);
    }
    return 0;
  }, [restaurant, itemTotal]);

  const grandTotal = Math.max(0, itemTotal + deliveryFee + platformFee + taxes - discount);

  const activeItemCount = Object.values(cartItems).reduce((sum, q) => sum + q, 0);

  // Delivery location text
  const deliveryAddress = useMemo(() => {
    const city = selectedCity?.name || 'Rajkot';
    if (coordinates) {
      return `Current Location near ${city} (${coordinates.latitude.toFixed(3)}°N, ${coordinates.longitude.toFixed(3)}°E)`;
    }
    return `Current Location, ${city}, Gujarat`;
  }, [selectedCity, coordinates]);

  // Place Order handler
  const handlePlaceOrder = async () => {
    if (restaurant.informationOnly) {
      Alert.alert("Menu information", "Please contact the restaurant directly to order.");
      return;
    }
    if (activeItemCount === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart before proceeding.');
      return;
    }

    if (paymentMethod === 'wallet' && balance < grandTotal) {
      Alert.alert(
        'Insufficient Balance',
        `Your UniGo Wallet balance is ${CURRENCY_SYMBOL}${balance.toFixed(2)}, but total is ${CURRENCY_SYMBOL}${grandTotal}. Please choose Cash on Delivery or add money to wallet.`,
        [
          { text: 'Pay with Cash', onPress: () => setPaymentMethod('cod') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setIsPlacingOrder(true);

    try {
      if (paymentMethod === 'wallet') {
        const deducted = await deductMoney(grandTotal, `Food order at ${restaurant.name}`);
        if (!deducted) {
          Alert.alert('Payment Failed', 'Could not complete wallet transaction.');
          setIsPlacingOrder(false);
          return;
        }
      }

      const orderOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const orderData = {
        type: 'food',
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        origin: restaurant.name,
        destination: deliveryAddress,
        items: Object.entries(cartItems).map(([id, qty]) => ({
          name: itemsMap[id]?.name || 'Item',
          price: itemsMap[id]?.price || 0,
          qty,
          veg: itemsMap[id]?.veg ?? true,
        })),
        fare: grandTotal,
        paymentType: paymentMethod === 'wallet' ? 'UniGo Wallet' : paymentMethod === 'upi' ? 'Online UPI' : 'Cash on Delivery',
        otp: orderOtp,
        status: 'confirmed',
        estimatedTime: restaurant.deliveryTime,
        driver: {
          name: 'Suresh Parmar',
          rating: '4.9',
          trips: '2,890',
          vehicleNumber: 'GJ-03-FD-4129',
          vehicleModel: 'Food Delivery Partner',
        },
      };

      // Add to global ActivityProvider for history and tracking
      await addRide(orderData);

      setPlacedOrderData(orderData);
      setOrderSuccessModal(true);
    } catch (e) {
      console.warn('Order placement error:', e);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (activeItemCount === 0 && !orderSuccessModal) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <PressableScale style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={THEME.colors.text} />
          </PressableScale>
          <Text style={styles.topBarTitle}>Cart</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Ionicons name="cart-outline" size={50} color={THEME.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add some delicious food from {restaurant.name}!</Text>
          <PressableScale style={styles.backToMenuBtn} onPress={() => router.back()}>
            <Text style={styles.backToMenuText}>Explore Menu</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={THEME.colors.text} />
        </PressableScale>
        <View style={styles.headerTitleBox}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{restaurant.name}</Text>
          <Text style={styles.topBarSub}>{restaurant.deliveryTime} • {restaurant.distance}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={18} color={THEME.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Deliver to Current Location</Text>
              <Text style={styles.addressSub} numberOfLines={2}>{deliveryAddress}</Text>
            </View>
            <View style={styles.gpsPill}>
              <View style={styles.liveDot} />
              <Text style={styles.gpsPillText}>Live GPS</Text>
            </View>
          </View>

          <View style={styles.timeRow}>
            <Ionicons name="bicycle" size={15} color={THEME.colors.primary} />
            <Text style={styles.timeText}>Standard Delivery in {restaurant.deliveryTime}</Text>
          </View>
        </View>

        {/* Selected Items */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Order Items</Text>

          {Object.entries(cartItems).map(([id, qty]) => {
            const item = itemsMap[id];
            if (!item) return null;
            return (
              <View key={id} style={styles.itemRow}>
                {/* Veg/Non-veg indicator */}
                <View style={[styles.vegBadge, { borderColor: item.veg ? '#22C55E' : '#EF4444' }]}>
                  <View style={[styles.vegDot, { backgroundColor: item.veg ? '#22C55E' : '#EF4444' }]} />
                </View>

                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemPriceSingle}>{CURRENCY_SYMBOL}{item.price}</Text>
                </View>

                {/* Qty controller */}
                <View style={styles.qtyBox}>
                  <PressableScale style={styles.qtyBtn} onPress={() => updateQty(id, -1)}>
                    <Ionicons name="remove" size={14} color={THEME.colors.primary} />
                  </PressableScale>
                  <Text style={styles.qtyVal}>{qty}</Text>
                  <PressableScale style={styles.qtyBtn} onPress={() => updateQty(id, 1)}>
                    <Ionicons name="add" size={14} color={THEME.colors.primary} />
                  </PressableScale>
                </View>

                <Text style={styles.itemPriceTotal}>
                  {CURRENCY_SYMBOL}{item.price * qty}
                </Text>
              </View>
            );
          })}

          <PressableScale style={styles.addMoreBtn} onPress={() => router.back()}>
            <Ionicons name="add-circle-outline" size={18} color={THEME.colors.primary} />
            <Text style={styles.addMoreText}>Add more items</Text>
          </PressableScale>
        </View>

        {/* Offers & Coupons */}
        {restaurant.offer && (
          <View style={styles.couponCard}>
            <Ionicons name="pricetag" size={18} color="#1E3A5F" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.couponTitle}>{restaurant.offer}</Text>
              <Text style={styles.couponSub}>Applied automatically on your bill</Text>
            </View>
            <View style={styles.appliedPill}>
              <Text style={styles.appliedText}>APPLIED</Text>
            </View>
          </View>
        )}

        {/* Bill Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Bill Details</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billVal}>{CURRENCY_SYMBOL}{itemTotal}</Text>
          </View>

          <View style={styles.billRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              {deliveryFee === 0 && <Text style={styles.freeBadge}>FREE</Text>}
            </View>
            <Text style={[styles.billVal, deliveryFee === 0 && styles.strikethrough]}>
              {deliveryFee === 0 ? `${CURRENCY_SYMBOL}25` : `${CURRENCY_SYMBOL}${deliveryFee}`}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Fee</Text>
            <Text style={styles.billVal}>{CURRENCY_SYMBOL}{platformFee}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST & Restaurant Charges (5%)</Text>
            <Text style={styles.billVal}>{CURRENCY_SYMBOL}{taxes}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#22C55E', fontWeight: 'bold' }]}>
                Restaurant Coupon Discount
              </Text>
              <Text style={[styles.billVal, { color: '#22C55E', fontWeight: 'bold' }]}>
                -{CURRENCY_SYMBOL}{discount}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalAmount}>{CURRENCY_SYMBOL}{grandTotal}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Payment Method</Text>

          {/* Cash on delivery */}
          <PressableScale
            style={[styles.payRow, paymentMethod === 'cod' && styles.payRowActive]}
            onPress={() => setPaymentMethod('cod')}
          >
            <View style={styles.payIconBox}>
              <Ionicons name="cash-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.payTitle}>Cash on Delivery</Text>
              <Text style={styles.paySub}>Pay driver in cash upon arrival</Text>
            </View>
            <View style={[styles.radioDot, paymentMethod === 'cod' && styles.radioDotActive]}>
              {paymentMethod === 'cod' && <View style={styles.radioInner} />}
            </View>
          </PressableScale>

          {/* UniGo Wallet */}
          <PressableScale
            style={[styles.payRow, paymentMethod === 'wallet' && styles.payRowActive]}
            onPress={() => setPaymentMethod('wallet')}
          >
            <View style={[styles.payIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="wallet-outline" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.payTitle}>UniGo Wallet</Text>
              <Text style={styles.paySub}>
                Balance: {CURRENCY_SYMBOL}{balance.toFixed(2)}
                {balance < grandTotal && ' (Low Balance)'}
              </Text>
            </View>
            <View style={[styles.radioDot, paymentMethod === 'wallet' && styles.radioDotActive]}>
              {paymentMethod === 'wallet' && <View style={styles.radioInner} />}
            </View>
          </PressableScale>

          {/* UPI */}
          <PressableScale
            style={[styles.payRow, paymentMethod === 'upi' && styles.payRowActive]}
            onPress={() => setPaymentMethod('upi')}
          >
            <View style={[styles.payIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="qr-code-outline" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.payTitle}>UPI / GPay / PhonePe</Text>
              <Text style={styles.paySub}>Pay directly with any UPI app</Text>
            </View>
            <View style={[styles.radioDot, paymentMethod === 'upi' && styles.radioDotActive]}>
              {paymentMethod === 'upi' && <View style={styles.radioInner} />}
            </View>
          </PressableScale>
        </View>

        {/* Cancellation policy */}
        <View style={styles.cancellationCard}>
          <Ionicons name="information-circle-outline" size={16} color={THEME.colors.mutedText} />
          <Text style={styles.cancellationText}>
            Review your order and address details carefully to avoid cancellations. 100% genuine restaurant preparation.
          </Text>
        </View>
      </ScrollView>

      {/* Floating Bottom Bar with Place Order button */}
      <View style={[styles.footerBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.footerInner}>
          <View>
            <Text style={styles.footerPayMethod}>
              {paymentMethod === 'cod' ? 'Pay Cash' : paymentMethod === 'wallet' ? 'Pay with Wallet' : 'Pay via UPI'}
            </Text>
            <Text style={styles.footerTotal}>{CURRENCY_SYMBOL}{grandTotal}</Text>
          </View>

          <PressableScale
            style={[styles.placeOrderBtn, isPlacingOrder && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            disabled={isPlacingOrder}
          >
            <LinearGradient
              colors={['#064E3B', '#0F7A56']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.placeOrderGrad}
            >
              <Text style={styles.placeOrderText}>
                {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </PressableScale>
        </View>
      </View>

      {/* Order Confirmed Success Modal */}
      <Modal
        visible={orderSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setOrderSuccessModal(false);
          router.replace('/(rider)/(tabs)/activities');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successCheckCircle}>
              <Ionicons name="checkmark" size={38} color="#FFFFFF" />
            </View>

            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successSubtitle}>
              {restaurant.name} has received your order and started cooking.
            </Text>

            {/* OTP Box */}
            <View style={styles.otpCard}>
              <Text style={styles.otpPrompt}>Share this Delivery OTP with driver</Text>
              <Text style={styles.otpValue}>{placedOrderData?.otp || '2847'}</Text>
            </View>

            {/* Driver Assigned Info */}
            <View style={styles.driverBox}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={20} color={THEME.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.driverTitle}>Delivery Partner Assigned</Text>
                <Text style={styles.driverSub}>
                  {placedOrderData?.driver?.name} • {placedOrderData?.driver?.vehicleNumber}
                </Text>
              </View>
              <View style={styles.deliveryBadge}>
                <Text style={styles.deliveryBadgeText}>{restaurant.deliveryTime}</Text>
              </View>
            </View>

            {/* Actions */}
            <PressableScale
              style={styles.trackOrderBtn}
              onPress={() => {
                setOrderSuccessModal(false);
                router.replace('/(rider)/(tabs)/activities');
              }}
            >
              <Text style={styles.trackOrderText}>Track in Activities</Text>
            </PressableScale>

            <PressableScale
              style={styles.goHomeBtn}
              onPress={() => {
                setOrderSuccessModal(false);
                router.replace('/(rider)/(tabs)');
              }}
            >
              <Text style={styles.goHomeText}>Back to Home</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { flex: 1, alignItems: 'center' },
  topBarTitle: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
  },
  topBarSub: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
  },
  addressSub: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 2,
    lineHeight: 16,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#31C48D',
  },
  gpsPillText: {
    fontSize: 10,
    fontWeight: THEME.fontWeights.bold,
    color: '#03543F',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.primary,
  },

  // Items
  sectionHeading: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  vegBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemName: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
  },
  itemPriceSingle: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
  },
  qtyBtn: {
    padding: 4,
  },
  qtyVal: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  itemPriceTotal: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    width: 60,
    textAlign: 'right',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  addMoreText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
  },

  // Coupon Card
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  couponTitle: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: '#1E3A5F',
  },
  couponSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  appliedPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  appliedText: {
    fontSize: 10,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#1E40AF',
  },

  // Bill Rows
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    color: THEME.colors.mutedText,
  },
  billVal: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
  },
  freeBadge: {
    fontSize: 10,
    fontWeight: THEME.fontWeights.bold,
    color: '#22C55E',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: THEME.colors.mutedText,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.primaryDark,
  },

  // Payment Methods
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  payRowActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#F0FDF4',
  },
  payIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payTitle: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
  },
  paySub: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDotActive: {
    borderColor: THEME.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.primary,
  },

  // Cancellation notice
  cancellationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  cancellationText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.mutedText,
    lineHeight: 16,
  },

  // Footer bar
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    ...THEME.shadows.floating,
  },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerPayMethod: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    fontWeight: THEME.fontWeights.semibold,
  },
  footerTotal: {
    fontSize: 20,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  placeOrderBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    ...THEME.shadows.card,
  },
  placeOrderGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  placeOrderText: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.bold,
    color: '#FFFFFF',
  },

  // Empty cart
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.mutedText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  backToMenuBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: THEME.radius.pill,
  },
  backToMenuText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...THEME.shadows.floating,
  },
  successCheckCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  successSubtitle: {
    fontSize: 13,
    color: THEME.colors.mutedText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18,
  },
  otpCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  otpPrompt: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: '#15803D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otpValue: {
    fontSize: 28,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#166534',
    letterSpacing: 6,
    marginTop: 4,
  },
  driverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: THEME.colors.tile,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverTitle: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
  },
  driverSub: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  deliveryBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deliveryBadgeText: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
  },
  trackOrderBtn: {
    width: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  trackOrderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
  },
  goHomeBtn: {
    paddingVertical: 8,
  },
  goHomeText: {
    color: THEME.colors.mutedText,
    fontSize: 13,
    fontWeight: THEME.fontWeights.semibold,
  },
});
