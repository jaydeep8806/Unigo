import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/LeafletMap';
import { useActivity } from '../../context/ActivityProvider';
import { useWallet } from '../../context/WalletProvider';
import { getDemoDriver } from '../../services/mockRide';

const ACTIVE = ['searching', 'assigned', 'arrived', 'in_progress'];

export default function TripScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rides, isLoaded, updateRide, cancelRide } = useActivity();
  const { balance, deductMoney } = useWallet();
  const ride = rides.find((item) => item.id === id);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [tags, setTags] = useState([]);
  const [method, setMethod] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!ride || !['searching', 'assigned'].includes(ride.status)) return undefined;
    const timer = setTimeout(() => {
      if (ride.status === 'searching') updateRide(ride.id, { status: 'assigned', driver: getDemoDriver(ride.vehicleId) });
      else updateRide(ride.id, { status: 'arrived' });
    }, ride.status === 'searching' ? 4000 : 6000);
    return () => clearTimeout(timer);
  }, [ride, updateRide]);

  useEffect(() => {
    if (!ride || ride.status !== 'in_progress' || !ride.startedAt) return undefined;
    const timer = setInterval(() => {
      const fraction = Math.min(1, Math.max(0, (Date.now() - new Date(ride.startedAt).getTime()) / 30000));
      setProgress(fraction);
      if (fraction >= 1) {
        clearInterval(timer);
        updateRide(ride.id, { status: 'completed', completedAt: new Date().toISOString() });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [ride, updateRide]);

  const markers = useMemo(() => {
    if (!ride?.pickupCoords || !ride?.destinationCoords) return [];
    const pickup = ride.pickupCoords;
    const drop = ride.destinationCoords;
    const list = [
      { lat: pickup.latitude, lng: pickup.longitude, label: 'Pickup', color: '#0f7a56' },
      { lat: drop.latitude, lng: drop.longitude, label: 'Destination', color: '#ef4444' },
    ];
    if (['assigned', 'arrived', 'in_progress'].includes(ride.status)) {
      const fraction = ride.status === 'in_progress' ? progress : 0;
      const routePoint = ride.routeCoords?.length ? ride.routeCoords[Math.min(ride.routeCoords.length - 1, Math.floor(fraction * (ride.routeCoords.length - 1)))] : null;
      list.push({ lat: routePoint?.[0] ?? pickup.latitude + (drop.latitude - pickup.latitude) * fraction, lng: routePoint?.[1] ?? pickup.longitude + (drop.longitude - pickup.longitude) * fraction, label: 'Demo driver', color: '#2563eb' });
    }
    return list;
  }, [ride, progress]);

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
      if (selected === 'UniGo Wallet' && !await deductMoney(ride.fare, `Demo ride to ${ride.destination}`)) throw new Error('Wallet payment failed');
      await updateRide(ride.id, { status: 'paid', paymentType: selected, paidAt: new Date().toISOString() });
      setError('');
    } catch { setError('Payment could not be completed. Try again.'); }
    finally { setBusy(false); }
  };

  if (!ride) return <SafeAreaView style={styles.empty}>{!isLoaded && <ActivityIndicator color="#0f7a56" />}<Text style={styles.muted}>{isLoaded ? 'This ride is no longer available.' : 'Loading ride…'}</Text><TouchableOpacity onPress={() => router.replace('/(rider)/(tabs)/activities')}><Text style={styles.link}>Back to activity</Text></TouchableOpacity></SafeAreaView>;
  const point = ride.pickupCoords || { latitude: 22.3039, longitude: 70.8022 };
  const status = ride.status;
  const title = { searching: 'Finding a driver nearby', assigned: 'Your driver is on the way', arrived: 'Your driver has arrived', in_progress: 'Ride in progress', completed: 'You have arrived!', payment_pending: 'Complete payment', paid: 'Payment successful', rated: 'Thank you for riding', cancelled: 'Ride cancelled', confirmed: 'Ride details' }[status] || 'Ride details';
  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill}><LeafletMap center={{ lat: point.latitude, lng: point.longitude }} markers={markers} route={ride.routeCoords || []} fitBounds={ride.destinationCoords ? [[point.latitude, point.longitude], [ride.destinationCoords.latitude, ride.destinationCoords.longitude]] : null} /></View>
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none"><TouchableOpacity style={styles.back} onPress={() => router.replace('/(rider)/(tabs)/activities')}><Ionicons name="arrow-back" size={22} color="#142f27" /></TouchableOpacity><Text style={styles.demo}>DEMO RIDE</Text></SafeAreaView>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.handle} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.muted}>Simulation · no real driver or payment is connected</Text>
          {status === 'searching' && <View style={styles.finding}><ActivityIndicator color="#0f7a56" /><Text style={styles.text}>Looking for a {ride.vehicleName}…</Text></View>}
          {['assigned', 'arrived', 'in_progress'].includes(status) && ride.driver && <View style={styles.card}><View style={styles.driverRow}><View style={styles.avatar}><Ionicons name="person" size={25} color="#fff" /></View><View style={{ flex: 1 }}><Text style={styles.strong}>{ride.driver.name} · ★ {ride.driver.rating}</Text><Text style={styles.muted}>{ride.driver.vehicleColor} {ride.driver.vehicleModel}</Text><Text style={styles.strong}>{ride.driver.vehicleNumber}</Text>{status === 'assigned' && <Text style={styles.muted}>Estimated arrival: 3 min · demo</Text>}</View><View><TouchableOpacity onPress={() => Alert.alert('Demo ride', 'Calling is available when a real driver is assigned.')}><Ionicons name="call-outline" size={23} color="#0f7a56" /></TouchableOpacity><TouchableOpacity onPress={() => Alert.alert('Demo ride', 'Messaging is available when a real driver is assigned.')}><Ionicons name="chatbubble-outline" size={23} color="#0f7a56" /></TouchableOpacity></View></View></View>}
          {status === 'arrived' && <View style={styles.card}><Text style={styles.strong}>Ride start code: {ride.otp}</Text><Text style={styles.muted}>Enter the demo code to start the ride.</Text><TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={4} placeholder="Enter 4-digit OTP" accessibilityLabel="Ride start OTP" /><Button label="Verify and start ride" disabled={busy || otp.length !== 4} onPress={() => otp === ride.otp ? change({ status: 'in_progress', startedAt: new Date().toISOString() }) : setError('That code is incorrect. Try again.')} /></View>}
          {status === 'in_progress' && <View style={styles.card}><Text style={styles.strong}>Heading to {ride.destination}</Text><Text style={styles.muted}>Simulated location · {((ride.distanceKm || 0) * (1 - progress)).toFixed(1)} km · about {Math.max(1, Math.ceil((ride.durationMins || 1) * (1 - progress)))} min remaining</Text><View style={styles.row}><TouchableOpacity onPress={() => Share.share({ message: `UniGo demo trip: ${ride.origin} to ${ride.destination}` })}><Text style={styles.link}>Share trip</Text></TouchableOpacity><TouchableOpacity onPress={() => Linking.openURL('tel:112')}><Text style={styles.emergency}>Emergency · 112</Text></TouchableOpacity></View><Button label="Complete demo ride" disabled={busy} onPress={() => change({ status: 'completed', completedAt: new Date().toISOString() })} /></View>}
          {status === 'completed' && <View style={styles.card}><Text style={styles.strong}>{ride.origin} → {ride.destination}</Text><Text style={styles.muted}>{ride.distanceKm} km · {ride.durationMins} min · {ride.vehicleName}</Text><Text style={styles.price}>₹{ride.fare}</Text><Button label="Proceed to payment" disabled={busy} onPress={() => change({ status: 'payment_pending' })} /></View>}
          {status === 'payment_pending' && <View style={styles.card}><Text style={styles.price}>₹{ride.fare}</Text><Text style={styles.muted}>Demo payment · no real transaction</Text>{['Cash', 'UPI', 'Card', 'UniGo Wallet'].map((item) => <TouchableOpacity key={item} style={styles.choice} onPress={() => setMethod(item)}><Text style={styles.text}>{item}{item === 'UniGo Wallet' ? ` · ₹${Number(balance).toFixed(2)}` : ''}</Text><Ionicons name={(method || ride.paymentType || 'Cash') === item ? 'radio-button-on' : 'radio-button-off'} size={21} color="#0f7a56" /></TouchableOpacity>)}<Button label={`Pay ₹${ride.fare} (demo)`} disabled={busy} onPress={pay} /></View>}
          {status === 'paid' && <View style={styles.card}><Text style={styles.strong}>How was your ride?</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((n) => <TouchableOpacity key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} stars`}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color="#e8a31a" /></TouchableOpacity>)}</View><View style={styles.tags}>{['Great driver', 'Safe ride', 'Clean vehicle', 'Friendly driver', 'Smooth ride'].map((tag) => <TouchableOpacity key={tag} style={[styles.tag, tags.includes(tag) && styles.tagSelected]} onPress={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}><Text style={styles.text}>{tag}</Text></TouchableOpacity>)}</View><TextInput style={styles.input} value={feedback} onChangeText={setFeedback} placeholder="Add optional feedback" maxLength={300} /><Button label="Submit rating" disabled={!rating || busy} onPress={() => change({ status: 'rated', rating, feedback, feedbackTags: tags })} /></View>}
          {['rated', 'cancelled', 'confirmed'].includes(status) && <View style={styles.card}><Text style={styles.strong}>{ride.origin} → {ride.destination}</Text><Text style={styles.muted}>{new Date(ride.createdAt).toLocaleDateString()} · {ride.vehicleName}</Text><Text style={styles.muted}>{ride.distanceKm} km · {ride.durationMins} min · {ride.paymentType || 'Cash'}</Text><Text style={styles.price}>₹{ride.fare}</Text>{ride.driver?.name && <Text style={styles.muted}>Driver: {ride.driver.name} · {ride.driver.vehicleNumber}</Text>}{ride.rating && <Text style={styles.muted}>Your rating: {ride.rating} / 5</Text>}</View>}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {ACTIVE.includes(status) && status !== 'in_progress' && <TouchableOpacity style={styles.cancel} onPress={async () => { await cancelRide(ride.id); }}><Text style={styles.cancelText}>Cancel demo ride</Text></TouchableOpacity>}
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
  finding: { flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 20 }, card: { marginTop: 16, borderRadius: 16, padding: 16, backgroundColor: '#f3f8f5', gap: 8 }, driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f7a56', alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: '#d1dfd7', backgroundColor: '#fff', borderRadius: 10, padding: 12, color: '#173a2c' }, button: { backgroundColor: '#0f7a56', borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' }, row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, link: { color: '#0f7a56', fontWeight: '700' }, emergency: { color: '#c53030', fontWeight: '700' }, choice: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }, stars: { flexDirection: 'row', gap: 10, marginVertical: 8 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tag: { borderWidth: 1, borderColor: '#d1dfd7', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }, tagSelected: { backgroundColor: '#d6f2e0', borderColor: '#0f7a56' }, cancel: { alignItems: 'center', padding: 16 }, cancelText: { color: '#b91c1c', fontWeight: '700' }, error: { color: '#b91c1c', marginTop: 12 },
});
