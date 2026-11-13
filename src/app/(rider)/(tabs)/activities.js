import React, { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useActivity } from '../../../context/ActivityProvider';
import { loadDemo, money } from '../../../services/shopDemo';

const FILTERS = ['All', 'Rides', 'Shop', 'Home & Spa'];
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
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.allSettled([AsyncStorage.getItem('@unigo_home_spa_demo_bookings'), loadDemo()]).then(([bookingResult, orderResult]) => {
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
      setLoadError(failed);
    });
    return () => { active = false; };
  }, []));

  const activities = useMemo(() => [
    ...rides.map(item => ({ ...item, type: 'Rides' })),
    ...orders.map(item => ({ ...item, type: 'Shop' })),
    ...bookings.map(item => ({ ...item, type: 'Home & Spa' })),
  ].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)), [rides, orders, bookings]);
  const visible = filter === 'All' ? activities : activities.filter(item => item.type === filter);

  const renderItem = ({ item }) => {
    const ride = item.type === 'Rides';
    const shop = item.type === 'Shop';
    const open = expanded === `${item.type}:${item.id}`;
    const title = ride ? (item.vehicleName || 'UniGo Ride') : shop ? (item.shopName || 'Shop order') : (item.service || 'Home & Spa booking');
    const subtitle = ride ? `${item.origin || 'Pickup'} → ${item.destination || 'Destination'}` : shop ? (item.lines || []).map(line => `${line.quantity} × ${line.name}`).join(', ') : `${item.provider || 'Provider'} · ${item.date || ''} ${item.time || ''}`;
    const status = ride ? (RIDE_STATUS[item.status] || item.status || 'Ride') : shop ? (SHOP_STATUS[item.status] || item.status || 'Order placed') : 'Simulated booking';
    const amount = ride ? (item.fare != null ? `₹${item.fare}` : 'Fare unavailable') : shop ? (item.total != null ? money(item.total) : 'Total unavailable') : (item.price != null ? `₹${item.price}` : 'Price unavailable');
    return <TouchableOpacity style={styles.card} accessibilityRole="button" accessibilityLabel={`${title}, ${status}, view details`} onPress={() => ride ? router.push({ pathname: '/(rider)/trip', params: { id: item.id } }) : setExpanded(open ? null : `${item.type}:${item.id}`)} activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={styles.icon}><Ionicons name={ride ? 'car-outline' : shop ? 'basket-outline' : 'sparkles-outline'} size={22} color="#08754e" /></View>
        <View style={styles.main}><Text style={styles.title} numberOfLines={1}>{title}</Text><Text style={styles.date}>{dateLabel(item.createdAt)}</Text></View>
        <Text style={styles.amount}>{amount}</Text>
      </View>
      <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      <View style={styles.bottom}><Text style={styles.status}>{status}{!ride || item.simulated ? ' · Simulation' : ''}</Text><Text style={styles.details}>{open ? 'Hide details' : 'View details'}  ›</Text></View>
      {open && !ride && <View style={styles.expanded}>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35 },
  emptyTitle: { color: '#193a2c', fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#78877e', textAlign: 'center', lineHeight: 20, marginTop: 6 },
});
