import React, { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useActivity } from '../../../context/ActivityProvider';
import { loadDemo, money } from '../../../services/shopDemo';
import { getFoodOrders } from '../../../services/foodOrders';

const FILTERS = ['All', 'Rides', 'Food', 'Shop', 'Home & Spa'];
const SUCCESSFUL_RIDE_STATUSES = ['completed', 'payment_pending', 'paid', 'rated'];
const RIDE_STATUS = { searching: 'Finding driver', requested: 'Awaiting driver', unavailable: 'No driver available', assigned: 'Driver assigned', arrived: 'Driver arrived', in_progress: 'In progress', completed: 'Completed', payment_pending: 'Payment due', paid: 'Paid', rated: 'Completed', cancelled: 'Cancelled', confirmed: 'Confirmed' };
const SHOP_STATUS = { PLACED: 'Order placed', ACCEPTED: 'Accepted', PACKING: 'Packing', READY_FOR_PICKUP: 'Ready for pickup', DRIVER_ASSIGNED: 'Driver assigned', PICKED_UP: 'Picked up', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELED: 'Cancelled', FAILED: 'Failed' };

function dateLabel(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date unavailable';
}

export default function ActivitiesScreen() {
  const { rides, isLoaded } = useActivity();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.allSettled([
      AsyncStorage.getItem('@unigo_home_spa_demo_bookings'),
      loadDemo(),
      getFoodOrders(),
    ]).then(([bookingResult, orderResult, foodResult]) => {
      if (!active) return;
      let failed = false;
      try {
        if (bookingResult.status === 'rejected') throw bookingResult.reason;
        const parsed = bookingResult.value ? JSON.parse(bookingResult.value) : [];
        if (!Array.isArray(parsed)) throw new Error('Invalid bookings');
        setBookings(parsed);
      } catch { failed = true; }
      if (orderResult.status === 'fulfilled' && Array.isArray(orderResult.value.orders)) setOrders(orderResult.value.orders);
      else failed = true;
      if (foodResult.status === 'fulfilled' && Array.isArray(foodResult.value)) setFoodOrders(foodResult.value);
      setLoadError(failed);
    });
    return () => { active = false; };
  }, []));

  const activeRide = useMemo(() => {
    return rides.find(item => ['searching', 'requested', 'assigned', 'arrived', 'in_progress'].includes(item.status));
  }, [rides]);

  const activeFoodOrder = useMemo(() => {
    return foodOrders.find(item => ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(item.status));
  }, [foodOrders]);

  const activities = useMemo(() => [
    ...rides.filter(item => SUCCESSFUL_RIDE_STATUSES.includes(item.status)).map(item => ({ ...item, type: 'Rides' })),
    ...foodOrders.map(item => ({ ...item, type: 'Food' })),
    ...orders.map(item => ({ ...item, type: 'Shop' })),
    ...bookings.map(item => ({ ...item, type: 'Home & Spa' })),
  ].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)), [rides, foodOrders, orders, bookings]);
  const visible = filter === 'All' ? activities : activities.filter(item => item.type === filter);

  const renderItem = ({ item }) => {
    const ride = item.type === 'Rides';
    const food = item.type === 'Food';
    const shop = item.type === 'Shop';
    const open = expanded === `${item.type}:${item.id}`;
    const title = ride ? (item.vehicleName || 'UniGo Ride') : food ? (item.restaurantName || 'Food Order') : shop ? (item.shopName || 'Shop order') : (item.service || 'Home & Spa booking');
    const subtitle = ride
      ? `${item.origin || 'Pickup'} → ${item.destination || 'Destination'}`
      : food
      ? (item.items || []).map(line => `${line.quantity} × ${line.name}`).join(', ')
      : shop
      ? (item.lines || []).map(line => `${line.quantity} × ${line.name}`).join(', ')
      : `${item.provider || 'Provider'} · ${item.date || ''} ${item.time || ''}`;
    const status = ride
      ? (RIDE_STATUS[item.status] || item.status || 'Ride')
      : food
      ? (item.status === 'CONFIRMED' ? 'Confirmed' : item.status === 'PREPARING' ? 'Cooking' : item.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : item.status === 'DELIVERED' ? 'Delivered' : item.status === 'CANCELLED' ? 'Cancelled' : item.status)
      : shop
      ? (SHOP_STATUS[item.status] || item.status || 'Order placed')
      : 'Simulated booking';
    const amount = ride
      ? (item.fare != null ? `₹${item.fare}` : 'Fare unavailable')
      : food
      ? (item.total != null ? `₹${Number(item.total).toFixed(2)}` : 'Total unavailable')
      : shop
      ? (item.total != null ? money(item.total) : 'Total unavailable')
      : (item.price != null ? `₹${item.price}` : 'Price unavailable');

    const handlePress = () => {
      if (ride) router.push({ pathname: '/(rider)/trip', params: { id: item.id } });
      else if (food) router.push({ pathname: '/(rider)/food-order', params: { id: item.id } });
      else setExpanded(open ? null : `${item.type}:${item.id}`);
    };

    return <TouchableOpacity style={styles.card} accessibilityRole="button" accessibilityLabel={`${title}, ${status}, view details`} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={[styles.icon, food && { backgroundColor: '#FFF0E5' }]}>
          <Ionicons
            name={ride ? 'car-outline' : food ? 'restaurant-outline' : shop ? 'basket-outline' : 'sparkles-outline'}
            size={22}
            color={food ? '#B85A23' : '#08754e'}
          />
        </View>
        <View style={styles.main}><Text style={styles.title} numberOfLines={1}>{title}</Text><Text style={styles.date}>{dateLabel(item.createdAt)}</Text></View>
        <Text style={styles.amount}>{amount}</Text>
      </View>
      <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      <View style={styles.bottom}>
        <Text style={[styles.status, food && { color: item.status === 'DELIVERED' ? '#08754e' : '#B85A23' }]}>
          {status}{!ride && !food ? ' · Simulation' : ''}
        </Text>
        <Text style={styles.details}>{ride || food ? 'Track order ›' : open ? 'Hide details ›' : 'View details ›'}</Text>
      </View>
      {open && !ride && !food && <View style={styles.expanded}>
        {shop ? <>
          <Text style={styles.detail}>Delivery: {[item.address?.addressLine, item.address?.area].filter(Boolean).join(', ') || 'Not available'}</Text>
          {(item.lines || []).map((line, index) => <Text key={`${line.id || line.name}-${index}`} style={styles.detail}>{line.quantity} × {line.name} {line.price != null ? `· ${money(line.price * line.quantity)}` : ''}</Text>)}
          <Text style={styles.detail}>Payment: {item.paymentLabel || (item.payment === 'online' ? 'Online' : 'Cash on delivery')} · simulated</Text>
          <Text style={styles.note}>Simulation only. No shop was contacted or delivery arranged.</Text>
        </> : <>
          <Text style={styles.detail}>Provider: {item.provider || 'Not available'}</Text>
          <Text style={styles.detail}>Appointment: {item.date || 'Date unavailable'} {item.time || ''}</Text>
          <Text style={styles.detail}>Location: {item.address || 'Not available'}</Text>
          <Text style={styles.note}>Simulation only. No provider was contacted or payment taken.</Text>
        </>}
      </View>}
    </TouchableOpacity>;
  };

  return <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}><Text style={styles.heading}>Activity</Text><Text style={styles.headerSub}>Your rides, orders and bookings</Text></View>
    <View style={styles.filters}>{FILTERS.map(option => <TouchableOpacity key={option} onPress={() => setFilter(option)} accessibilityRole="button" accessibilityState={{ selected: filter === option }} style={[styles.filter, filter === option && styles.filterActive]}><Text style={[styles.filterText, filter === option && styles.filterTextActive]}>{option}</Text></TouchableOpacity>)}</View>
    {activeRide && (filter === 'All' || filter === 'Rides') && (
      <TouchableOpacity
        style={styles.activeRideCard}
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/(rider)/trip', params: { id: activeRide.id } })}
      >
        <View style={styles.activeIcon}>
          <Ionicons name="navigate" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeTitle}>Active Ride in Progress</Text>
          <Text style={styles.activeRoute} numberOfLines={1}>{activeRide.origin} → {activeRide.destination}</Text>
        </View>
        <Text style={styles.activeAction}>Track ›</Text>
      </TouchableOpacity>
    )}
    {activeFoodOrder && (filter === 'All' || filter === 'Food') && (
      <TouchableOpacity
        style={[styles.activeRideCard, { backgroundColor: '#B85A23' }]}
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/(rider)/food-order', params: { id: activeFoodOrder.id } })}
      >
        <View style={styles.activeIcon}>
          <Ionicons name="restaurant" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeTitle}>Active Food Order · {activeFoodOrder.status === 'CONFIRMED' ? 'Confirmed' : activeFoodOrder.status === 'PREPARING' ? 'Cooking' : 'Out for Delivery'}</Text>
          <Text style={styles.activeRoute} numberOfLines={1}>{activeFoodOrder.restaurantName} · ₹{Number(activeFoodOrder.total).toFixed(2)}</Text>
        </View>
        <Text style={styles.activeAction}>Track ›</Text>
      </TouchableOpacity>
    )}
    {loadError && <Text style={styles.error}>Some activities could not be loaded. Reopen this screen to try again.</Text>}
    <FlatList data={visible} keyExtractor={item => `${item.type}:${item.id}`} renderItem={renderItem} contentContainerStyle={visible.length ? styles.list : styles.emptyList} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.empty}><Ionicons name="receipt-outline" size={38} color="#08754e" /><Text style={styles.emptyTitle}>{!isLoaded ? 'Loading activity…' : filter === 'All' ? 'No activity yet' : `No ${filter.toLowerCase()} yet`}</Text><Text style={styles.emptyText}>Your activity will appear here when you make a booking or order.</Text></View>} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f9f7' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 15 },
  heading: { fontSize: 26, fontWeight: '800', color: '#17372a' },
  headerSub: { fontSize: 13, color: '#718178', marginTop: 3 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce8e0' },
  filterActive: { backgroundColor: '#08754e', borderColor: '#08754e' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#52665a' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyList: { flexGrow: 1, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#e3ece6' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#e8f5ed', alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: '#193a2c' },
  date: { fontSize: 12, color: '#78877e', marginTop: 3 },
  amount: { fontSize: 15, fontWeight: '800', color: '#193a2c' },
  subtitle: { color: '#52665b', fontSize: 13, lineHeight: 19, marginTop: 12 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#edf2ee' },
  status: { flex: 1, color: '#08754e', fontWeight: '700', fontSize: 12 },
  details: { color: '#52665b', fontWeight: '700', fontSize: 12 },
  expanded: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#edf2ee', gap: 6 },
  detail: { color: '#40564a', fontSize: 13, lineHeight: 19 },
  note: { color: '#78877e', fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { color: '#a24032', paddingHorizontal: 18, paddingBottom: 10, fontSize: 12 },
  activeRideCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0f7a56', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
  activeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  activeTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  activeRoute: { color: '#d1fae5', fontSize: 12, marginTop: 2 },
  activeAction: { color: '#fff', fontSize: 13, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35 },
  emptyTitle: { color: '#193a2c', fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#78877e', textAlign: 'center', lineHeight: 20, marginTop: 6 },
});
