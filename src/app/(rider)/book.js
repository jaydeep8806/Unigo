import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { THEME } from '../../constants/theme';
import { CURRENCY_SYMBOL, VEHICLE_TYPES, DEFAULT_CITY } from '../../constants/config';
import { searchLocations, reverseGeocode } from '../../services/geocoding';
import { fetchDrivingRoute } from '../../services/osrm';
import LeafletMap from '../../components/LeafletMap';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const isCarpool = params.type === 'carpool';
  const shouldAutoFocus = params.autoFocus === 'true';

  const { coordinates, selectedCity } = useLocation();

  // Active user origin (strictly within India)
  const origin = useMemo(() => {
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const lat = coordinates.latitude;
      const lng = coordinates.longitude;
      // Only use GPS coordinates if they are inside India
      if (lat >= 6.0 && lat <= 38.5 && lng >= 68.0 && lng <= 98.0) {
        return {
          latitude: lat,
          longitude: lng,
          title: 'Current Location',
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

  // Destination state
  const [destination, setDestination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Picker mode state
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [pickerCoords, setPickerCoords] = useState(null);

  // Route & Fares
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null); // { distanceKm, durationMins }
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]?.id || 'bike');

  // Feedback toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  // Auto-focus if requested
  useEffect(() => {
    if (shouldAutoFocus && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [shouldAutoFocus]);

  // Debounced search query
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

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

  // Calculate driving route using OSRM
  const calculateRoute = useCallback(async (start, end) => {
    setRouteLoading(true);
    try {
      const data = await fetchDrivingRoute(
        { latitude: start.latitude, longitude: start.longitude },
        { latitude: end.latitude, longitude: end.longitude }
      );
      setRouteCoords(data.coordinates.map((c) => [c.latitude, c.longitude]));
      setRouteInfo({
        distanceKm: +(data.distanceMeters / 1000).toFixed(1),
        durationMins: Math.max(1, Math.round(data.durationSeconds / 60)),
      });
    } catch {
      // Fallback straight line
      setRouteCoords([
        [start.latitude, start.longitude],
        [end.latitude, end.longitude],
      ]);
      // Approx straight line distance
      const dLat = (end.latitude - start.latitude) * 111;
      const dLon = (end.longitude - start.longitude) * 111;
      const dist = +Math.sqrt(dLat * dLat + dLon * dLon).toFixed(1);
      setRouteInfo({
        distanceKm: Math.max(0.5, dist),
        durationMins: Math.max(2, Math.round(dist * 3)),
      });
    } finally {
      setRouteLoading(false);
    }
  }, []);

  // Select place from autocomplete
  const handleSelectPlace = useCallback(async (place) => {
    Keyboard.dismiss();
    setShowSearchResults(false);
    setSearchQuery(place.title);
    setIsPickerMode(false);

    const dest = {
      latitude: place.latitude,
      longitude: place.longitude,
      title: place.title,
      subtitle: place.subtitle,
    };
    setDestination(dest);
    await calculateRoute(origin, dest);
  }, [origin, calculateRoute]);

  // Confirm pin picker
  const handleConfirmPicker = async () => {
    if (!pickerCoords) return;
    setIsPickerMode(false);
    try {
      const geo = await reverseGeocode(pickerCoords.lat, pickerCoords.lng);
      const dest = {
        latitude: pickerCoords.lat,
        longitude: pickerCoords.lng,
        title: geo.title || 'Pinned Location',
        subtitle: geo.subtitle,
      };
      setDestination(dest);
      setSearchQuery(dest.title);
      await calculateRoute(origin, dest);
    } catch {
      const dest = {
        latitude: pickerCoords.lat,
        longitude: pickerCoords.lng,
        title: 'Pinned Location',
      };
      setDestination(dest);
      await calculateRoute(origin, dest);
    }
  };

  // Map markers
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

  // Map fit bounds
  const fitBounds = useMemo(() => {
    if (!destination) return null;
    return [
      [origin.latitude, origin.longitude],
      [destination.latitude, destination.longitude],
    ];
  }, [origin, destination]);

  // Compute fares
  const distance = routeInfo?.distanceKm || 0;
  const fares = useMemo(() => {
    return VEHICLE_TYPES.map((v) => {
      let fare = v.baseFare + Math.round(v.perKm * distance);
      if (isCarpool) {
        // Carpool split (approx 40% discount)
        fare = Math.round(fare * 0.6);
      }
      return {
        ...v,
        fare: Math.max(v.baseFare, fare),
      };
    });
  }, [distance, isCarpool]);

  return (
    <View style={styles.container}>
      {/* Full-screen Leaflet Map */}
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
            <Text style={styles.headerTitle}>
              {isCarpool ? 'UniGo Carpool' : 'Book a Ride'}
            </Text>
            <Text style={styles.headerSubtitle}>
              📍 {selectedCity?.name || 'Current City'}
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

        {/* Search Input Bar */}
        {!isPickerMode && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={THEME.colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Where to? (e.g. Airport, Railway Station)"
              placeholderTextColor={THEME.colors.mutedText}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
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

        {/* Autocomplete Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.resultsCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 220 }}
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handleSelectPlace(item)}
                >
                  <Ionicons name="location-sharp" size={18} color={THEME.colors.primary} style={{ marginRight: 10 }} />
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

      {/* Picker Mode Floating Confirm Button */}
      {isPickerMode && (
        <View style={styles.pickerConfirmWrap}>
          <PressableScale
            style={styles.confirmPinBtn}
            onPress={handleConfirmPicker}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.confirmPinText}>Set as Drop Location</Text>
          </PressableScale>
        </View>
      )}

      {/* Bottom Sheet Card: Fares & Booking */}
      {destination && !isPickerMode && (
        <View style={[styles.bottomSheet, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          {/* Carpool split notification badge */}
          {isCarpool && (
            <View style={styles.carpoolNotice}>
              <Ionicons name="people" size={16} color="#064E3B" style={{ marginRight: 6 }} />
              <Text style={styles.carpoolNoticeText}>
                Fare split between riders • Save up to 40%
              </Text>
            </View>
          )}

          {/* Route meta stats */}
          <View style={styles.routeMetaRow}>
            <View style={styles.routeStat}>
              <Ionicons name="navigate-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.routeStatText}>
                {routeLoading ? 'Calculating…' : `${routeInfo?.distanceKm || 0} km`}
              </Text>
            </View>
            <View style={styles.routeStatDivider} />
            <View style={styles.routeStat}>
              <Ionicons name="time-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.routeStatText}>
                {routeLoading ? '…' : `${routeInfo?.durationMins || 0} mins`}
              </Text>
            </View>
            <View style={styles.routeStatDivider} />
            <View style={styles.routeStat}>
              <Ionicons name="cash-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.routeStatText}>Cash / UPI</Text>
            </View>
          </View>

          {/* Vehicle options */}
          <View style={styles.vehicleRow}>
            {fares.map((v) => {
              const isSelected = selectedVehicle === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleCard,
                    isSelected && styles.vehicleCardSelected,
                  ]}
                  onPress={() => setSelectedVehicle(v.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.vehicleIcon}>{v.icon}</Text>
                  <Text style={styles.vehicleName} numberOfLines={1}>
                    {v.name.replace('UniGo ', '')}
                  </Text>
                  <Text style={styles.vehicleFare}>
                    {CURRENCY_SYMBOL}{v.fare}
                  </Text>
                  <Text style={styles.vehicleCapacity}>{v.capacity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Book Ride Button */}
          <PressableScale
            style={styles.bookButton}
            onPress={() => showToast('Booking coming soon')}
          >
            <Text style={styles.bookButtonText}>
              {isCarpool ? 'Find Carpool Match' : 'Book Ride'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </PressableScale>
        </View>
      )}

      {/* Toast feedback */}
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
    fontSize: 17,
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
  carpoolNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  carpoolNoticeText: {
    fontSize: 12,
    fontWeight: THEME.fontWeights.semibold,
    color: '#064E3B',
  },
  routeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: THEME.colors.tile,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStatText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.textPrimary,
    marginLeft: 6,
  },
  routeStatDivider: {
    width: 1,
    height: 18,
    backgroundColor: THEME.colors.border,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: THEME.colors.tile,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleCardSelected: {
    backgroundColor: '#E6F4EA',
    borderColor: THEME.colors.primary,
  },
  vehicleIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 12,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  vehicleFare: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.primaryDark,
    marginBottom: 2,
  },
  vehicleCapacity: {
    fontSize: 10,
    color: THEME.colors.mutedText,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryDark,
    paddingVertical: 15,
    borderRadius: THEME.radius.pill,
    ...THEME.shadows.card,
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
  },
});
