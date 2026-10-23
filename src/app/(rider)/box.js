import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { THEME } from '../../constants/theme';
import { CURRENCY_SYMBOL, DEFAULT_CITY } from '../../constants/config';
import { searchLocations, reverseGeocode } from '../../services/geocoding';
import { fetchDrivingRoute } from '../../services/osrm';
import LeafletMap from '../../components/LeafletMap';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';

const SIZES = [
  { id: 'small', label: 'Small', sub: 'Up to 3 kg', extraFare: 0, icon: 'document-text-outline' },
  { id: 'medium', label: 'Medium', sub: 'Up to 7 kg', extraFare: 20, icon: 'cube-outline' },
  { id: 'large', label: 'Large', sub: 'Up to 15 kg', extraFare: 40, icon: 'file-tray-stacked-outline' },
];

export default function BoxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coordinates, selectedCity } = useLocation();

  // Active user origin (strictly within India)
  const origin = useMemo(() => {
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const lat = coordinates.latitude;
      const lng = coordinates.longitude;
      if (lat >= 6.0 && lat <= 38.5 && lng >= 68.0 && lng <= 98.0) {
        return {
          latitude: lat,
          longitude: lng,
          title: 'Pickup Location',
        };
      }
    }
    const city = selectedCity || DEFAULT_CITY;
    return {
      latitude: city.lat,
      longitude: city.lng,
      title: `${city.name} Center`,
    };
  }, [coordinates, selectedCity]);

  // Destination & Route
  const [destination, setDestination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Pin picker
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [pickerCoords, setPickerCoords] = useState(null);

  // Route
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationMins, setDurationMins] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);

  // Parcel Size
  const [selectedSize, setSelectedSize] = useState('small');

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const debounceTimerRef = useRef(null);

  const showToast = (msg = 'Coming soon') => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(text, origin);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const calculateRoute = async (start, end) => {
    setRouteLoading(true);
    try {
      const data = await fetchDrivingRoute(
        { latitude: start.latitude, longitude: start.longitude },
        { latitude: end.latitude, longitude: end.longitude }
      );
      setRouteCoords(data.coordinates.map((c) => [c.latitude, c.longitude]));
      setDistanceKm(+(data.distanceMeters / 1000).toFixed(1));
      setDurationMins(Math.max(1, Math.round(data.durationSeconds / 60)));
    } catch {
      setRouteCoords([
        [start.latitude, start.longitude],
        [end.latitude, end.longitude],
      ]);
      const dLat = (end.latitude - start.latitude) * 111;
      const dLon = (end.longitude - start.longitude) * 111;
      const dist = +Math.sqrt(dLat * dLat + dLon * dLon).toFixed(1);
      setDistanceKm(Math.max(1, dist));
      setDurationMins(Math.max(3, Math.round(dist * 3)));
    } finally {
      setRouteLoading(false);
    }
  };

  const handleSelectPlace = useCallback(
    async (place) => {
      Keyboard.dismiss();
      setShowSearchResults(false);
      setSearchQuery(place.title);
      setIsPickerMode(false);

      const dest = {
        latitude: place.latitude,
        longitude: place.longitude,
        title: place.title,
      };
      setDestination(dest);
      await calculateRoute(origin, dest);
    },
    [origin]
  );

  const handleConfirmPicker = async () => {
    if (!pickerCoords) return;
    setIsPickerMode(false);
    try {
      const geo = await reverseGeocode(pickerCoords.lat, pickerCoords.lng);
      const dest = {
        latitude: pickerCoords.lat,
        longitude: pickerCoords.lng,
        title: geo.title || 'Selected Drop Location',
      };
      setDestination(dest);
      setSearchQuery(dest.title);
      await calculateRoute(origin, dest);
    } catch {
      const dest = {
        latitude: pickerCoords.lat,
        longitude: pickerCoords.lng,
        title: 'Selected Drop Location',
      };
      setDestination(dest);
      await calculateRoute(origin, dest);
    }
  };

  // Fare = ₹40 + ₹10 per km (+₹20 Medium, +₹40 Large)
  const totalFare = useMemo(() => {
    const sizeObj = SIZES.find((s) => s.id === selectedSize) || SIZES[0];
    const base = 40;
    const perKmRate = 10;
    const kmFare = Math.round(distanceKm * perKmRate);
    return base + kmFare + sizeObj.extraFare;
  }, [distanceKm, selectedSize]);

  // Markers
  const markers = useMemo(() => {
    const list = [
      {
        lat: origin.latitude,
        lng: origin.longitude,
        label: 'Pickup',
        color: '#0F7A56',
      },
    ];
    if (destination) {
      list.push({
        lat: destination.latitude,
        lng: destination.longitude,
        label: 'Drop',
        color: '#EF4444',
      });
    }
    return list;
  }, [origin, destination]);

  const fitBounds = useMemo(() => {
    if (!destination) return null;
    return [
      [origin.latitude, origin.longitude],
      [destination.latitude, destination.longitude],
    ];
  }, [origin, destination]);

  return (
    <View style={styles.container}>
      {/* Full Map */}
      <View style={StyleSheet.absoluteFillObject}>
        <LeafletMap
          center={{ lat: origin.latitude, lng: origin.longitude }}
          zoom={14}
          markers={markers}
          route={routeCoords}
          pickerMode={isPickerMode}
          onCenterChange={(c) => setPickerCoords(c)}
          fitBounds={fitBounds}
        />
      </View>

      {/* Top Header Card */}
      <SafeAreaView edges={['top']} style={styles.topContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.circleBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.headerTitle}>UniGo Box — Send a Parcel</Text>
            <Text style={styles.headerSubtitle}>
              Same-day courier across {selectedCity?.name || 'city'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.pinToggleBtn, isPickerMode && styles.pinToggleBtnActive]}
            onPress={() => {
              setIsPickerMode(!isPickerMode);
              setShowSearchResults(false);
              Keyboard.dismiss();
            }}
          >
            <Ionicons
              name={isPickerMode ? 'close' : 'location'}
              size={18}
              color={isPickerMode ? '#FFFFFF' : THEME.colors.primary}
            />
            <Text
              style={[
                styles.pinToggleText,
                isPickerMode && styles.pinToggleTextActive,
              ]}
            >
              {isPickerMode ? 'Cancel' : 'Pin Drop'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {!isPickerMode && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={THEME.colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Delivery address (Drop location)"
              placeholderTextColor={THEME.colors.mutedText}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color={THEME.colors.mutedText} />
              </TouchableOpacity>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginLeft: 6 }} />
            )}
          </View>
        )}

        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.resultsCard}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handleSelectPlace(item)}
                >
                  <Ionicons name="cube" size={18} color={THEME.colors.primary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>

      {/* Floating Confirm Button for Pin Picker */}
      {isPickerMode && (
        <View style={styles.pickerConfirmWrap}>
          <PressableScale style={styles.confirmPinBtn} onPress={handleConfirmPicker}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.confirmPinText}>Set as Parcel Drop Location</Text>
          </PressableScale>
        </View>
      )}

      {/* Bottom Sheet Card: Size Selection & Send Button */}
      {destination && !isPickerMode && (
        <View style={[styles.bottomSheet, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          <View style={styles.routeStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statVal}>
                {routeLoading ? '…' : `${distanceKm} km`}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Delivery Time</Text>
              <Text style={styles.statVal}>
                {routeLoading ? '…' : `~${durationMins + 15} mins`}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Estimated Fare</Text>
              <Text style={[styles.statVal, { color: THEME.colors.primaryDark }]}>
                {CURRENCY_SYMBOL}{totalFare}
              </Text>
            </View>
          </View>

          <Text style={styles.sizeSectionTitle}>Select Parcel Size</Text>
          <View style={styles.sizeRow}>
            {SIZES.map((s) => {
              const isSelected = selectedSize === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sizeCard, isSelected && styles.sizeCardSelected]}
                  onPress={() => setSelectedSize(s.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={s.icon}
                    size={24}
                    color={isSelected ? THEME.colors.primary : THEME.colors.mutedText}
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={[styles.sizeLabel, isSelected && styles.sizeLabelSelected]}>
                    {s.label}
                  </Text>
                  <Text style={styles.sizeSub}>{s.sub}</Text>
                  <Text style={styles.sizeExtra}>
                    {s.extraFare > 0 ? `+${CURRENCY_SYMBOL}${s.extraFare}` : 'Base'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PressableScale
            style={styles.sendButton}
            onPress={() => showToast('UniGo Box is coming soon!')}
          >
            <Text style={styles.sendButtonText}>Send Parcel • {CURRENCY_SYMBOL}{totalFare}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </PressableScale>
        </View>
      )}

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
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  pinToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  pinToggleBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  pinToggleText: {
    fontSize: 12,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
    marginLeft: 4,
  },
  pinToggleTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.textPrimary,
  },
  resultsCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  pickerConfirmWrap: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 25,
  },
  confirmPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.radius.pill,
    ...THEME.shadows.floating,
  },
  confirmPinText: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
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
  routeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.tile,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border,
  },
  sizeSectionTitle: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: 10,
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  sizeCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.tile,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizeCardSelected: {
    backgroundColor: '#E6F4EA',
    borderColor: THEME.colors.primary,
  },
  sizeLabel: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.textPrimary,
  },
  sizeLabelSelected: {
    color: THEME.colors.primaryDark,
  },
  sizeSub: {
    fontSize: 10,
    color: THEME.colors.mutedText,
    marginTop: 1,
  },
  sizeExtra: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
    marginTop: 4,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryDark,
    paddingVertical: 15,
    borderRadius: THEME.radius.pill,
    ...THEME.shadows.card,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
  },
});
