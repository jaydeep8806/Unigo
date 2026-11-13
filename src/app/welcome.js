import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Welcome() {
  return <SafeAreaView style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
      <View style={styles.header}><View style={styles.brandMark}><Ionicons name="navigate" size={17} color="#fff" /></View><Text style={styles.brand}>UniGo</Text></View>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>Let’s get moving!</Text>
        <Text style={styles.description}>Your city, within reach.{'\n'}All your everyday journeys in one place.</Text>
        <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.halo} /><View style={styles.routeLine} />
          <View style={styles.mapCard}><View style={styles.mapHeader}><View style={styles.mapDot} /><View style={styles.mapDot} /><View style={styles.mapDot} /></View><Ionicons name="map-outline" size={112} color="#A6D9B9" /></View>
          <View style={styles.pin}><Ionicons name="location" size={52} color="#fff" /></View>
          <View style={styles.car}><Ionicons name="car-sport" size={34} color="#0F7A56" /></View>
          <View style={styles.spark}><Ionicons name="sparkles" size={22} color="#0F7A56" /></View>
        </View>
        <Text style={styles.tagline}>RIDES  ·  FOOD  ·  EVERYDAY</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/signup')} accessibilityRole="button"><Text style={styles.buttonText}>Sign up</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.outline]} onPress={() => router.push('/login')} accessibilityRole="button"><Text style={[styles.buttonText, styles.outlineText]}>Log in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8F5' }, page: { flexGrow: 1, width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandMark: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#0F7A56', alignItems: 'center', justifyContent: 'center' }, brand: { fontWeight: '800', fontSize: 19, color: '#0F7A56' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }, title: { color: '#17382A', fontSize: 32, fontWeight: '800', textAlign: 'center' }, description: { color: '#758B7D', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  illustration: { width: 250, height: 220, alignItems: 'center', justifyContent: 'center', marginVertical: 14 }, halo: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#E0F1E5' }, routeLine: { position: 'absolute', width: 228, height: 110, borderColor: '#B8DCC3', borderWidth: 2, borderStyle: 'dashed', borderRadius: 60, transform: [{ rotate: '-20deg' }] },
  mapCard: { width: 154, height: 155, backgroundColor: '#fff', borderRadius: 23, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], elevation: 5, shadowColor: '#174632', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }, mapHeader: { position: 'absolute', top: 13, left: 15, flexDirection: 'row', gap: 4 }, mapDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#B8DCC3' },
  pin: { position: 'absolute', top: 32, right: 42, width: 73, height: 73, borderRadius: 25, backgroundColor: '#0F7A56', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '10deg' }] }, car: { position: 'absolute', bottom: 22, right: 30, width: 62, height: 62, borderRadius: 21, backgroundColor: '#D8F2DE', alignItems: 'center', justifyContent: 'center' }, spark: { position: 'absolute', top: 33, left: 24 }, tagline: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#73917E', textAlign: 'center' },
  footer: { gap: 10, paddingTop: 12 }, button: { minHeight: 52, borderRadius: 28, backgroundColor: '#0F7A56', justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 }, outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#0F7A56' }, outlineText: { color: '#0F7A56' },
});
