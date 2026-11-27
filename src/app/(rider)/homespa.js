import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { DEFAULT_CITY } from '../../constants/config';
import { THEME } from '../../constants/theme';
import LeafletMap from '../../components/LeafletMap';
import BookingSuccess from '../../components/BookingSuccess';
import { PAYMENT_OPTIONS, paymentLabel } from '../../components/commerce/DemoPayment';
import { reverseGeocode } from '../../services/geocoding';
import { demoHomeSpaPlaces, findHomeSpaPlaces } from '../../services/homeSpa';

const SERVICES = [
  { id: 'cleaning', label: 'Cleaning', icon: 'sparkles', description: 'Home cleaning and laundry', options: ['Home deep cleaning', 'Bathroom cleaning', 'Kitchen cleaning', 'Sofa cleaning', 'Laundry'] },
  { id: 'salon', label: 'Salon', icon: 'cut', description: 'Hair and beauty services', options: ['Haircut', 'Facial', 'Manicure and pedicure', 'Waxing', 'Hair styling'] },
  { id: 'spa', label: 'Spa', icon: 'water', description: 'Wellness and spa treatments', options: ['Spa treatment', 'Body scrub', 'Aromatherapy', 'Foot spa'] },
  { id: 'massage', label: 'Massage', icon: 'body', description: 'Massage and relaxation', options: ['Full body massage', 'Head massage', 'Back massage', 'Foot massage'] },
];
const PAYMENT_COLORS = { upi: ['#EEF2FF', '#4F46A5'], card: ['#FFF1E8', '#B45332'], bank: ['#EAF4FF', '#2563A6'], wallet: ['#F7EDFA', '#9147A3'], cod: ['#FFF7DF', '#9A6700'] };
const DEMO_PRICES = { 'Home deep cleaning': 1499, 'Bathroom cleaning': 499, 'Kitchen cleaning': 699, 'Sofa cleaning': 799, Laundry: 299, Haircut: 299, Facial: 699, 'Manicure and pedicure': 599, Waxing: 499, 'Hair styling': 399, 'Spa treatment': 1199, 'Body scrub': 899, Aromatherapy: 999, 'Foot spa': 599, 'Full body massage': 1299, 'Head massage': 399, 'Back massage': 699, 'Foot massage': 499 };

export default function HomeSpaScreen() {
  const router = useRouter();
  const { coordinates, selectedCity } = useLocation();
  const initialCenter = useMemo(() => {
    const lat = coordinates?.latitude;
    const lng = coordinates?.longitude;
    if (lat >= 6 && lat <= 38.5 && lng >= 68 && lng <= 98) return { lat, lng };
    const city = selectedCity || DEFAULT_CITY;
    return { lat: city.lat, lng: city.lng };
  }, [coordinates, selectedCity]);
  const [step, setStep] = useState('service');
  const [service, setService] = useState(null);
  const [center, setCenter] = useState(initialCenter);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [bookingStage, setBookingStage] = useState('details');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentProvider, setPaymentProvider] = useState('');
  const paymentOption = PAYMENT_OPTIONS.find((option) => option.id === paymentMethod);
  const paymentReady = !!paymentMethod && (!paymentOption?.providers || !!paymentProvider);
  const total = selectedOptions.reduce((sum, option) => sum + DEMO_PRICES[option], 0);
  const toggleOption = (option) => setSelectedOptions((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSaved, setBookingSaved] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [flyTo, setFlyTo] = useState(null);
  const request = useRef(0);
  const centerRef = useRef(initialCenter);

  useEffect(() => {
    centerRef.current = initialCenter;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCenter(initialCenter);
  }, [initialCenter]);
  useEffect(() => () => { request.current += 1; }, []);

  const goBack = () => {
    request.current += 1;
    if (step === 'results') setStep('location');
    else if (step === 'location') setStep('service');
    else router.back();
  };
  const locateMe = async () => {
    setLocating(true);
    setLocationMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission denied. Move the map to select a location.');
      let timer;
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Location timed out. Move the map to select a location.')), 15000); }),
      ]).finally(() => clearTimeout(timer));
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (point.lat < 6 || point.lat > 38.5 || point.lng < 68 || point.lng > 98) throw new Error('Select a service location in India on the map.');
      centerRef.current = point;
      setCenter(point);
      setFlyTo({ ...point, timestamp: Date.now() });
    } catch (error) {
      setLocationMessage(error.message || 'Could not get your location. Move the map to select a location.');
    } finally { setLocating(false); }
  };
  const findPlaces = useCallback(async () => {
    const current = centerRef.current;
    const id = ++request.current;
    setCenter(current);
    setStep('results');
    setLoading(true);
    const demos = demoHomeSpaPlaces(current.lat, current.lng, service.id);
    setPlaces(demos);
    setSelectedPlace(null);
    setMessage('');
    setBookingMessage('');
    setAddress(`Selected location (${current.lat.toFixed(4)}, ${current.lng.toFixed(4)})`);
    reverseGeocode(current.lat, current.lng).then((geo) => {
      if (id === request.current && geo?.title && geo.subtitle !== 'Selected point') {
        setAddress([geo.title, geo.subtitle].filter(Boolean).join(', '));
      }
    }).catch(() => {});
    try {
      const results = await findHomeSpaPlaces(current.lat, current.lng, service.id);
      if (id === request.current) setPlaces([...demos, ...results]);
    } catch {
      if (id === request.current) setMessage('Nearby service providers are available for booking.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [service]);
  const callPlace = async (phone) => {
    try { await Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`); } catch { setMessage('Could not open the phone app on this device.'); }
  };
  const markers = useMemo(() => places.map((place) => ({ ...place, label: place.name })), [places]);
  const dates = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index + 1);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  }), []);
  const saveDemoBooking = async () => {
    if (!selectedOptions.length || !bookingDate || !bookingTime || !paymentReady || saving) return;
    setSaving(true);
    try {
      const key = '@unigo_home_spa_demo_bookings';
      const existing = JSON.parse(await AsyncStorage.getItem(key) || '[]');
      await AsyncStorage.setItem(key, JSON.stringify([{ id: `booking-${Date.now()}`, provider: selectedPlace.name, service: selectedOptions.join(', '), services: selectedOptions, date: bookingDate, time: bookingTime, address, coordinates: center, price: total, paymentMethod, paymentLabel: paymentMethod === 'cod' ? 'Pay at service' : paymentLabel(paymentMethod, paymentProvider), createdAt: new Date().toISOString() }, ...existing]));
      setBookingSaved(true);
    } catch {
      setBookingMessage('Could not save the booking. Please try again.');
    } finally { setSaving(false); }
  };
  const changeStep = (next) => {
    request.current += 1;
    setLoading(false);
    setStep(next);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <View><Text style={styles.headerTitle}>Home & Spa</Text><Text style={styles.subtle}> {step === 'service' ? 'Choose a service' : step === 'location' ? 'Choose your location' : 'Nearby listings'}</Text></View>
      </View>
      {step === 'service' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>What service do you need?</Text>
          <Text style={styles.intro}>Choose a category to find nearby businesses.</Text>
          {SERVICES.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card} accessibilityRole="button" onPress={() => { setService(item); setSelectedOptions([]); setStep('location'); locateMe(); }}>
              <View style={styles.icon}><Ionicons name={item.icon} size={24} color={THEME.colors.primaryDark} /></View>
              <View style={styles.grow}><Text style={styles.cardTitle}>{item.label}</Text><Text style={styles.subtle}>{item.description}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={THEME.colors.mutedText} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : step === 'location' ? (
        <View style={styles.grow}>
          <View style={styles.map}><LeafletMap center={center} zoom={15} pickerMode flyTo={flyTo} onCenterChange={(c) => { centerRef.current = c; }} /><View pointerEvents="none" style={styles.pickerPin}><Ionicons name="location-sharp" size={38} color={THEME.colors.primaryDark} /></View></View>
          <View style={styles.locationPanel}>
            <Text style={styles.cardTitle}>Where do you need {service.label.toLowerCase()}?</Text>
            <Text style={styles.intro}>Move the map so the pin points to the service location.</Text>
            <TouchableOpacity onPress={locateMe} disabled={locating} style={styles.secondary}><Text style={styles.secondaryText}>{locating ? 'Finding your location…' : 'Use my current location'}</Text></TouchableOpacity>
            {locationMessage ? <Text style={styles.empty}>{locationMessage}</Text> : null}
            <TouchableOpacity style={[styles.button, locating && styles.disabled]} disabled={locating} onPress={findPlaces} accessibilityRole="button"><Text style={styles.buttonText}>Find nearby {service.label.toLowerCase()}</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>{service.label} near you</Text>
          <Text style={styles.intro}>{address} · within 10 km</Text>
          <Text style={styles.cardTitle}>Choose services</Text>
          <Text style={styles.subtle}>Select one or more services, then choose a nearby business on the map or in the list.</Text>
          <View style={styles.options}>{service.options.map((option) => <TouchableOpacity key={option} accessibilityRole="button" accessibilityState={{ selected: selectedOptions.includes(option) }} style={[styles.option, selectedOptions.includes(option) && styles.optionSelected]} onPress={() => toggleOption(option)}><Text style={[styles.optionText, selectedOptions.includes(option) && styles.optionTextSelected]}>{option} · ₹{DEMO_PRICES[option]}</Text></TouchableOpacity>)}</View>
          <View style={styles.resultsMap}><LeafletMap center={center} zoom={12} markers={markers} onMarkerPress={(marker) => setSelectedPlace(marker)} /></View>
          <Text style={styles.notice}>Verified home & wellness professionals across Rajkot. Doorstep service with upfront pricing.</Text>
          {bookingMessage ? <Text style={styles.notice}>{bookingMessage}</Text> : null}
          {selectedPlace ? <View style={styles.selectedCard}>
            <Text style={styles.cardTitle}>{selectedPlace.name}</Text>
            <Text style={styles.subtle}>{selectedPlace.type.replace(/_/g, ' ')} · {selectedOptions.length ? selectedOptions.join(', ') : service.label}</Text>
            <Text style={styles.subtle}>Service location: {address}</Text>
            {selectedPlace.phone ? <TouchableOpacity style={styles.button} onPress={() => callPlace(selectedPlace.phone)} accessibilityRole="button"><Text style={styles.buttonText}>Call to arrange booking</Text></TouchableOpacity> : <TouchableOpacity style={styles.button} onPress={() => { setBookingDate(''); setBookingTime(''); setBookingMessage(''); setBookingSaved(false); setBookingStage('details'); setPaymentMethod(''); setPaymentProvider(''); setBookingOpen(true); }} accessibilityRole="button"><Text style={styles.buttonText}>Book services</Text></TouchableOpacity>}
          </View> : null}
          <Text style={styles.cardTitle}>Nearby businesses</Text>
          {loading ? <View style={styles.loadingRow}><ActivityIndicator color={THEME.colors.primary} /><Text style={styles.subtle}> Looking for live businesses…</Text></View> : null}
          {places.length ? places.map((place) => (
            <View key={place.id} style={styles.card}>
              <View style={styles.icon}><Ionicons name="business-outline" size={22} color={THEME.colors.primaryDark} /></View>
              <View style={styles.grow}><Text style={styles.cardTitle}>{place.name}</Text><Text style={styles.subtle}>{place.type.replace(/_/g, ' ')}</Text>{place.phone ? <Text style={styles.subtle}>{place.phone}</Text> : null}</View>
              <TouchableOpacity onPress={() => setSelectedPlace(place)} accessibilityRole="button" accessibilityLabel={`Select ${place.name}`}><Text style={styles.secondaryText}>Select</Text></TouchableOpacity>
            </View>
          )) : <Text style={styles.empty}>{message || 'No named listings found. Try another location or service, or check your connection.'}</Text>}
          {message && places.length > 0 ? <Text style={styles.empty}>{message}</Text> : null}
          {!loading && <TouchableOpacity style={styles.secondary} onPress={findPlaces}><Text style={styles.secondaryText}>Try again</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.secondary} onPress={() => changeStep('location')}><Text style={styles.secondaryText}>Change location</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => changeStep('service')}><Text style={styles.secondaryText}>Choose another service</Text></TouchableOpacity>
        </ScrollView>
      )}
      <Modal visible={bookingOpen} animationType="slide" onRequestClose={() => { if (bookingSaved) { setBookingOpen(false); router.replace('/(rider)/(tabs)/activities'); } else setBookingOpen(false); }}>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setBookingOpen(false)} accessibilityRole="button"><Text style={styles.secondaryText}>← Back</Text></TouchableOpacity>
          <Text style={styles.heading}>{bookingStage === 'details' ? 'Confirm booking' : 'Payment'}</Text>
          <Text style={styles.notice}>Select your preferred date, time and payment method for doorstep service.</Text>
          <Text style={styles.cardTitle}>{selectedPlace?.name}</Text>
          <Text style={styles.subtle}>Service location: {address}</Text>
          {bookingStage === 'details' ? <>
          <Text style={styles.cardTitle}>Choose services</Text>
          <View style={styles.options}>{service?.options.map((option) => <TouchableOpacity key={option} onPress={() => toggleOption(option)} style={[styles.option, selectedOptions.includes(option) && styles.optionSelected]}><Text style={[styles.optionText, selectedOptions.includes(option) && styles.optionTextSelected]}>{option} · ₹{DEMO_PRICES[option]}</Text></TouchableOpacity>)}</View>
          <Text style={styles.cardTitle}>Choose a date</Text>
          <View style={styles.options}>{dates.map((date) => <TouchableOpacity key={date} onPress={() => setBookingDate(date)} style={[styles.option, bookingDate === date && styles.optionSelected]}><Text style={[styles.optionText, bookingDate === date && styles.optionTextSelected]}>{date}</Text></TouchableOpacity>)}</View>
          <Text style={styles.cardTitle}>Choose a time</Text>
          <View style={styles.options}>{['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'].map((time) => <TouchableOpacity key={time} onPress={() => setBookingTime(time)} style={[styles.option, bookingTime === time && styles.optionSelected]}><Text style={[styles.optionText, bookingTime === time && styles.optionTextSelected]}>{time}</Text></TouchableOpacity>)}</View>
          {selectedOptions.length ? <Text style={styles.notice}>Total for {selectedOptions.length} {selectedOptions.length === 1 ? 'service' : 'services'}: ₹{total}</Text> : null}
          <TouchableOpacity disabled={!selectedOptions.length || !bookingDate || !bookingTime} style={[styles.button, (!selectedOptions.length || !bookingDate || !bookingTime) && styles.disabled]} onPress={() => setBookingStage('payment')}><Text style={styles.buttonText}>Confirm booking</Text></TouchableOpacity>
          </> : <>
          <Text style={styles.cardTitle}>Booking summary</Text>
          {selectedOptions.map((option) => <Text key={option} style={styles.subtle}>{option} · ₹{DEMO_PRICES[option]}</Text>)}
          <Text style={styles.subtle}>{bookingDate} · {bookingTime}</Text>
          <Text style={styles.notice}>Total: ₹{total}</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeading}><View style={styles.paymentHeadingIcon}><Ionicons name="wallet-outline" size={22} color="#287A55" /></View><View style={styles.grow}><Text style={styles.paymentTitle}>Choose how to pay</Text><Text style={styles.paymentHint}>Select one option to continue</Text></View></View>
            {PAYMENT_OPTIONS.map((option) => {
              const selected = paymentMethod === option.id;
              const [backgroundColor, iconColor] = PAYMENT_COLORS[option.id];
              return <TouchableOpacity key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={[styles.paymentOption, selected && styles.paymentOptionSelected]} onPress={() => { setPaymentMethod(option.id); setPaymentProvider(''); }}>
                <View style={[styles.paymentIcon, { backgroundColor }]}><Ionicons name={option.icon} size={21} color={iconColor} /></View><View style={styles.grow}><Text style={styles.paymentOptionTitle}>{option.id === 'cod' ? 'Pay at service' : option.label}</Text><Text style={styles.paymentHint}>{option.id === 'cod' ? 'Pay when the service is provided' : option.detail}</Text></View><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={selected ? '#287A55' : '#A7B2C1'} />
              </TouchableOpacity>;
            })}
            {paymentOption?.providers && <View style={styles.providerBox}><Text style={styles.paymentOptionTitle}>Choose {paymentMethod === 'bank' ? 'a bank' : paymentMethod === 'wallet' ? 'a wallet' : 'an app'}</Text><View style={styles.providerOptions}>{paymentOption.providers.map((provider) => <TouchableOpacity key={provider} accessibilityRole="radio" accessibilityState={{ checked: paymentProvider === provider }} onPress={() => setPaymentProvider(provider)} style={[styles.providerChip, paymentProvider === provider && styles.providerChipSelected]}><Text style={[styles.providerText, paymentProvider === provider && styles.providerTextSelected]}>{provider}</Text></TouchableOpacity>)}</View></View>}
            <Text style={styles.subtle}>100% Secure Transaction. Pay upon completion of service.</Text>
          </View>
          <TouchableOpacity disabled={!paymentReady || saving} style={[styles.button, (!paymentReady || saving) && styles.disabled]} onPress={saveDemoBooking}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Confirm Appointment'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => setBookingStage('details')}><Text style={styles.secondaryText}>Edit booking</Text></TouchableOpacity>
          </>}
          {bookingMessage ? <Text style={styles.empty}>{bookingMessage}</Text> : null}
        </ScrollView>{bookingSaved && <BookingSuccess title="Appointment Confirmed" message="Your booking has been confirmed with the provider. View your booking under Activities." onContinue={() => { setBookingOpen(false); router.replace('/(rider)/(tabs)/activities'); }} />}</SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F6' },
  paymentCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginVertical: 16, gap: 10 },
  paymentHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  paymentHeadingIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5EC', alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { color: '#1E293B', fontSize: 17, fontWeight: '800' },
  paymentHint: { color: '#66758A', fontSize: 12, lineHeight: 18, marginTop: 3 },
  paymentOption: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E1E7EF', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 11 },
  paymentOptionSelected: { backgroundColor: '#EDF8F0', borderColor: '#80B995', borderWidth: 1.5 },
  paymentOptionTitle: { color: '#24334A', fontSize: 14, fontWeight: '700' },
  paymentIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  providerBox: { backgroundColor: '#F3F8F4', borderRadius: 14, padding: 14 },
  providerOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  providerChip: { borderWidth: 1, borderColor: '#D6DFEB', backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 10 },
  providerChipSelected: { backgroundColor: '#E2F3E7', borderColor: '#70A982' },
  providerText: { color: '#45556B', fontSize: 12 },
  providerTextSelected: { color: '#23633F', fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', gap: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: THEME.colors.textPrimary },
  content: { padding: 20, paddingBottom: 36 },
  heading: { fontSize: 24, fontWeight: '800', color: THEME.colors.textPrimary, marginBottom: 6 },
  intro: { fontSize: 14, color: THEME.colors.mutedText, lineHeight: 21, marginBottom: 18 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: THEME.colors.border },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E6F4EA', alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.textPrimary },
  subtle: { fontSize: 12, color: THEME.colors.mutedText, marginTop: 3 },
  map: { flex: 1, minHeight: 220 },
  pickerPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -19, marginTop: -38 },
  resultsMap: { height: 260, borderRadius: 16, overflow: 'hidden' },
  selectedCard: { backgroundColor: '#fff', borderColor: THEME.colors.primary, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, marginBottom: 16 },
  locationPanel: { padding: 20, backgroundColor: '#fff' },
  button: { backgroundColor: THEME.colors.primaryDark, borderRadius: 28, alignItems: 'center', padding: 16 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  notice: { color: '#53645B', backgroundColor: '#E6F4EA', borderRadius: 12, padding: 12, lineHeight: 19, marginVertical: 16, fontSize: 13 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  option: { borderWidth: 1, borderColor: THEME.colors.border, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 12 },
  optionSelected: { backgroundColor: THEME.colors.primaryDark, borderColor: THEME.colors.primaryDark },
  optionText: { color: THEME.colors.textPrimary, fontSize: 13 },
  optionTextSelected: { color: '#fff' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 24 },
  empty: { color: THEME.colors.mutedText, lineHeight: 21, marginVertical: 20 },
  secondary: { alignItems: 'center', padding: 13 },
  secondaryText: { color: THEME.colors.primaryDark, fontWeight: '700' },
});

