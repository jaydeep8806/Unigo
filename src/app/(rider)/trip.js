import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/LeafletMap';
import { useActivity } from '../../context/ActivityProvider';
import { useWallet } from '../../context/WalletProvider';
import { asActivity, driverAction, watchRides } from '../../services/drivers';

const ACTIVE = ['searching', 'requested', 'assigned', 'arrived', 'in_progress'];

/* ─── Fake driver pool for local simulation ──────────────────────── */
const FAKE_DRIVERS = {
  bike: [
    { name: 'Ramesh Patel', rating: '4.8', trips: '1,420', vehicleModel: 'Honda Activa', vehicleColor: 'Black', vehicleNumber: 'GJ 03 AB 4821' },
    { name: 'Suresh Kumar', rating: '4.7', trips: '980', vehicleModel: 'TVS Jupiter', vehicleColor: 'Blue', vehicleNumber: 'GJ 01 CD 3456' },
    { name: 'Vikram Singh', rating: '4.9', trips: '2,150', vehicleModel: 'Honda Dio', vehicleColor: 'Red', vehicleNumber: 'GJ 05 EF 7890' },
  ],
  auto: [
    { name: 'Bharat Joshi', rating: '4.6', trips: '3,200', vehicleModel: 'Auto Rickshaw', vehicleColor: 'Green & Yellow', vehicleNumber: 'GJ 03 CD 2364' },
    { name: 'Dinesh Sharma', rating: '4.5', trips: '2,800', vehicleModel: 'Auto Rickshaw', vehicleColor: 'Green & Yellow', vehicleNumber: 'GJ 01 GH 1234' },
  ],
  car: [
    { name: 'Amit Desai', rating: '4.8', trips: '1,850', vehicleModel: 'Maruti Swift', vehicleColor: 'White', vehicleNumber: 'GJ 03 EF 8912' },
    { name: 'Rajesh Mehta', rating: '4.7', trips: '2,340', vehicleModel: 'Hyundai i20', vehicleColor: 'Silver', vehicleNumber: 'GJ 01 JK 5678' },
  ],
  sedan: [
    { name: 'Prakash Nair', rating: '4.9', trips: '4,120', vehicleModel: 'Honda City', vehicleColor: 'Silver', vehicleNumber: 'GJ 03 GH 5678' },
    { name: 'Mahesh Verma', rating: '4.8', trips: '3,560', vehicleModel: 'Maruti Ciaz', vehicleColor: 'White', vehicleNumber: 'GJ 05 LM 9012' },
  ],
};
function pickDriver(vehicleId) {
  const pool = FAKE_DRIVERS[vehicleId] || FAKE_DRIVERS.bike;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ─── Pulsing radar animation component ──────────────────────────── */
function PulsingRadar() {
  const scale = useMemo(() => new Animated.Value(0.4), []);
  const opacity = useMemo(() => new Animated.Value(0.7), []);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.6, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={sim.radarWrap}>
      <Animated.View style={[sim.radarRing, { transform: [{ scale }], opacity }]} />
      <View style={sim.radarDot}>
        <Ionicons name="car-sport" size={18} color="#fff" />
      </View>
    </View>
  );
}

/* ─── Animated progress bar ──────────────────────────────────────── */
function ProgressBar({ durationMs }) {
  const progress = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: false }).start();
  }, [progress, durationMs]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={sim.progressTrack}>
      <Animated.View style={[sim.progressFill, { width }]} />
    </View>
  );
}

/* ─── Animated status badge ──────────────────────────────────────── */
function StatusBadge({ icon, label, color }) {
  const fadeIn = useMemo(() => new Animated.Value(0), []);
  const slideUp = useMemo(() => new Animated.Value(12), []);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);
  return (
    <Animated.View style={[sim.badge, { backgroundColor: color, opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={sim.badgeText}>{label}</Text>
    </Animated.View>
  );
}

/* ═════════════════════════════════════════════════════════════════ */
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

  const simDuration = useMemo(
    () => Math.min(Math.max((ride?.durationMins || 5) * 800, 5000), 12000),
    [ride?.durationMins]
  );
  const simEta = useMemo(() => {
    switch (ride?.status) {
      case 'searching': return 'Finding nearby drivers…';
      case 'assigned': return 'Driver heading to pickup…';
      case 'arrived': return 'Driver waiting at pickup…';
      case 'in_progress': return 'En route to destination…';
      default: return '';
    }
  }, [ride?.status]);

  /* ─── Backend sync (existing rides from Supabase) ──────────── */
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

  /* ─── LOCAL simulation auto-progression ────────────────────── */
  useEffect(() => {
    if (!ride || ride.backend) return undefined;
    const status = ride.status;
    const timers = [];

    if (status === 'searching') {
      // After 3–5 s → assign a fake driver
      const delay = 3000 + Math.random() * 2000;
      timers.push(setTimeout(async () => {
        const driver = pickDriver(ride.vehicleId);
        const lat = ride.pickupCoords?.latitude || 22.3;
        const lng = ride.pickupCoords?.longitude || 70.8;
        await updateRide(ride.id, {
          status: 'assigned',
          driver: { ...driver, latitude: lat + (Math.random() - 0.5) * 0.008, longitude: lng + (Math.random() - 0.5) * 0.008 },
        });
      }, delay));
    }

    if (status === 'assigned') {
      // After 5–8 s → driver arrives at pickup
      const delay = 5000 + Math.random() * 3000;
      timers.push(setTimeout(async () => {
        await updateRide(ride.id, {
          status: 'arrived',
          driver: { ...ride.driver, latitude: ride.pickupCoords?.latitude, longitude: ride.pickupCoords?.longitude },
        });
      }, delay));
    }

    if (status === 'arrived') {
      // After 4–6 s → trip starts (driver enters OTP)
      const delay = 4000 + Math.random() * 2000;
      timers.push(setTimeout(async () => {
        await updateRide(ride.id, { status: 'in_progress' });
      }, delay));
    }

    if (status === 'in_progress') {
      // Scaled trip duration (capped at 12 s for demo)
      timers.push(setTimeout(async () => {
        await updateRide(ride.id, { status: 'completed' });
      }, simDuration));
    }

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, ride?.status, ride?.backend, simDuration]);

  /* ─── Map markers ──────────────────────────────────────────── */
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

  /* ─── Ride actions ─────────────────────────────────────────── */
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

  /* ─── Loading / not-found guard ────────────────────────────── */
  if (!ride) return (
    <SafeAreaView style={styles.empty}>
      {!isLoaded && <ActivityIndicator color="#0f7a56" />}
      <Text style={styles.muted}>{isLoaded ? 'This ride is no longer available.' : 'Loading ride…'}</Text>
      <TouchableOpacity onPress={() => router.replace('/(rider)/(tabs)/activities')}>
        <Text style={styles.link}>Back to activity</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const point = ride.pickupCoords || { latitude: 22.3039, longitude: 70.8022 };
  const status = ride.status;
  const title = {
    searching: 'Finding a driver nearby',
    requested: 'Waiting for driver acceptance',
    unavailable: 'No drivers available',
    assigned: 'Your driver is on the way',
    arrived: 'Your driver has arrived',
    in_progress: 'Ride in progress',
    completed: 'You have arrived!',
    payment_pending: 'Complete payment',
    paid: 'Payment successful',
    rated: 'Thank you for riding',
    cancelled: 'Ride cancelled',
    confirmed: 'Ride details',
  }[status] || 'Ride details';

  /* ═════════════════════════════════════════════════════════════ */
  return (
    <View style={styles.screen}>
      {/* Full-screen Map */}
      <View style={StyleSheet.absoluteFill}>
        <LeafletMap
          center={{ lat: point.latitude, lng: point.longitude }}
          markers={markers}
          route={ride.routeCoords || []}
          fitPadding={{ top: insets.top + 70, bottom: sheetHeight + 20 }}
          fitBounds={ride.destinationCoords ? [[point.latitude, point.longitude], [ride.destinationCoords.latitude, ride.destinationCoords.longitude]] : null}
        />
      </View>

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <TouchableOpacity style={styles.back} onPress={() => router.replace('/(rider)/(tabs)/activities')}>
          <Ionicons name="arrow-back" size={22} color="#142f27" />
        </TouchableOpacity>
        <Text style={styles.demo}>UNIGO RIDE</Text>
      </SafeAreaView>

      {/* Bottom sheet */}
      <View onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.handle} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Title + subtitle */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.muted}>Connected to the UniGo driver network</Text>

          {/* Route summary */}
          <View style={styles.routeSummary}>
            <Text style={styles.routeLabel}>PICKUP</Text>
            <Text style={styles.text}>{ride.origin || 'Unavailable'}</Text>
            <Text style={styles.routeLabel}>DESTINATION</Text>
            <Text style={styles.text}>{ride.destination || 'Unavailable'}</Text>
          </View>

          {/* ─── SEARCHING ───────────────────────────────────── */}
          {['searching','requested'].includes(status) && (
            <View style={sim.searchingCard}>
              <PulsingRadar />
              <Text style={sim.searchingTitle}>Looking for a {ride.vehicleName}…</Text>
              <Text style={styles.muted}>{simEta || 'Connecting to nearest drivers'}</Text>
              <View style={sim.dotRow}>
                <PulsingDot delay={0} /><PulsingDot delay={200} /><PulsingDot delay={400} />
              </View>
            </View>
          )}

          {/* ─── DRIVER ASSIGNED / ARRIVED / IN PROGRESS ────── */}
          {['assigned', 'arrived', 'in_progress'].includes(status) && ride.driver && (
            <View style={sim.driverCard}>
              {status === 'assigned' && <StatusBadge icon="navigate" label="On the way" color="#2563eb" />}
              {status === 'arrived' && <StatusBadge icon="checkmark-circle" label="Arrived at pickup" color="#0f7a56" />}
              {status === 'in_progress' && <StatusBadge icon="car-sport" label="Trip in progress" color="#7c3aed" />}

              <View style={styles.driverRow}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={25} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.strong}>{ride.driver.name}</Text>
                  <Text style={styles.muted}>⭐ {ride.driver.rating} · {ride.driver.trips} trips</Text>
                  <Text style={sim.vehicleInfo}>{ride.driver.vehicleColor} {ride.driver.vehicleModel}</Text>
                  <Text style={sim.plateNumber}>{ride.driver.vehicleNumber}</Text>
                </View>
                <View style={sim.contactBtns}>
                  <TouchableOpacity style={sim.contactBtn} onPress={() => Alert.alert('Contact driver', 'In-app calling is not connected yet.')}>
                    <Ionicons name="call-outline" size={20} color="#0f7a56" />
                  </TouchableOpacity>
                  <TouchableOpacity style={sim.contactBtn} onPress={() => Alert.alert('Contact driver', 'In-app messaging is not connected yet.')}>
                    <Ionicons name="chatbubble-outline" size={20} color="#0f7a56" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* OTP card for assigned/arrived */}
              {['assigned','arrived'].includes(status) && (
                <View style={sim.otpCard}>
                  <Text style={sim.otpLabel}>RIDE START CODE</Text>
                  <Text style={sim.otpCode}>{ride.otp}</Text>
                  <Text style={styles.muted}>Share this code with your driver only at pickup</Text>
                </View>
              )}

              {/* In-progress extras */}
              {status === 'in_progress' && (
                <>
                  <View style={sim.tripProgress}>
                    <Text style={sim.tripProgressText}>Heading to {ride.destination}</Text>
                    <ProgressBar durationMs={simDuration} />
                    <Text style={styles.muted}>{ride.distanceKm} km · ~{ride.durationMins} min</Text>
                  </View>
                  <View style={styles.row}>
                    <TouchableOpacity onPress={() => Share.share({ message: 'UNIGO trip: ' + ride.origin + ' to ' + ride.destination })}>
                      <Text style={styles.link}>Share trip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('tel:112')}>
                      <Text style={styles.emergency}>Emergency · 112</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {simEta && !['in_progress'].includes(status) && (
                <Text style={[styles.muted, { textAlign: 'center', marginTop: 4 }]}>{simEta}</Text>
              )}
            </View>
          )}

          {/* ─── UNAVAILABLE ─────────────────────────────────── */}
          {status === 'unavailable' && (
            <View style={styles.card}>
              <Text style={styles.muted}>No live drivers are currently online near your pickup.</Text>
              <Button
                label="Retry Driver Search"
                onPress={() => updateRide(ride.id, {
                  status: 'searching',
                  backend: false,
                  simulated: true,
                  otp: ride.otp || String(Math.floor(1000 + Math.random() * 9000)),
                })}
              />
              <Button label="Choose another ride" onPress={() => router.replace('/(rider)/book')} />
            </View>
          )}

          {/* ─── COMPLETED ───────────────────────────────────── */}
          {status === 'completed' && (
            <View style={sim.completedCard}>
              <Ionicons name="checkmark-circle" size={48} color="#0f7a56" />
              <Text style={styles.strong}>{ride.origin} → {ride.destination}</Text>
              <Text style={styles.muted}>{ride.distanceKm} km · {ride.durationMins} min · {ride.vehicleName}</Text>
              {ride.driver?.name && <Text style={styles.muted}>Driver: {ride.driver.name}</Text>}
              <Text style={styles.price}>₹{ride.fare}</Text>
              <Button label="Proceed to payment" disabled={busy} onPress={() => change({ status: 'payment_pending' })} />
            </View>
          )}

          {/* ─── PAYMENT ─────────────────────────────────────── */}
          {status === 'payment_pending' && (
            <View style={styles.card}>
              <Text style={styles.price}>₹{ride.fare}</Text>
              <Text style={styles.muted}>UniGo Instant Fare Settlement</Text>
              {['Cash', 'UPI', 'Card', 'UniGo Wallet'].map((item) => (
                <TouchableOpacity key={item} style={styles.choice} onPress={() => setMethod(item)}>
                  <Text style={styles.text}>{item}{item === 'UniGo Wallet' ? ` · ₹${Number(balance).toFixed(2)}` : ''}</Text>
                  <Ionicons name={(method || ride.paymentType || 'Cash') === item ? 'radio-button-on' : 'radio-button-off'} size={21} color="#0f7a56" />
                </TouchableOpacity>
              ))}
              <Button label={`Pay ₹${ride.fare}`} disabled={busy} onPress={pay} />
            </View>
          )}

          {/* ─── RATING ──────────────────────────────────────── */}
          {status === 'paid' && (
            <View style={styles.card}>
              <Text style={styles.strong}>How was your ride?</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} stars`}>
                    <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color="#e8a31a" />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.tags}>
                {['Great driver', 'Safe ride', 'Clean vehicle', 'Friendly driver', 'Smooth ride'].map((tag) => (
                  <TouchableOpacity key={tag} style={[styles.tag, tags.includes(tag) && styles.tagSelected]} onPress={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>
                    <Text style={styles.text}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.input} value={feedback} onChangeText={setFeedback} placeholder="Add optional feedback" maxLength={300} />
              <Button label="Submit rating" disabled={!rating || busy} onPress={() => change({ status: 'rated', rating, feedback, feedbackTags: tags })} />
            </View>
          )}

          {/* ─── FINAL SUMMARY ───────────────────────────────── */}
          {['rated', 'cancelled', 'confirmed'].includes(status) && (
            <View style={styles.card}>
              <Text style={styles.strong}>{ride.origin} → {ride.destination}</Text>
              <Text style={styles.muted}>{new Date(ride.createdAt).toLocaleDateString()} · {ride.vehicleName}</Text>
              <Text style={styles.muted}>{ride.distanceKm} km · {ride.durationMins} min · {ride.paymentType || 'Cash'}</Text>
              <Text style={styles.price}>₹{ride.fare}</Text>
              {ride.driver?.name && <Text style={styles.muted}>Driver: {ride.driver.name} · {ride.driver.vehicleNumber}</Text>}
              {ride.rating && <Text style={styles.muted}>Your rating: {ride.rating} / 5</Text>}
            </View>
          )}

          {/* Error + actions */}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {ACTIVE.includes(status) && status !== 'in_progress' && (
            <TouchableOpacity style={styles.cancel} onPress={async () => { try { await cancelRide(ride.id); } catch (e) { setError(e.message); } }}>
              <Text style={styles.cancelText}>Cancel ride</Text>
            </TouchableOpacity>
          )}
          {['rated', 'cancelled', 'confirmed'].includes(status) && <Button label="View activity" onPress={() => router.replace('/(rider)/(tabs)/activities')} />}
        </ScrollView>
      </View>
    </View>
  );
}

/* ─── Pulsing dot for searching animation ────────────────────────── */
function PulsingDot({ delay }) {
  const scale = useMemo(() => new Animated.Value(0.6), []);
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, { toValue: 1.2, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.6, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale, delay]);
  return <Animated.View style={[sim.dot, { transform: [{ scale }] }]} />;
}

function Button({ label, onPress, disabled }) {
  return <TouchableOpacity style={[styles.button, disabled && { opacity: 0.5 }]} onPress={onPress} disabled={disabled}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
}

/* ─── Base styles ────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f5' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  top: { position: 'absolute', left: 16, right: 16, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  demo: { color: '#0f7a56', backgroundColor: '#fff', padding: 10, borderRadius: 14, fontSize: 11, fontWeight: '800', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '65%', backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, elevation: 14, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#d1dad5', alignSelf: 'center', marginTop: 10 },
  scroll: { flexShrink: 1 },
  content: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 21, fontWeight: '800', color: '#132f26' },
  muted: { fontSize: 12, color: '#71837c', lineHeight: 19, marginTop: 4 },
  text: { fontSize: 14, color: '#263b34' },
  strong: { color: '#173a2c', fontSize: 15, fontWeight: '800' },
  price: { color: '#0f7a56', fontSize: 25, fontWeight: '800', marginVertical: 8 },
  routeSummary: { marginTop: 12, gap: 3 },
  routeLabel: { color: '#71837c', fontSize: 10, fontWeight: '700', marginTop: 4 },
  card: { marginTop: 16, borderRadius: 16, padding: 16, backgroundColor: '#f3f8f5', gap: 8 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f7a56', alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: '#d1dfd7', backgroundColor: '#fff', borderRadius: 10, padding: 12, color: '#173a2c' },
  button: { backgroundColor: '#0f7a56', borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  link: { color: '#0f7a56', fontWeight: '700' },
  emergency: { color: '#c53030', fontWeight: '700' },
  choice: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  stars: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderColor: '#d1dfd7', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  tagSelected: { backgroundColor: '#d6f2e0', borderColor: '#0f7a56' },
  cancel: { alignItems: 'center', padding: 16 },
  cancelText: { color: '#b91c1c', fontWeight: '700' },
  error: { color: '#b91c1c', marginTop: 12 },
});

/* ─── Simulation-specific styles ─────────────────────────────────── */
const sim = StyleSheet.create({
  /* Searching */
  searchingCard: { marginTop: 20, borderRadius: 20, padding: 24, backgroundColor: '#f0faf4', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#d6f2e0' },
  searchingTitle: { fontSize: 16, fontWeight: '800', color: '#132f26' },
  dotRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0f7a56' },

  /* Radar */
  radarWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  radarRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: '#0f7a56' },
  radarDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f7a56', alignItems: 'center', justifyContent: 'center' },

  /* Driver card */
  driverCard: { marginTop: 16, borderRadius: 20, padding: 16, backgroundColor: '#f3f8f5', gap: 12, borderWidth: 1, borderColor: '#d6f2e0' },
  vehicleInfo: { fontSize: 12, color: '#4b6358', marginTop: 2 },
  plateNumber: { fontSize: 14, fontWeight: '900', color: '#0f7a56', marginTop: 2, letterSpacing: 0.5 },
  contactBtns: { gap: 10 },
  contactBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e3f5ec', alignItems: 'center', justifyContent: 'center' },

  /* OTP */
  otpCard: { backgroundColor: '#ecfdf5', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d0' },
  otpLabel: { fontSize: 10, fontWeight: '800', color: '#0f7a56', letterSpacing: 1 },
  otpCode: { fontSize: 28, fontWeight: '900', color: '#065f46', letterSpacing: 6, marginVertical: 4 },

  /* Badge */
  badge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Trip progress */
  tripProgress: { gap: 6 },
  tripProgressText: { fontSize: 15, fontWeight: '700', color: '#132f26' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#d6f2e0', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#0f7a56' },

  /* Completed */
  completedCard: { marginTop: 16, borderRadius: 20, padding: 24, backgroundColor: '#ecfdf5', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#a7f3d0' },
});
