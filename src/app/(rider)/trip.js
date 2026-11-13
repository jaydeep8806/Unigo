import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/LeafletMap';
import { useActivity } from '../../context/ActivityProvider';
import { useWallet } from '../../context/WalletProvider';
import { asActivity, driverAction, watchRides } from '../../services/drivers';

const ACTIVE = ['searching', 'requested', 'assigned', 'arrived', 'in_progress'];

export default function TripScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rides, isLoaded, updateRide, cancelRide } = useActivity();
  const { balance, deductMoney } = useWallet();
  const ride = rides.find((item) => item.id === id);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [tags, setTags] = useState([]);
  const [method, setMethod] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);


  useEffect(() => {
    if (!ride?.backend) return undefined;
    let mounted = true; let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const row = await driverAction('sync', { id });
        if (mounted) {
          const next = asActivity(row);
          if (row.status === 'completed' && ['payment_pending','paid','rated'].includes(ride.status)) next.status = ride.status;
          await updateRide(id, next);
          setError('');
        }
      } catch (e) { if (mounted) setError(e.message); }
      finally { fetching = false; }
    };
    refresh();
    const stop = watchRides('id=eq.' + id, refresh);
    return () => { mounted = false; stop(); };
  }, [id, ride?.backend, ride?.status, updateRide]);

  const markers = useMemo(() => {
    if (!ride?.pickupCoords || !ride?.destinationCoords) return [];
    const pickup = ride.pickupCoords;
    const drop = ride.destinationCoords;
    const list = [
      { lat: pickup.latitude, lng: pickup.longitude, label: 'Pickup', color: '#0f7a56' },
      { lat: drop.latitude, lng: drop.longitude, label: 'Destination', color: '#ef4444' },
    ];
    if (ride.driver?.latitude != null && ['assigned','arrived','in_progress'].includes(ride.status)) {
      list.push({ lat: ride.driver.latitude, lng: ride.driver.longitude, label: 'Driver', color: '#2563eb' });
    }
    return list;
  }, [ride]);

  const change = async (values) => {
    if (!ride || busy) return;
    setBusy(true);
    try { await updateRide(ride.id, values); setError(''); }
    catch { setError('Could not save the ride. Please try again.'); }
    finally { setBusy(false); }
  };

  const pay = async () => {
    const selected = method || ride.paymentType || 'Cash';
    if (selected === 'UniGo Wallet' && balance < ride.fare) {
      setError('Your wallet balance is too low. Choose another payment method.');
      return;
    }
    setBusy(true);
    try {
      if (selected === 'UniGo Wallet' && !await deductMoney(ride.fare, `Ride to ${ride.destination}`)) throw new Error('Wallet payment failed');
      await updateRide(ride.id, { status: 'paid', paymentType: selected, paidAt: new Date().toISOString() });
      setError('');
    } catch { setError('Payment could not be completed. Try again.'); }
    finally { setBusy(false); }
  };

  if (!ride) return <SafeAreaView style={styles.empty}>{!isLoaded && <ActivityIndicator color="#0f7a56" />}<Text style={styles.muted}>{isLoaded ? 'This ride is no longer available.' : 'Loading ride…'}</Text><TouchableOpacity onPress={() => router.replace('/(rider)/(tabs)/activities')}><Text style={styles.link}>Back to activity</Text></TouchableOpacity></SafeAreaView>;
  const point = ride.pickupCoords || { latitude: 22.3039, longitude: 70.8022 };
  const status = ride.status;
  const title = { searching: 'Finding a driver nearby', requested: 'Waiting for driver acceptance', unavailable: 'No drivers available', assigned: 'Your driver is on the way', arrived: 'Your driver has arrived', in_progress: 'Ride in progress', completed: 'You have arrived!', payment_pending: 'Complete payment', paid: 'Payment successful', rated: 'Thank you for riding', cancelled: 'Ride cancelled', confirmed: 'Ride details' }[status] || 'Ride details';
  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill}><LeafletMap center={{ lat: point.latitude, lng: point.longitude }} markers={markers} route={ride.routeCoords || []} fitPadding={{ top: insets.top + 70, bottom: sheetHeight + 20 }} fitBounds={ride.destinationCoords ? [[point.latitude, point.longitude], [ride.destinationCoords.latitude, ride.destinationCoords.longitude]] : null} /></View>
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none"><TouchableOpacity style={styles.back} onPress={() => router.replace('/(rider)/(tabs)/activities')}><Ionicons name="arrow-back" size={22} color="#142f27" /></TouchableOpacity><Text style={styles.demo}>UNIGO RIDE</Text></SafeAreaView>
      <View onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.handle} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.muted}>{ride.simulated ? 'Simulated ride · no human driver will arrive' : 'Connected to the UNIGO driver network'}</Text>
          <View style={styles.routeSummary}><Text style={styles.routeLabel}>PICKUP</Text><Text style={styles.text}>{ride.origin || 'Unavailable'}</Text><Text style={styles.routeLabel}>DESTINATION</Text><Text style={styles.text}>{ride.destination || 'Unavailable'}</Text></View>
          {['searching','requested'].includes(status) && <View style={styles.finding}><ActivityIndicator color="#0f7a56" /><Text style={styles.text}>Looking for a {ride.vehicleName}…</Text></View>}
          {['assigned', 'arrived', 'in_progress'].includes(status) && ride.driver && <View style={styles.card}><View style={styles.driverRow}><View style={styles.avatar}><Ionicons name="person" size={25} color="#fff" /></View><View style={{ flex: 1 }}><Text style={styles.strong}>{ride.driver.name}</Text><Text style={styles.muted}>{ride.driver.vehicleColor} {ride.driver.vehicleModel}</Text><Text style={styles.strong}>{ride.driver.vehicleNumber}</Text>{status === 'assigned' && <Text style={styles.muted}>Your driver is travelling to pickup</Text>}</View><View><TouchableOpacity onPress={() => Alert.alert('Contact driver', 'In-app calling is not connected yet.')}><Ionicons name="call-outline" size={23} color="#0f7a56" /></TouchableOpacity><TouchableOpacity onPress={() => Alert.alert('Contact driver', 'In-app messaging is not connected yet.')}><Ionicons name="chatbubble-outline" size={23} color="#0f7a56" /></TouchableOpacity></View></View></View>}
          {['assigned','arrived'].includes(status) && <View style={styles.card}><Text style={styles.strong}>Ride start code: {ride.otp}</Text><Text style={styles.muted}>Share this code with your driver only at pickup. Your driver starts the trip.</Text></View>}
          {status === 'in_progress' && <View style={styles.card}><Text style={styles.strong}>Heading to {ride.destination}</Text><Text style={styles.muted}>{ride.simulated ? 'Simulated trip in progress' : 'Driver location updates while their app is open.'}</Text><View style={styles.row}><TouchableOpacity onPress={() => Share.share({ message: 'UNIGO trip: ' + ride.origin + ' to ' + ride.destination })}><Text style={styles.link}>Share trip</Text></TouchableOpacity><TouchableOpacity onPress={() => Linking.openURL('tel:112')}><Text style={styles.emergency}>Emergency · 112</Text></TouchableOpacity></View></View>}
          {status === 'unavailable' && <View style={styles.card}><Text style={styles.muted}>No compatible drivers are available near your pickup. Please try again shortly.</Text><Button label="Choose another ride" onPress={() => router.replace('/(rider)/book')} /></View>}
          {status === 'completed' && <View style={styles.card}><Text style={styles.strong}>{ride.origin} → {ride.destination}</Text><Text style={styles.muted}>{ride.distanceKm} km · {ride.durationMins} min · {ride.vehicleName}</Text><Text style={styles.price}>₹{ride.fare}</Text><Button label="Proceed to payment" disabled={busy} onPress={() => change({ status: 'payment_pending' })} /></View>}
          {status === 'payment_pending' && <View style={styles.card}><Text style={styles.price}>₹{ride.fare}</Text><Text style={styles.muted}>Payment simulation · no real transaction</Text>{['Cash', 'UPI', 'Card', 'UniGo Wallet'].map((item) => <TouchableOpacity key={item} style={styles.choice} onPress={() => setMethod(item)}><Text style={styles.text}>{item}{item === 'UniGo Wallet' ? ` · ₹${Number(balance).toFixed(2)}` : ''}</Text><Ionicons name={(method || ride.paymentType || 'Cash') === item ? 'radio-button-on' : 'radio-button-off'} size={21} color="#0f7a56" /></TouchableOpacity>)}<Button label={`Pay ₹${ride.fare} (simulation)`} disabled={busy} onPress={pay} /></View>}
          {status === 'paid' && <View style={styles.card}><Text style={styles.strong}>How was your ride?</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((n) => <TouchableOpacity key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} stars`}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color="#e8a31a" /></TouchableOpacity>)}</View><View style={styles.tags}>{['Great driver', 'Safe ride', 'Clean vehicle', 'Friendly driver', 'Smooth ride'].map((tag) => <TouchableOpacity key={tag} style={[styles.tag, tags.includes(tag) && styles.tagSelected]} onPress={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}><Text style={styles.text}>{tag}</Text></TouchableOpacity>)}</View><TextInput style={styles.input} value={feedback} onChangeText={setFeedback} placeholder="Add optional feedback" maxLength={300} /><Button label="Submit rating" disabled={!rating || busy} onPress={() => change({ status: 'rated', rating, feedback, feedbackTags: tags })} /></View>}
          {['rated', 'cancelled', 'confirmed'].includes(status) && <View style={styles.card}><Text style={styles.strong}>{ride.origin} → {ride.destination}</Text><Text style={styles.muted}>{new Date(ride.createdAt).toLocaleDateString()} · {ride.vehicleName}</Text><Text style={styles.muted}>{ride.distanceKm} km · {ride.durationMins} min · {ride.paymentType || 'Cash'}</Text><Text style={styles.price}>₹{ride.fare}</Text>{ride.driver?.name && <Text style={styles.muted}>Driver: {ride.driver.name} · {ride.driver.vehicleNumber}</Text>}{ride.rating && <Text style={styles.muted}>Your rating: {ride.rating} / 5</Text>}</View>}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {ACTIVE.includes(status) && status !== 'in_progress' && <TouchableOpacity style={styles.cancel} onPress={async () => { try { await cancelRide(ride.id); } catch (e) { setError(e.message); } }}><Text style={styles.cancelText}>Cancel ride</Text></TouchableOpacity>}
          {['rated', 'cancelled', 'confirmed'].includes(status) && <Button label="View activity" onPress={() => router.replace('/(rider)/(tabs)/activities')} />}
        </ScrollView>
      </View>
    </View>
  );
}

function Button({ label, onPress, disabled }) {
  return <TouchableOpacity style={[styles.button, disabled && { opacity: 0.5 }]} onPress={onPress} disabled={disabled}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f5' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  top: { position: 'absolute', left: 16, right: 16, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, demo: { color: '#0f7a56', backgroundColor: '#fff', padding: 10, borderRadius: 14, fontSize: 11, fontWeight: '800' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '65%', backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, elevation: 14 }, handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#d1dad5', alignSelf: 'center', marginTop: 10 }, scroll: { flexShrink: 1 }, content: { padding: 20 },
  title: { fontSize: 21, fontWeight: '800', color: '#132f26' }, muted: { fontSize: 12, color: '#71837c', lineHeight: 19, marginTop: 4 }, text: { fontSize: 14, color: '#263b34' }, strong: { color: '#173a2c', fontSize: 15, fontWeight: '800' }, price: { color: '#0f7a56', fontSize: 25, fontWeight: '800', marginVertical: 8 },
  routeSummary: { marginTop: 12, gap: 3 }, routeLabel: { color: '#71837c', fontSize: 10, fontWeight: '700', marginTop: 4 },
  finding: { flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 20 }, card: { marginTop: 16, borderRadius: 16, padding: 16, backgroundColor: '#f3f8f5', gap: 8 }, driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f7a56', alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: '#d1dfd7', backgroundColor: '#fff', borderRadius: 10, padding: 12, color: '#173a2c' }, button: { backgroundColor: '#0f7a56', borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' }, row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, link: { color: '#0f7a56', fontWeight: '700' }, emergency: { color: '#c53030', fontWeight: '700' }, choice: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }, stars: { flexDirection: 'row', gap: 10, marginVertical: 8 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tag: { borderWidth: 1, borderColor: '#d1dfd7', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }, tagSelected: { backgroundColor: '#d6f2e0', borderColor: '#0f7a56' }, cancel: { alignItems: 'center', padding: 16 }, cancelText: { color: '#b91c1c', fontWeight: '700' }, error: { color: '#b91c1c', marginTop: 12 },
});
