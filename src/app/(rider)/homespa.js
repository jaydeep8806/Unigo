import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { THEME } from '../../constants/theme';
import { DEFAULT_CITY } from '../../constants/config';
import { reverseGeocode } from '../../services/geocoding';
import LeafletMap from '../../components/LeafletMap';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SERVICES = [
  { id: 'cleaning', label: 'Cleaning', icon: 'sparkles', desc: 'Home deep cleaning & sanitization' },
  { id: 'salon', label: 'Salon', icon: 'cut', desc: 'Haircut, facial & grooming at home' },
  { id: 'spa', label: 'Spa', icon: 'water', desc: 'Relaxing aroma & body treatments' },
  { id: 'massage', label: 'Massage', icon: 'body', desc: 'Therapeutic muscle & stress relief' },
];

export default function HomeSpaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coordinates, selectedCity } = useLocation();

  const initialCenter = useMemo(() => {
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const lat = coordinates.latitude;
      const lng = coordinates.longitude;
      if (lat >= 6.0 && lat <= 38.5 && lng >= 68.0 && lng <= 98.0) {
        return { lat, lng };
      }
    }
    const city = selectedCity || DEFAULT_CITY;
    return { lat: city.lat, lng: city.lng };
  }, [coordinates, selectedCity]);

  const [selectedService, setSelectedService] = useState('cleaning');
  const [address, setAddress] = useState({ title: 'Loading address…', subtitle: '' });
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const geocodeTimerRef = useRef(null);

  const showToast = (msg = 'Coming soon') => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const fetchAddress = useCallback(async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      setAddress(geo);
    } catch {
      setAddress({
        title: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        subtitle: 'Selected location',
      });
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Initial geocode
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const geo = await reverseGeocode(initialCenter.lat, initialCenter.lng);
        if (active) setAddress(geo);
      } catch {
        if (active) {
          setAddress({
            title: `${initialCenter.lat.toFixed(4)}, ${initialCenter.lng.toFixed(4)}`,
            subtitle: 'Selected location',
          });
        }
      } finally {
        if (active) setIsGeocoding(false);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [initialCenter]);

  // Handle map center change during picker mode
  const handleCenterChange = (c) => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    setIsGeocoding(true);
    geocodeTimerRef.current = setTimeout(() => {
      fetchAddress(c.lat, c.lng);
    }, 600);
  };

  const activeServiceObj = SERVICES.find((s) => s.id === selectedService) || SERVICES[0];

  return (
    <View style={styles.container}>
      {/* Full Map with Center Picker Pin */}
      <View style={[StyleSheet.absoluteFillObject, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, zIndex: 0 }]}>
        <LeafletMap
          center={initialCenter}
          zoom={15}
          pickerMode={true}
          onCenterChange={handleCenterChange}
        />
      </View>

      {/* Top Header */}
      <SafeAreaView edges={['top']} style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.circleBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.headerTitle}>Home & Spa Services</Text>
            <Text style={styles.headerSubtitle}>
              Move map to select your service address
            </Text>
          </View>
        </View>

        {/* Horizontal Service Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {SERVICES.map((s) => {
            const isSelected = selectedService === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedService(s.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={s.icon}
                  size={16}
                  color={isSelected ? '#FFFFFF' : THEME.colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Sheet Card */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
        <View style={styles.sheetHeader}>
          <View style={styles.serviceIconCircle}>
            <Ionicons name={activeServiceObj.icon} size={22} color={THEME.colors.primaryDark} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.serviceName}>{activeServiceObj.label} at Home</Text>
            <Text style={styles.serviceDesc}>{activeServiceObj.desc}</Text>
          </View>
        </View>

        {/* Address confirmation block */}
        <View style={styles.addressBox}>
          <Ionicons
            name="location-sharp"
            size={22}
            color={THEME.colors.primary}
            style={{ marginRight: 10, marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressLabel}>Service Address</Text>
            <Text style={styles.addressTitle} numberOfLines={2}>
              {address.title}
            </Text>
            {address.subtitle ? (
              <Text style={styles.addressSubtitle} numberOfLines={1}>
                {address.subtitle}
              </Text>
            ) : null}
          </View>
          {isGeocoding && (
            <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* Confirm Address Button */}
        <PressableScale
          style={styles.confirmBtn}
          onPress={() => showToast('UniGo Home & Spa is coming soon!')}
        >
          <Text style={styles.confirmBtnText}>Confirm Address</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </PressableScale>
      </View>

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.soft,
  },
  titleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 1,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  chipSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.textPrimary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeights.bold,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    ...THEME.shadows.floating,
    zIndex: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  serviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.textPrimary,
  },
  serviceDesc: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.tile,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.textPrimary,
  },
  addressSubtitle: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryDark,
    paddingVertical: 15,
    borderRadius: THEME.radius.pill,
    ...THEME.shadows.card,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
  },
});
