import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FAKE_DELIVERY_PARTNERS, getFoodOrder, updateFoodOrder } from '../../services/foodOrders';
import { foodImage } from '../../data/foodImages';
import PressableScale from '../../components/PressableScale';

/* ─── Animated Pulsing Radar ─────────────────────────────────────── */
function PulsingRadar({ icon = 'restaurant', color = '#0F7A56' }) {
  const scale = useMemo(() => new Animated.Value(0.4), []);
  const opacity = useMemo(() => new Animated.Value(0.7), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.6, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={styles.radarWrap}>
      <Animated.View style={[styles.radarRing, { transform: [{ scale }], opacity, borderColor: color }]} />
      <View style={[styles.radarDot, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
    </View>
  );
}

/* ─── Animated Progress Bar ──────────────────────────────────────── */
function DeliveryProgressBar({ durationMs = 10000 }) {
  const progress = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: false }).start();
  }, [progress, durationMs]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['10%', '100%'] });
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
}

export default function FoodOrderScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load order data
  useEffect(() => {
    let mounted = true;
    getFoodOrder(id).then((data) => {
      if (mounted) {
        setOrder(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [id]);

  // Simulation Progression: CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
  useEffect(() => {
    if (!order) return undefined;
    const status = order.status;
    const timers = [];

    if (status === 'CONFIRMED') {
      // 5 seconds -> PREPARING
      timers.push(setTimeout(async () => {
        const partner = FAKE_DELIVERY_PARTNERS[Math.floor(Math.random() * FAKE_DELIVERY_PARTNERS.length)];
        const updated = await updateFoodOrder(order.id, {
          status: 'PREPARING',
          deliveryPartner: partner,
          deliveryPin: String(Math.floor(1000 + Math.random() * 9000)),
        });
        if (updated) setOrder(updated);
      }, 5000));
    }

    if (status === 'PREPARING') {
      // 8 seconds -> OUT_FOR_DELIVERY
      timers.push(setTimeout(async () => {
        const updated = await updateFoodOrder(order.id, {
          status: 'OUT_FOR_DELIVERY',
          outForDeliveryAt: new Date().toISOString(),
        });
        if (updated) setOrder(updated);
      }, 8000));
    }

    if (status === 'OUT_FOR_DELIVERY') {
      // 10 seconds -> DELIVERED
      timers.push(setTimeout(async () => {
        const updated = await updateFoodOrder(order.id, {
          status: 'DELIVERED',
          deliveredAt: new Date().toISOString(),
        });
        if (updated) setOrder(updated);
      }, 10000));
    }

    return () => timers.forEach(clearTimeout);
  }, [order]);

  const handleCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          const updated = await updateFoodOrder(order.id, { status: 'CANCELLED' });
          if (updated) setOrder(updated);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#0F7A56" />
        <Text style={styles.muted}>Loading order details…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        <Text style={styles.emptyTitle}>Order Not Found</Text>
        <Text style={styles.muted}>This food order could not be located.</Text>
        <PressableScale style={styles.primaryBtn} onPress={() => router.replace('/(rider)/food')}>
          <Text style={styles.primaryBtnText}>Browse Restaurants</Text>
        </PressableScale>
      </View>
    );
  }

  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  const statusMeta = {
    CONFIRMED: {
      title: 'Order Confirmed!',
      sub: 'Restaurant has accepted your order and will start cooking soon.',
      icon: 'receipt-outline',
      badgeColor: '#0284C7',
      eta: '25-30 mins',
    },
    PREPARING: {
      title: 'Cooking in the Kitchen',
      sub: 'Fresh ingredients are being prepared for your meal.',
      icon: 'restaurant-outline',
      badgeColor: '#D97706',
      eta: '18-22 mins',
    },
    OUT_FOR_DELIVERY: {
      title: 'Out for Delivery!',
      sub: 'Your delivery partner has picked up the food and is en route.',
      icon: 'bicycle-outline',
      badgeColor: '#7C3AED',
      eta: '8-12 mins',
    },
    DELIVERED: {
      title: 'Order Delivered!',
      sub: 'Your hot meal has arrived. Enjoy your food! 🍽️',
      icon: 'checkmark-circle',
      badgeColor: '#0F7A56',
      eta: 'Delivered',
    },
    CANCELLED: {
      title: 'Order Cancelled',
      sub: 'This order was cancelled.',
      icon: 'close-circle',
      badgeColor: '#DC2626',
      eta: 'Cancelled',
    },
  }[order.status] || {
    title: 'Order Placed',
    sub: 'Processing order.',
    icon: 'time-outline',
    badgeColor: '#0F7A56',
    eta: '30 mins',
  };

  const steps = [
    { key: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark' },
    { key: 'PREPARING', label: 'Cooking', icon: 'flame' },
    { key: 'OUT_FOR_DELIVERY', label: 'On Way', icon: 'bicycle' },
    { key: 'DELIVERED', label: 'Delivered', icon: 'home' },
  ];

  const currentStepIdx = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].indexOf(order.status);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => router.replace('/(rider)/(tabs)/activities')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Order #{order.orderNumber || order.id.slice(-6)}</Text>
          <Text style={styles.headerSub}>{order.restaurantName || 'UniGo Food'}</Text>
        </View>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => Share.share({ message: `Tracking my UniGo food order from ${order.restaurantName}! Status: ${statusMeta.title}` })}
        >
          <Ionicons name="share-social-outline" size={20} color="#0F7A56" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          {!isDelivered && !isCancelled && (
            <PulsingRadar icon={statusMeta.icon} color={statusMeta.badgeColor} />
          )}
          {isDelivered && (
            <View style={[styles.bigIconCircle, { backgroundColor: '#E6F4EA' }]}>
              <Ionicons name="checkmark-circle" size={48} color="#0F7A56" />
            </View>
          )}
          {isCancelled && (
            <View style={[styles.bigIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={48} color="#DC2626" />
            </View>
          )}

          <Text style={styles.statusHeadline}>{statusMeta.title}</Text>
          <Text style={styles.statusSubtext}>{statusMeta.sub}</Text>

          {!isDelivered && !isCancelled && (
            <View style={styles.etaBadge}>
              <Ionicons name="time-outline" size={16} color="#0F7A56" />
              <Text style={styles.etaText}>Estimated Delivery: {statusMeta.eta}</Text>
            </View>
          )}

          {/* Stepper Progress */}
          {!isCancelled && (
            <View style={styles.stepperWrap}>
              {steps.map((st, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;
                return (
                  <View key={st.key} style={styles.stepItem}>
                    <View style={[styles.stepDot, isPassed && styles.stepDotActive, isCurrent && styles.stepDotCurrent]}>
                      <Ionicons name={st.icon} size={12} color={isPassed ? '#fff' : '#94A3B8'} />
                    </View>
                    <Text style={[styles.stepLabel, isPassed && styles.stepLabelActive]}>{st.label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {order.status === 'OUT_FOR_DELIVERY' && (
            <View style={{ width: '100%', marginTop: 14 }}>
              <DeliveryProgressBar durationMs={10000} />
            </View>
          )}
        </View>

        {/* Delivery Partner Card */}
        {['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && order.deliveryPartner && (
          <View style={styles.partnerCard}>
            <View style={styles.partnerTop}>
              <View style={styles.partnerAvatar}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerName}>{order.deliveryPartner.name}</Text>
                <Text style={styles.partnerMeta}>
                  ⭐ {order.deliveryPartner.rating} · {order.deliveryPartner.deliveries}+ deliveries
                </Text>
                <Text style={styles.partnerVehicle}>
                  {order.deliveryPartner.vehicle} · {order.deliveryPartner.plate}
                </Text>
              </View>
              <View style={styles.partnerActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Alert.alert('Call Delivery Partner', `Calling ${order.deliveryPartner.name} at ${order.deliveryPartner.phone}`)}
                >
                  <Ionicons name="call" size={18} color="#0F7A56" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Alert.alert('Chat with Delivery Partner', 'Messaging will open when driver accepts chat.')}
                >
                  <Ionicons name="chatbubble" size={18} color="#0F7A56" />
                </TouchableOpacity>
              </View>
            </View>

            {order.status === 'OUT_FOR_DELIVERY' && order.deliveryPin && (
              <View style={styles.pinCard}>
                <Text style={styles.pinLabel}>DELIVERY PIN</Text>
                <Text style={styles.pinCode}>{order.deliveryPin}</Text>
                <Text style={styles.pinMuted}>Share this PIN with your delivery partner at the door</Text>
              </View>
            )}
          </View>
        )}

        {/* Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color="#0F7A56" />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.addressText}>{order.deliveryAddress || 'Address on file'}</Text>
          {!!order.instructions && (
            <View style={styles.instructionBox}>
              <Ionicons name="information-circle-outline" size={16} color="#64748B" />
              <Text style={styles.instructionText}>Note: {order.instructions}</Text>
            </View>
          )}
        </View>

        {/* Order Items & Restaurant Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="restaurant-outline" size={20} color="#0F7A56" />
            <Text style={styles.cardTitle}>{order.restaurantName || 'Restaurant'}</Text>
          </View>
          <View style={styles.itemsList}>
            {(order.items || []).map((item, idx) => (
              <View key={`${item.id}-${idx}`} style={styles.itemRow}>
                <Image
                  source={foodImage(item.restaurantCategory || 'thali', item.name, item.id)}
                  style={styles.itemThumb}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
          </View>

          {/* Bill Breakdown */}
          <View style={styles.billDivider} />
          <View style={styles.billRow}>
            <Text style={styles.billMuted}>Item Total</Text>
            <Text style={styles.billVal}>₹{Number(order.itemTotal || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billMuted}>Delivery Fee</Text>
            <Text style={styles.billVal}>
              {order.deliveryFee === 0 ? <Text style={{ color: '#0F7A56', fontWeight: '800' }}>FREE</Text> : `₹${order.deliveryFee || 20}`}
            </Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billMuted}>Platform Fee & Taxes</Text>
            <Text style={styles.billVal}>₹{Number(order.taxes || 20).toFixed(2)}</Text>
          </View>
          {Number(order.discount || 0) > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billMuted, { color: '#0F7A56' }]}>Coupon Discount</Text>
              <Text style={[styles.billVal, { color: '#0F7A56' }]}>-₹{Number(order.discount).toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalVal}>₹{Number(order.total || 0).toFixed(2)}</Text>
          </View>
          <Text style={styles.paidMethod}>Paid via {order.paymentMethodLabel || order.paymentMethod || 'Cash'}</Text>
        </View>

        {/* Quick Help & Actions */}
        <View style={styles.actionsWrap}>
          {order.status === 'CONFIRMED' && (
            <PressableScale style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            </PressableScale>
          )}

          <PressableScale style={styles.outlineBtn} onPress={() => router.replace('/(rider)/(tabs)/activities')}>
            <Ionicons name="receipt-outline" size={18} color="#0F7A56" style={{ marginRight: 6 }} />
            <Text style={styles.outlineBtnText}>View All Activities</Text>
          </PressableScale>

          <PressableScale style={styles.primaryBtn} onPress={() => router.replace('/(rider)/food')}>
            <Text style={styles.primaryBtnText}>Order More Food</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E6F4EA', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 14 },

  /* Status Card */
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  radarWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  radarRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2.5 },
  radarDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bigIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statusHeadline: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  statusSubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginTop: 4, maxWidth: 300 },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
  },
  etaText: { fontSize: 13, fontWeight: '700', color: '#0F7A56' },

  /* Stepper */
  stepperWrap: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24, paddingHorizontal: 8 },
  stepItem: { alignItems: 'center', gap: 6, flex: 1 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#0F7A56' },
  stepDotCurrent: { borderWidth: 2, borderColor: '#34D399', elevation: 2 },
  stepLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
  stepLabelActive: { color: '#0F172A', fontWeight: '700' },

  /* Progress Bar */
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#7C3AED' },

  /* Partner Card */
  partnerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  partnerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0F7A56', alignItems: 'center', justifyContent: 'center' },
  partnerName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  partnerMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  partnerVehicle: { fontSize: 12, fontWeight: '700', color: '#0F7A56', marginTop: 2 },
  partnerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E6F4EA', alignItems: 'center', justifyContent: 'center' },
  pinCard: { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
  pinLabel: { fontSize: 10, fontWeight: '800', color: '#0F7A56', letterSpacing: 1 },
  pinCode: { fontSize: 26, fontWeight: '900', color: '#065F46', letterSpacing: 6, marginVertical: 2 },
  pinMuted: { fontSize: 11, color: '#065F46' },

  /* Card Base */
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  addressText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  instructionBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 },
  instructionText: { fontSize: 12, color: '#64748B' },

  /* Items */
  itemsList: { gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F1F5F9' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  itemQty: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  /* Bill */
  billDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', marginVertical: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  billMuted: { fontSize: 13, color: '#64748B' },
  billVal: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  totalRow: { marginTop: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  totalVal: { fontSize: 18, fontWeight: '900', color: '#0F7A56' },
  paidMethod: { fontSize: 11, color: '#64748B', marginTop: 4 },

  /* Buttons */
  actionsWrap: { gap: 10, marginTop: 8 },
  primaryBtn: { backgroundColor: '#0F7A56', borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  outlineBtn: { flexDirection: 'row', borderWidth: 1, borderColor: '#0F7A56', borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { color: '#0F7A56', fontSize: 14, fontWeight: '800' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  muted: { fontSize: 13, color: '#64748B' },
});
