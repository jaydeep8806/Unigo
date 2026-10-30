import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/SessionProvider';

export default function Welcome() {
  const { continueAsGuest } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handleContinue = async () => {
    if (busy) return;
    setBusy(true);
    try { await continueAsGuest(); }
    catch { setError('Could not start your session. Please try again.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.screen}>
    <View style={styles.content}>
      <View style={styles.mark}><Ionicons name="navigate" size={42} color="#fff" /></View>
      <Text style={styles.brand}>UniGoMoto</Text>
      <Text style={styles.title}>Your city, within reach.</Text>
      <Text style={styles.description}>Choose your route, find the ride that fits, and get moving.</Text>
      <View style={styles.detail}><Ionicons name="location-outline" size={22} color="#0f7a56" /><Text style={styles.detailText}>Simple pickups and clear fares</Text></View>
      <View style={styles.detail}><Ionicons name="bicycle-outline" size={22} color="#0f7a56" /><Text style={styles.detailText}>Moto, auto and car options</Text></View>
    </View>
    <View style={styles.footer}>{!!error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={busy} accessibilityRole="button">{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue with UniGoMoto</Text>}</TouchableOpacity>
      <Text style={styles.caption}>Continue in guest mode. Bookings and payments are simulated.</Text>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#f7fbf8' }, content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 }, mark: { width: 76, height: 76, borderRadius: 25, backgroundColor: '#0f7a56', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, brand: { fontSize: 16, fontWeight: '800', color: '#0f7a56', marginBottom: 18 }, title: { color: '#102d24', fontSize: 34, lineHeight: 40, fontWeight: '800' }, description: { fontSize: 16, lineHeight: 24, color: '#61766b', marginTop: 14, marginBottom: 28 }, detail: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }, detailText: { color: '#284b3b', fontWeight: '600', fontSize: 14 }, footer: { padding: 24, gap: 12 }, button: { height: 56, borderRadius: 28, backgroundColor: '#0f7a56', justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }, caption: { color: '#71837c', textAlign: 'center', fontSize: 12, lineHeight: 18 }, error: { color: '#b91c1c', textAlign: 'center' } });
