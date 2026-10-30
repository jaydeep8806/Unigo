import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const OFFERS = [
  { title: '20% off a Moto ride', description: 'A sample offer for your next bike trip.', icon: 'bicycle-outline' },
  { title: '₹50 off an Auto', description: 'A sample offer for comfortable local travel.', icon: 'car-outline' },
  { title: 'Welcome ride reward', description: 'A sample offer for a first ride.', icon: 'gift-outline' },
  { title: 'Invite a friend', description: 'A sample referral reward.', icon: 'people-outline' },
];
export default function Offers() {
  return <SafeAreaView style={styles.screen} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Offers for you</Text><Text style={styles.subtitle}>Preview offers · not redeemable in demo mode</Text>
    {OFFERS.map((offer) => <View key={offer.title} style={styles.card}><View style={styles.icon}><Ionicons name={offer.icon} size={24} color="#0f7a56" /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{offer.title}</Text><Text style={styles.subtitle}>{offer.description}</Text></View><Text style={styles.badge}>DEMO</Text></View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#f5f8f6' }, content: { padding: 20, paddingBottom: 120 }, title: { fontSize: 26, color: '#102e24', fontWeight: '800' }, subtitle: { fontSize: 13, color: '#71837c', lineHeight: 19, marginTop: 5 }, card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { backgroundColor: '#e6f6ed', borderRadius: 14, width: 50, height: 50, alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: '#19372b', fontWeight: '800', fontSize: 15 }, badge: { color: '#0f7a56', fontSize: 10, fontWeight: '800' } });
