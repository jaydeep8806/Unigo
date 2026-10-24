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
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { THEME } from '../../constants/theme';
import { CURRENCY_SYMBOL, DEFAULT_CITY } from '../../constants/config';
import { searchLocations, reverseGeocode } from '../../services/geocoding';
import { fetchDrivingRoute } from '../../services/osrm';
import { calculateAllFares } from '../../services/pricing';
import LeafletMap from '../../components/LeafletMap';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const isCarpool = params.type === 'carpool';
  const shouldAutoFocus = params.autoFocus === 'true';

  const { coordinates, selectedCity, permissionStatus, requestLocation } = useLocation();

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

  // Pin Drop (Picker) mode state
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [pickerCoords, setPickerCoords] = useState(null);
  const [pickerAddress, setPickerAddress] = useState('');
  const [pickerAddressLoading, setPickerAddressLoading] = useState(false);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const pickerDebounceRef = useRef(null);

  // Route & Fares
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null); // { distanceKm, durationMins }
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('bike');

  // Feedback toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const hasRequestedLocationRef = useRef(false);

  useEffect(() => {
    if (permissionStatus !== 'undetermined' || hasRequestedLocationRef.current) return;
    hasRequestedLocationRef.current = true;
    requestLocation();
  }, [permissionStatus, requestLocation]);

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

  // Live distance from Pickup to current Drop pin
  const pickerDistKm = useMemo(() => {
    if (!pickerCoords || !origin) return null;
    const dLat = (pickerCoords.lat - origin.latitude) * 111;
    const dLon =
      (pickerCoords.lng - origin.longitude) *
      111 *
      Math.cos((origin.latitude * Math.PI) / 180);
    return +Math.sqrt(dLat * dLat + dLon * dLon).toFixed(1);
  }, [pickerCoords, origin]);

  // Prevent user from selecting Pickup as Drop point (< 200m)
  const isTooClose = pickerDistKm !== null && pickerDistKm < 0.2;

  // Real-time Rapido fare estimate for the picker banner
  const estPickerFare = useMemo(() => {
    if (pickerDistKm === null || pickerDistKm < 0.2) return null;
    const bike = Math.max(
      25,
      Math.round(25 + Math.max(0, pickerDistKm - 1.5) * 9 + pickerDistKm * 3 * 1.0 + 3)
    );
    const auto = Math.max(
      35,
      Math.round(35 + Math.max(0, pickerDistKm - 1.5) * 13 + pickerDistKm * 3 * 1.25 + 4)
    );
    return { bike, auto };
  }, [pickerDistKm]);

  // Debounced search query for autocomplete
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
  const handleSelectPlace = useCallback(
    async (place) => {
      Keyboard.dismiss();
      setShowSearchResults(false);
      setSearchQuery(place.title);
      setIsPickerMode(false);
      setFlyToCoords(null);

      const dest = {
        latitude: place.latitude,
        longitude: place.longitude,
        title: place.title,
        subtitle: place.subtitle,
      };
      setDestination(dest);
      await calculateRoute(origin, dest);
    },
    [origin, calculateRoute]
  );

  // Reverse-geocode live address while dragging/panning the map
  const fetchPickerAddress = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    setPickerAddressLoading(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      setPickerAddress(
        geo.title ? `${geo.title}${geo.subtitle ? ', ' + geo.subtitle : ''}` : 'Pinned Location'
      );
    } catch {
      setPickerAddress('Selected Drop Point');
    } finally {
      setPickerAddressLoading(false);
    }
  }, []);

  // Center change listener for picker mode (invoked on map moveend)
  const handleCenterChange = useCallback(
    (coords) => {
      setPickerCoords(coords);
      if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);
      pickerDebounceRef.current = setTimeout(() => {
        fetchPickerAddress(coords.lat, coords.lng);
      }, 300);
    },
    [fetchPickerAddress]
  );

  // Toggle Pin Drop mode
  const togglePickerMode = useCallback(() => {
    const next = !isPickerMode;
    setIsPickerMode(next);
    setShowSearchResults(false);
    Keyboard.dismiss();
    if (next) {
      // Start at existing destination if set; otherwise offset by ~1.2 km from origin
      // so it NEVER starts at or overlaps with the Pickup point!
      const initial = destination
        ? { lat: destination.latitude, lng: destination.longitude }
        : {
            lat: +(origin.latitude + 0.009).toFixed(6),
            lng: +(origin.longitude + 0.009).toFixed(6),
          };
      setPickerCoords(initial);
      setFlyToCoords({ lat: initial.lat, lng: initial.lng, timestamp: Date.now() });
      fetchPickerAddress(initial.lat, initial.lng);
    } else {
      setFlyToCoords(null);
    }
  }, [isPickerMode, destination, origin, fetchPickerAddress]);

  // Confirm pin picker
  const handleConfirmPicker = async () => {
    if (isTooClose) {
      showToast('Please drag the map to choose a drop point away from pickup');
      return;
    }
    const target = pickerCoords || {
      lat: +(origin.latitude + 0.009).toFixed(6),
      lng: +(origin.longitude + 0.009).toFixed(6),
    };
    setIsPickerMode(false);
    setFlyToCoords(null);
    try {
      const geo = await reverseGeocode(target.lat, target.lng);
      const dest = {
        latitude: target.lat,
        longitude: target.lng,
        title: geo.title || pickerAddress || 'Drop Location',
        subtitle: geo.subtitle,
      };
      setDestination(dest);
      setSearchQuery(dest.title);
      await calculateRoute(origin, dest);
    } catch {
      const dest = {
        latitude: target.lat,
        longitude: target.lng,
        title: pickerAddress || 'Drop Location',
      };
      setDestination(dest);
      setSearchQuery(dest.title);
      await calculateRoute(origin, dest);
    }
  };

  // Map markers: always show Pickup; show Drop only when confirmed (not during picker mode)
  const markers = useMemo(() => {
    const list = [
      {
        lat: origin.latitude,
        lng: origin.longitude,
        label: 'Pickup',
        color: '#0F7A56',
      },
    ];
    if (destination && !isPickerMode) {
      list.push({
        lat: destination.latitude,
        lng: destination.longitude,
        label: 'Drop',
        color: '#EF4444',
      });
    }
    return list;
  }, [origin, destination, isPickerMode]);

  // Map fit bounds: fit Pickup and Drop once confirmed
  const fitBounds = useMemo(() => {
    if (!destination || isPickerMode) return null;
    return [
      [origin.latitude, origin.longitude],
      [destination.latitude, destination.longitude],
    ];
  }, [origin, destination, isPickerMode]);

  // Compute fares using Rapido pricing formula
  const distance = routeInfo?.distanceKm || 0;
  const duration = routeInfo?.durationMins || 0;
  const fares = useMemo(() => {
    return calculateAllFares(distance, duration, isCarpool);
  }, [distance, duration, isCarpool]);

  const selectedFareObj = useMemo(() => {
    return fares.find((f) => f.id === selectedVehicle) || fares[0];
  }, [fares, selectedVehicle]);

  return (
    <View style={styles.container}>
      {/* Full-screen Leaflet Map */}
      <View style={[StyleSheet.absoluteFillObject, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, zIndex: 0 }]}>
        <LeafletMap
          center={{ lat: origin.latitude, lng: origin.longitude }}
          zoom={14}
          markers={markers}
          route={isPickerMode ? [] : routeCoords}
          pickerMode={isPickerMode}
          flyTo={flyToCoords}
          onCenterChange={handleCenterChange}
          onDraggingChange={setIsMapDragging}
          fitBounds={fitBounds}
        />
      </View>

      {/* Floating Center Pin Overlay (Rapido & Uber style) */}
      {isPickerMode && (
        <View style={styles.centerPinWrapper} pointerEvents="none">
          <View style={styles.centerTooltip}>
            <Text style={styles.centerTooltipText}>Drop Location</Text>
            <Text style={styles.centerTooltipSub}>Drag map or tap to move</Text>
          </View>
          <View
            style={[
              styles.centerPinIconWrap,
              isMapDragging && styles.centerPinIconWrapLifted,
            ]}
          >
            <Ionicons name="location" size={44} color="#EF4444" />
            <View style={styles.centerPinDot} />
          </View>
          <View
            style={[
              styles.centerPinShadow,
              isMapDragging && styles.centerPinShadowShrunk,
            ]}
          />
        </View>
      )}

      {/* Recenter Near Pickup Button in Picker Mode */}
      {isPickerMode && (
        <TouchableOpacity
          style={styles.recenterBtn}
          onPress={() => {
            const near = {
              lat: +(origin.latitude + 0.009).toFixed(6),
              lng: +(origin.longitude + 0.009).toFixed(6),
              timestamp: Date.now(),
            };
            setFlyToCoords(near);
            setPickerCoords(near);
            fetchPickerAddress(near.lat, near.lng);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={18} color={THEME.colors.primary} />
          <Text style={styles.recenterBtnText}>Near Pickup</Text>
        </TouchableOpacity>
      )}

      {/* Top Header Card */}
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
            <Text style={styles.headerTitle}>
              {isCarpool ? 'UniGo Carpool' : 'Book a Ride'}
            </Text>
            <Text style={styles.headerSubtitle}>
              📍 {selectedCity?.name || 'Current City'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.pinToggleBtn, isPickerMode && styles.pinToggleBtnActive]}
            onPress={togglePickerMode}
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

        {/* Search Input Bar or Pin Drop Banner */}
        {!isPickerMode ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={THEME.colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Where to?"
              placeholderTextColor={THEME.colors.mutedText}
              numberOfLines={1}
              multiline={false}
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
        ) : (
          <View style={styles.pickerModeBanner}>
            <Ionicons name="navigate-circle" size={20} color="#065F46" style={{ marginRight: 8 }} />
            <Text style={styles.pickerModeBannerText}>
              Pan the map to position the pin on your drop spot
            </Text>
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

      {/* Picker Mode Floating Confirm Button with Live Address */}
      {isPickerMode && (
        <View style={styles.pickerConfirmWrap}>
          <View style={styles.pickerAddressCard}>
            <View style={styles.pickerAddressHeader}>
              <Text style={styles.pickerAddressLabel}>Selected Drop Point</Text>
              {pickerDistKm !== null && (
                <Text style={[styles.pickerDistBadge, isTooClose && styles.pickerDistBadgeWarn]}>
                  {pickerDistKm} km from pickup
                </Text>
              )}
            </View>
            <View style={styles.pickerAddressBody}>
              <View style={[styles.pickerDot, isTooClose && { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.pickerAddressText} numberOfLines={2}>
                {pickerAddressLoading ? 'Detecting address…' : (pickerAddress || 'Point on map')}
              </Text>
              {pickerAddressLoading && (
                <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginLeft: 8 }} />
              )}
            </View>
            {estPickerFare && !isTooClose && (
              <Text style={styles.pickerFareEstimate}>
                ⚡ Rapido Est: ₹{estPickerFare.bike} (Bike) • ₹{estPickerFare.auto} (Auto)
              </Text>
            )}
            {isTooClose && (
              <Text style={styles.pickerTooCloseWarn}>
                ⚠️ Too close to pickup! Drag map away to select drop spot.
              </Text>
            )}
          </View>
          <PressableScale
            style={[styles.confirmPinBtn, isTooClose && styles.confirmPinBtnDisabled]}
            onPress={handleConfirmPicker}
            disabled={isTooClose}
          >
            <Ionicons
              name={isTooClose ? 'alert-circle' : 'checkmark-circle'}
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.confirmPinText}>
              {isTooClose ? 'Too Close to Pickup' : 'Set as Drop Location'}
            </Text>
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

          {/* Rapido Fare Breakdown Pill */}
          {selectedFareObj && (
            <View style={styles.fareBreakdownBox}>
              <View style={styles.fareBreakdownHeader}>
                <Ionicons name="flash" size={13} color="#0F7A56" />
                <Text style={styles.fareBreakdownTitle}>
                  Rapido Rate: Base ₹{selectedFareObj.baseFare} + ₹{selectedFareObj.perKm}/km + ₹{selectedFareObj.perMinute}/min
                </Text>
                <Text style={styles.fareBreakdownEta}>{selectedFareObj.etaText}</Text>
              </View>
              <Text style={styles.fareBreakdownFormula}>
                Base ₹{selectedFareObj.baseFare} (first {selectedFareObj.baseKm}km) + ₹{selectedFareObj.distanceFare} distance + ₹{selectedFareObj.timeFare} ride time + ₹{selectedFareObj.platformFee} fee{isCarpool ? ` • Carpool -₹${selectedFareObj.discount}` : ''}
              </Text>
            </View>
          )}

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
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -60,
    marginTop: -74,
    width: 120,
    alignItems: 'center',
    zIndex: 15,
  },
  centerTooltip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  centerTooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
  },
  centerTooltipSub: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: THEME.fontWeights.medium,
  },
  centerPinIconWrap: {
    alignItems: 'center',
    transform: [{ translateY: 0 }],
  },
  centerPinIconWrapLifted: {
    transform: [{ translateY: -8 }],
  },
  centerPinDot: {
    position: 'absolute',
    bottom: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  centerPinShadow: {
    width: 14,
    height: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    marginTop: -3,
    transform: [{ scale: 1 }],
  },
  centerPinShadowShrunk: {
    opacity: 0.4,
    transform: [{ scale: 0.6 }],
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    top: 135,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    zIndex: 20,
  },
  recenterBtnText: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
    marginLeft: 4,
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
    minWidth: 0,
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
    height: 52,
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
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 25,
  },
  pickerAddressCard: {
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.floating,
  },
  pickerAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pickerAddressLabel: {
    fontSize: 10,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerDistBadge: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: '#0F7A56',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pickerDistBadgeWarn: {
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
  },
  pickerAddressBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 10,
  },
  pickerAddressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  pickerFareEstimate: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.semibold,
    color: '#0F7A56',
    marginTop: 6,
  },
  pickerTooCloseWarn: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: '#DC2626',
    marginTop: 6,
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
  confirmPinBtnDisabled: {
    backgroundColor: '#94A3B8',
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
  pickerModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    ...THEME.shadows.card,
  },
  pickerModeBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: THEME.fontWeights.semibold,
    color: '#065F46',
  },
  fareBreakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fareBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fareBreakdownTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: '#0F7A56',
  },
  fareBreakdownEta: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.medium,
    color: THEME.colors.mutedText,
  },
  fareBreakdownFormula: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
});