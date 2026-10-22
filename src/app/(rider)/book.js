import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { THEME } from '../../constants/theme';

export default function BookScreen() {
  const router = useRouter();
  const { selectedCity } = useLocation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Row with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Ride</Text>
        <View style={styles.cityPill}>
          <Text style={styles.cityPillText}>📍 {selectedCity?.name || 'Rajkot'}</Text>
        </View>
      </View>

      {/* Search Input Bar (Auto-focused) */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={THEME.colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to? (e.g. Campus Gate, Hostel, Station)"
            placeholderTextColor={THEME.colors.textMuted}
            autoFocus={true}
          />
        </View>
      </View>

      {/* Map Placeholder Body */}
      <View style={styles.placeholderBody}>
        <View style={styles.mapIconCircle}>
          <Ionicons name="map-outline" size={48} color={THEME.colors.primary} />
        </View>
        <Text style={styles.placeholderTitle}>Map coming next</Text>
        <Text style={styles.placeholderSubtitle}>
          Interactive Leaflet & OpenStreetMap campus routing centered on {selectedCity?.name || 'Rajkot'} will be connected here.
        </Text>
      </View>

      {/* Bottom Card Placeholder */}
      <View style={styles.bottomSheetPlaceholder}>
        <View style={styles.handle} />
        <Text style={styles.bottomCardTitle}>Select Vehicle & Destination</Text>
        <Text style={styles.bottomCardSubtitle}>
          Fare calculation in INR (₹) and driver dispatch will be available in Stage 2.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  cityPill: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.white,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    fontWeight: '500',
  },
  placeholderBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  mapIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  bottomSheetPlaceholder: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.floating,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  bottomCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  bottomCardSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
});
