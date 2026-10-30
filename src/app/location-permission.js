import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../context/LocationProvider';
import { searchLocations } from '../services/geocoding';

export default function LocationPermissionScreen() {
  const { requestLocation, refreshLocation, selectManualLocation, permissionStatus, servicesEnabled, canAskAgain, isLoading } = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const asked = useRef(false);
  const [manual, setManual] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!manual || query.trim().length < 2) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try { const places = await searchLocations(query); if (active) setResults(places); }
      catch { if (active) setMessage('Location search unavailable. Check your connection.'); }
      finally { if (active) setSearching(false); }
    }, 800);
    return () => { active = false; clearTimeout(timer); };
  }, [manual, query]);

  const ask = useCallback(async () => {
    setBusy(true);
    try {
      const result = await requestLocation();
      if (!result.granted) {
        setMessage(result.permission === 'granted' && !result.servicesEnabled
          ? 'Turn on your device location to continue.'
          : 'Allow location access to continue.');
      }
    } finally { setBusy(false); }
  }, [requestLocation]);

  useEffect(() => {
    if (!isLoading && !asked.current && permissionStatus === 'undetermined') {
      asked.current = true;
      ask();
    }
  }, [ask, isLoading, permissionStatus]);

  const openSettings = async () => {
    try {
      if (permissionStatus === 'granted' && !servicesEnabled && Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      } else if (Platform.OS !== 'web') {
        await Linking.openSettings();
      }
    } catch { setMessage('Open your phone settings and turn on location and app permission.'); }
  };

  const needsSettings = (permissionStatus === 'denied' && !canAskAgain) || (permissionStatus === 'granted' && !servicesEnabled);
  if (manual) return (
    <SafeAreaView style={styles.screen}>
      <View style={{ padding: 24, flex: 1 }}>
        <TouchableOpacity onPress={() => setManual(false)}><Text style={styles.secondaryText}>‹ Back</Text></TouchableOpacity>
        <Text style={[styles.title, { textAlign: 'left', marginTop: 24 }]}>Choose your pickup area</Text>
        <Text style={[styles.description, { textAlign: 'left', marginBottom: 20 }]}>Search for a place in India to continue without device location.</Text>
        <TextInput value={query} onChangeText={(text) => { setQuery(text); setResults([]); setMessage(''); }} placeholder="Search city, area or landmark" style={styles.input} autoFocus />
        {searching && <ActivityIndicator color="#0f7a56" style={{ margin: 12 }} />}
        {!!message && <Text style={styles.message}>{message}</Text>}
        <ScrollView keyboardShouldPersistTaps="handled">
          {results.map((place) => <TouchableOpacity key={place.id} style={styles.place} onPress={() => selectManualLocation(place)}><Ionicons name="location-outline" color="#0f7a56" size={20} /><View style={{ flex: 1 }}><Text style={styles.statusText}>{place.title}</Text><Text style={styles.hint}>{place.subtitle}</Text></View></TouchableOpacity>)}
          {!searching && query.trim().length >= 2 && results.length === 0 && <Text style={styles.hint}>Try a different area or add the city name.</Text>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconOuter}><View style={styles.iconInner}><Ionicons name="location" size={48} color="#fff" /></View></View>
        <Text style={styles.eyebrow}>BETTER PICKUPS START HERE</Text>
        <Text style={styles.title}>Turn on your location</Text>
        <Text style={styles.description}>Allow UniGo to access your location and turn on your phone’s location services to find your pickup point.</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}><Ionicons name={permissionStatus === 'granted' ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={permissionStatus === 'granted' ? '#09815a' : '#94a3b8'} /><Text style={styles.statusText}>App location permission</Text></View>
          <View style={styles.statusRow}><Ionicons name={servicesEnabled ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={servicesEnabled ? '#09815a' : '#94a3b8'} /><Text style={styles.statusText}>Device location is on</Text></View>
        </View>
        {!!message && <Text style={styles.message}>{message}</Text>}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} disabled={busy} onPress={needsSettings ? openSettings : ask} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{needsSettings ? 'Open settings' : 'Enable location'}</Text>}
        </TouchableOpacity>
        {needsSettings && <TouchableOpacity style={styles.secondary} onPress={refreshLocation}><Text style={styles.secondaryText}>I’ve enabled it · Check again</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.secondary} onPress={() => { setManual(true); setMessage(''); }}><Text style={styles.secondaryText}>Enter location manually</Text></TouchableOpacity>
        {Platform.OS === 'ios' && permissionStatus === 'granted' && !servicesEnabled && <Text style={styles.hint}>Turn on Location Services in Settings → Privacy & Security → Location Services, then return here.</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  iconOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e4f7ef', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 32 },
  iconInner: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#0f7a56', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#0f7a56', fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginBottom: 12 },
  title: { color: '#101d2b', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  description: { color: '#64748b', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  statusCard: { marginTop: 28, backgroundColor: '#f5f8f7', borderRadius: 18, padding: 18, gap: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusText: { color: '#263b3a', fontSize: 14, fontWeight: '600' },
  message: { marginTop: 18, color: '#b45309', textAlign: 'center', fontSize: 13 },
  actions: { paddingHorizontal: 24, paddingBottom: 20, gap: 10 },
  primary: { backgroundColor: '#0f7a56', minHeight: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: { alignItems: 'center', padding: 12 },
  secondaryText: { color: '#0f7a56', fontWeight: '700' },
  hint: { color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  input: { borderRadius: 14, padding: 14, backgroundColor: '#f2f6f4', color: '#172a2a', fontSize: 15 },
  place: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#dce7df', flexDirection: 'row', alignItems: 'center', gap: 12 },
});
