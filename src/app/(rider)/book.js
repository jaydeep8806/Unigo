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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { useWallet } from '../../context/WalletProvider';
import { useActivity } from '../../context/ActivityProvider';
import { THEME } from '../../constants/theme';
import { CURRENCY_SYMBOL, DEFAULT_CITY } from '../../constants/config';
import { searchLocations, reverseGeocode } from '../../services/geocoding';
import { fetchDrivingRoute } from '../../services/osrm';
import { calculateAllFares } from '../../services/pricing';
import LeafletMap from '../../components/LeafletMap';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';
import { useSavedLocations } from '../../hooks/useSavedLocations';

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const params = useLocalSearchParams();
  const isCarpool = params.type === 'carpool';
  const shouldAutoFocus = params.autoFocus === 'true';

  const { coordinates, selectedCity } = useLocation();
  const { rides, addRide } = useActivity();
  const { balance } = useWallet();
  const { places, addRecent, savePlace } = useSavedLocations();

  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [reviewRide, setReviewRide] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Active user origin (customizable by user or defaulted to GPS/City)
  const defaultOrigin = useMemo(() => {
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const lat = coordinates.latitude;
      const lng = coordinates.longitude;
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
      title: city.isManual ? city.name : `${city.name} Center`,
    };
  }, [coordinates, selectedCity]);

  // Dual origin and destination states
  const [customOrigin, setCustomOrigin] = useState(null);
  const origin = customOrigin || defaultOrigin;
  const [destination, setDestination] = useState(null);

  // Active search field: 'pickup' | 'drop'
  const [activeSearchField, setActiveSearchField] = useState('drop');
  const [pickupQuery, setPickupQuery] = useState(defaultOrigin?.title || '');
  const [dropQuery, setDropQuery] = useState('');

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [searchError, setSearchError] = useState(false);

  // Pin Drop (Picker) mode state
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [pickerCoords, setPickerCoords] = useState(null);
  const [pickerAddress, setPickerAddress] = useState('');
  const [pickerAddressLoading, setPickerAddressLoading] = useState(false);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const pickerDebounceRef = useRef(null);
  const pickerRequestRef = useRef(0);

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
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidHide', () => setIsEditingLocation(false));
    return () => listener.remove();
  }, []);

  useEffect(() => {
    // Keep the displayed default in sync when GPS or the selected city changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!customOrigin && !isEditingLocation) setPickupQuery(defaultOrigin.title);
  }, [customOrigin, defaultOrigin, isEditingLocation]);

  useEffect(() => () => {
    clearTimeout(debounceTimerRef.current);
    clearTimeout(pickerDebounceRef.current);
    searchRequestRef.current += 1;
    pickerRequestRef.current += 1;
  }, []);

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
    return +Math.sqrt(dLat * dLat + dLon * dLon).toFixed(2);
  }, [pickerCoords, origin]);

  // Avoid selecting essentially the same point as pickup while allowing short rides.
  const isTooClose = pickerDistKm !== null && pickerDistKm < 0.02;

  // Real-time Rapido fare estimate for the picker banner
  const estPickerFare = useMemo(() => {
    if (pickerDistKm === null || pickerDistKm < 0.02) return null;
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

  // Debounced search query for autocomplete (pickup or drop)
  const handleSearchChange = (text, field = activeSearchField) => {
    const requestId = ++searchRequestRef.current;
    setSearchError(false);
    setSearchResults([]);
    if (field === 'pickup') {
      setPickupQuery(text);
    } else {
      setDropQuery(text);
    }

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
        if (requestId === searchRequestRef.current) setSearchResults(results);
      } catch {
        if (requestId === searchRequestRef.current) setSearchError(true);
      } finally {
        if (requestId === searchRequestRef.current) setIsSearching(false);
      }
    }, 800);
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
      addRecent(place);
      Keyboard.dismiss();
      setIsEditingLocation(false);
      searchRequestRef.current += 1;
      clearTimeout(debounceTimerRef.current);
      setIsSearching(false);
      setShowSearchResults(false);
      setIsPickerMode(false);
      setFlyToCoords(null);

      const selectedLoc = {
        latitude: place.latitude,
        longitude: place.longitude,
        title: place.title,
        subtitle: place.subtitle,
      };

      if (activeSearchField === 'pickup') {
        setCustomOrigin(selectedLoc);
        setPickupQuery(place.title);
        if (destination) {
          await calculateRoute(selectedLoc, destination);
        }
      } else {
        setDestination(selectedLoc);
        setDropQuery(place.title);
        await calculateRoute(origin, selectedLoc);
      }
    },
    [activeSearchField, destination, origin, calculateRoute, addRecent]
  );

  // Swap pickup and drop
  const handleSwapLocations = useCallback(() => {
    if (!destination) return;
    const tempOrigin = origin;
    setCustomOrigin(destination);
    setPickupQuery(destination.title);
    setDestination(tempOrigin);
    setDropQuery(tempOrigin.title);
    calculateRoute(destination, tempOrigin);
  }, [origin, destination, calculateRoute]);

  // Reverse-geocode live address while dragging/panning the map
  const fetchPickerAddress = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    const requestId = ++pickerRequestRef.current;
    setPickerAddressLoading(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      if (requestId === pickerRequestRef.current) setPickerAddress(
        geo.title ? `${geo.title}${geo.subtitle ? ', ' + geo.subtitle : ''}` : 'Pinned Location'
      );
    } catch {
      if (requestId === pickerRequestRef.current) setPickerAddress('Selected Drop Point');
    } finally {
      if (requestId === pickerRequestRef.current) setPickerAddressLoading(false);
    }
  }, []);

  // Center change listener for picker mode (invoked on map moveend)
  const handleCenterChange = useCallback(
    (coords) => {
      pickerRequestRef.current += 1;
      setPickerCoords(coords);
      if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);
      pickerDebounceRef.current = setTimeout(() => {
        fetchPickerAddress(coords.lat, coords.lng);
      }, 800);
    },
    [fetchPickerAddress]
  );

  // Toggle Pin Drop mode
  const togglePickerMode = useCallback(() => {
    const next = !isPickerMode;
    setIsPickerMode(next);
    setIsEditingLocation(false);
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
      setDropQuery(dest.title);
      await calculateRoute(origin, dest);
    } catch {
      const dest = {
        latitude: target.lat,
        longitude: target.lng,
        title: pickerAddress || 'Drop Location',
      };
      setDestination(dest);
      setDropQuery(dest.title);
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

  const handleConfirmRide = async () => {
    if (!destination || !selectedFareObj) return;

    setReviewError('');
    setBookingInProgress(true);
    try {
      const fareAmount = selectedFareObj.fare;

      const ride = await addRide({
        origin: origin.title,
        destination: destination.title,
        vehicleId: selectedVehicle,
        vehicleName: selectedFareObj.name,
        fare: fareAmount,
        distanceKm: distance,
        durationMins: duration,
        paymentType: paymentMethod,
        isCarpool,
        status: 'searching',
        pickupCoords: { latitude: origin.latitude, longitude: origin.longitude },
        destinationCoords: { latitude: destination.latitude, longitude: destination.longitude },
        routeCoords,
      });

      setReviewRide(false);
      router.push({ pathname: '/(rider)/trip', params: { id: ride.id } });
    } catch {
      setReviewError('Could not complete booking. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full-screen Leaflet Map */}
      <View style={[StyleSheet.absoluteFillObject, { width: screenWidth, height: screenHeight, zIndex: 0 }]}>
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
      {!isPickerMode && !isEditingLocation && (
        <TouchableOpacity style={[styles.recenterBtn, { top: undefined, bottom: Math.max(insets.bottom + 24, destination ? screenHeight * 0.57 : (rides.length > 0 ? 192 : 24)) }]} onPress={() => setFlyToCoords({ lat: origin.latitude, lng: origin.longitude, timestamp: Date.now() })} accessibilityLabel="Recenter on pickup">
          <Ionicons name="locate" size={18} color={THEME.colors.primary} /><Text style={styles.recenterBtnText}>Pickup</Text>
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

        {/* Professional Dual Search Panel: FROM (Pickup) -> TO (Drop) */}
        {!isPickerMode ? (
          <View style={styles.dualSearchCard}>
            <View style={styles.dualSearchTimeline}>
              <View style={styles.pickupDot} />
              <View style={styles.timelineLine} />
              <View style={styles.dropSquare} />
            </View>

            <View style={styles.dualSearchInputsCol}>
              {/* Pickup Input */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.searchInput,
                    activeSearchField === 'pickup' && styles.searchInputActive,
                  ]}
                  placeholder="Enter pickup location"
                  placeholderTextColor={THEME.colors.mutedText}
                  value={pickupQuery}
                  onFocus={() => {
                    setIsEditingLocation(true);
                    if (activeSearchField !== 'pickup') {
                      searchRequestRef.current += 1;
                      clearTimeout(debounceTimerRef.current);
                      setIsSearching(false);
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }
                    setActiveSearchField('pickup');
                    if (activeSearchField === 'pickup' && searchResults.length > 0) setShowSearchResults(true);
                  }}
                  onChangeText={(text) => handleSearchChange(text, 'pickup')}
                  returnKeyType="search"
                />
                {pickupQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      searchRequestRef.current += 1;
                      clearTimeout(debounceTimerRef.current);
                      setIsSearching(false);
                      setPickupQuery('');
                      setCustomOrigin(null);
                      setSearchResults([]);
                    }}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={16} color={THEME.colors.mutedText} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.searchDivider} />

              {/* Drop Input */}
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={searchInputRef}
                  style={[
                    styles.searchInput,
                    activeSearchField === 'drop' && styles.searchInputActive,
                  ]}
                  placeholder="Where to? (Destination)"
                  placeholderTextColor={THEME.colors.mutedText}
                  value={dropQuery}
                  onFocus={() => {
                    setIsEditingLocation(true);
                    if (activeSearchField !== 'drop') {
                      searchRequestRef.current += 1;
                      clearTimeout(debounceTimerRef.current);
                      setIsSearching(false);
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }
                    setActiveSearchField('drop');
                    if (activeSearchField === 'drop' && searchResults.length > 0) setShowSearchResults(true);
                  }}
                  onChangeText={(text) => handleSearchChange(text, 'drop')}
                  returnKeyType="search"
                />
                {dropQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      searchRequestRef.current += 1;
                      clearTimeout(debounceTimerRef.current);
                      setIsSearching(false);
                      setDropQuery('');
                      setDestination(null);
                      setSearchResults([]);
                    }}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={16} color={THEME.colors.mutedText} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Swap & Spinner Action Column */}
            <View style={styles.searchActionsCol}>
              <TouchableOpacity
                style={styles.swapBtn}
                onPress={handleSwapLocations}
                accessibilityLabel="Swap pickup and drop"
              >
                <Ionicons name="swap-vertical" size={18} color={THEME.colors.primary} />
              </TouchableOpacity>
              {isSearching && (
                <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginTop: 6 }} />
              )}
            </View>
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
        {showSearchResults && (searchResults.length > 0 || (!isSearching && (searchError || (activeSearchField === 'pickup' ? pickupQuery : dropQuery).trim().length >= 2))) && (
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
              {!searchResults.length && <Text style={styles.searchEmpty}>{searchError ? 'Location search is unavailable. Check your connection and try again.' : 'No places found. Try another area or add the city name.'}</Text>}
            </ScrollView>
            <Text style={styles.searchAttribution}>Location data © OpenStreetMap contributors</Text>
          </View>
        )}
        {isEditingLocation && !showSearchResults && (Object.keys(places.saved).length > 0 || places.recent.length > 0) && (
          <View style={styles.resultsCard}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
              {Object.entries(places.saved).map(([label, place]) => <TouchableOpacity key={label} style={styles.resultItem} onPress={() => handleSelectPlace(place)}><Ionicons name="bookmark-outline" size={18} color={THEME.colors.primary} style={{ marginRight: 10 }} /><View style={{ flex: 1 }}><Text style={styles.resultTitle}>{label}</Text><Text style={styles.resultSubtitle} numberOfLines={1}>{place.title}</Text></View></TouchableOpacity>)}
              {places.recent.slice(0, 4).map((place) => <TouchableOpacity key={`recent-${place.id}`} style={styles.resultItem} onPress={() => handleSelectPlace(place)}><Ionicons name="time-outline" size={18} color={THEME.colors.primary} style={{ marginRight: 10 }} /><Text style={styles.resultTitle} numberOfLines={1}>{place.title}</Text></TouchableOpacity>)}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>

      {!destination && !isPickerMode && !isEditingLocation && rides.length > 0 && (
        <View style={[styles.recentTrips, { bottom: Math.max(16, insets.bottom + 8) }]}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent trips</Text>
            <TouchableOpacity onPress={() => router.push('/(rider)/(tabs)/activities')}>
              <Text style={styles.recentSeeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {rides.slice(0, 2).map((ride) => (
            <TouchableOpacity key={ride.id} style={styles.recentTripRow} onPress={() => router.push({ pathname: '/(rider)/trip', params: { id: ride.id } })}>
              <Ionicons name="time-outline" size={20} color={THEME.colors.primary} />
              <View style={styles.recentTripText}>
                <Text style={styles.recentDestination} numberOfLines={1}>{ride.destination}</Text>
                <Text style={styles.recentDetails} numberOfLines={1}>{ride.vehicleName} · {CURRENCY_SYMBOL}{ride.fare}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.mutedText} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Picker Mode Floating Confirm Button with Live Address */}
      {isPickerMode && (
        <View style={[styles.pickerConfirmWrap, { bottom: Math.max(16, insets.bottom + 8) }]}>
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
                Estimate: ₹{estPickerFare.bike} (Bike) • ₹{estPickerFare.auto} (Auto)
              </Text>
            )}
            {isTooClose && (
              <Text style={styles.pickerTooCloseWarn}>
                ⚠️ Too close to pickup! Drag map away to select drop spot.
              </Text>
            )}
          </View>
          <PressableScale
            style={[styles.confirmPinBtn, (isTooClose || isMapDragging) && styles.confirmPinBtnDisabled]}
            onPress={handleConfirmPicker}
            disabled={isTooClose || isMapDragging}
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
      {destination && !isPickerMode && !isEditingLocation && pickupQuery === origin.title && dropQuery === destination.title && (
        <View style={[styles.bottomSheet, { height: Math.min(screenHeight * 0.55, 410), paddingBottom: Math.max(12, insets.bottom + 8) }]}>
          <ScrollView style={styles.fareScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.saveLocations}><Text style={styles.saveLocationsLabel}>Save destination as</Text>{['Home', 'Work', 'College'].map((label) => <TouchableOpacity key={label} onPress={() => { savePlace(label, { id: `${destination.latitude}-${destination.longitude}`, ...destination }); showToast(`Saved as ${label}`); }}><Text style={styles.saveLocationLink}>{label}</Text></TouchableOpacity>)}</View>
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
              <Text style={styles.routeStatText}>Cash / Wallet</Text>
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
                  Estimated fare: Base ₹{selectedFareObj.baseFare} + ₹{selectedFareObj.perKm}/km + ₹{selectedFareObj.perMinute}/min
                </Text>
                <Text style={styles.fareBreakdownEta}>{selectedFareObj.etaText}</Text>
              </View>
              <Text style={styles.fareBreakdownFormula}>
                Base ₹{selectedFareObj.baseFare} (first {selectedFareObj.baseKm}km) + ₹{selectedFareObj.distanceFare} distance + ₹{selectedFareObj.timeFare} ride time + ₹{selectedFareObj.platformFee} fee{isCarpool ? ` • Carpool -₹${selectedFareObj.discount}` : ''}
              </Text>
            </View>
          )}

          </ScrollView>
          {/* Book Ride Button */}
          <View style={styles.bookFooter}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => { setReviewError(''); setReviewRide(true); }}
            disabled={bookingInProgress || routeLoading}
            accessibilityRole="button"
          >
            {bookingInProgress || routeLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.bookButtonText}>
                  {`Continue with ${selectedFareObj?.name || 'Ride'}`} • ₹{selectedFareObj?.fare}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
          </View>
        </View>
      )}

      {reviewRide && destination && selectedFareObj && (
        <Modal visible animationType="slide" onRequestClose={() => { if (!bookingInProgress) setReviewRide(false); }}>
        <SafeAreaView style={styles.reviewScreen} edges={['top', 'bottom']}>
          <View style={styles.reviewHeader}>
            <TouchableOpacity style={styles.reviewBack} onPress={() => setReviewRide(false)} accessibilityLabel="Back to vehicle selection">
              <Ionicons name="arrow-back" size={23} color="#172a2a" />
            </TouchableOpacity>
            <View><Text style={styles.reviewTitle}>Review your ride</Text><Text style={styles.reviewSubtitle}>Check details before booking</Text></View>
          </View>
          <ScrollView contentContainerStyle={styles.reviewContent} showsVerticalScrollIndicator={false}>
            <View style={styles.reviewVehicle}>
              <View style={styles.reviewVehicleIcon}><Text style={{ fontSize: 32 }}>{selectedFareObj.icon}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.reviewVehicleName}>{selectedFareObj.name}</Text><Text style={styles.reviewMuted}>{selectedFareObj.capacity} · {distance} km · {duration} min trip</Text><Text style={styles.reviewMuted}>{selectedFareObj.etaText} (estimate)</Text></View>
              <Text style={styles.reviewPrice}>₹{selectedFareObj.fare}</Text>
            </View>
            <Text style={styles.reviewSectionTitle}>Your route</Text>
            <View style={styles.reviewCard}>
              <View style={styles.reviewRouteRow}><View style={[styles.reviewPoint, { backgroundColor: '#10b981' }]} /><View style={{ flex: 1 }}><Text style={styles.reviewLabel}>PICKUP</Text><Text style={styles.reviewAddress}>{origin.title}</Text></View></View>
              <View style={styles.reviewRouteDivider} />
              <View style={styles.reviewRouteRow}><View style={[styles.reviewPoint, { backgroundColor: '#ef4444' }]} /><View style={{ flex: 1 }}><Text style={styles.reviewLabel}>DROP</Text><Text style={styles.reviewAddress}>{destination.title}</Text></View></View>
            </View>
            <Text style={styles.reviewSectionTitle}>Payment method</Text>
            <View style={styles.reviewCard}>
              {['Cash', 'UniGo Wallet'].map((method) => (
                <TouchableOpacity key={method} style={styles.paymentRow} onPress={() => setPaymentMethod(method)} accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method }}>
                  <Ionicons name={method === 'Cash' ? 'cash-outline' : 'wallet-outline'} size={22} color="#0f7a56" />
                  <View style={{ flex: 1 }}><Text style={styles.paymentName}>{method}</Text>{method === 'UniGo Wallet' && <Text style={styles.reviewMuted}>Balance ₹{Number(balance).toFixed(2)}</Text>}</View>
                  <Ionicons name={paymentMethod === method ? 'radio-button-on' : 'radio-button-off'} size={22} color={paymentMethod === method ? '#0f7a56' : '#94a3b8'} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.demoNotice}><Ionicons name="information-circle-outline" size={19} color="#0f7a56" /><Text style={styles.demoNoticeText}>This is a demo booking. Driver details and the ride OTP are simulated.</Text></View>
            {!!reviewError && <Text style={styles.reviewError}>{reviewError}</Text>}
          </ScrollView>
          <View style={[styles.reviewFooter, { paddingBottom: Math.max(14, insets.bottom) }]}>
            <View style={styles.reviewTotalRow}><Text style={styles.reviewTotalLabel}>Estimated total</Text><Text style={styles.reviewTotal}>₹{selectedFareObj.fare}</Text></View>
            <TouchableOpacity style={styles.reviewConfirm} onPress={handleConfirmRide} disabled={bookingInProgress}>
              {bookingInProgress ? <ActivityIndicator color="#fff" /> : <Text style={styles.reviewConfirmText}>Confirm {selectedFareObj.name}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        </Modal>
      )}

      {/* Confirmed Ride Driver Arrival Modal */}
      {confirmedBooking && (
        <View style={styles.driverModalOverlay}>
          <View style={styles.driverCard}>
            <View style={styles.driverCardHeader}>
              <View style={styles.otpPill}>
                <Text style={styles.otpLabel}>START OTP</Text>
                <Text style={styles.otpCode}>{confirmedBooking.otp}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setConfirmedBooking(null);
                  router.push('/(rider)/(tabs)/activities');
                }}
                style={styles.closeDriverCardBtn}
              >
                <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.otpHelp}>Demo booking · Temporary ride OTP for starting this ride.</Text>

            <View style={styles.driverProfileRow}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={28} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.driverName}>{confirmedBooking.driver?.name}</Text>
                <Text style={styles.driverRating}>
                  ⭐ {confirmedBooking.driver?.rating} ({confirmedBooking.driver?.trips} trips)
                </Text>
                <Text style={styles.vehicleNumber}>{confirmedBooking.driver?.vehicleNumber}</Text>
              </View>
              <View style={styles.driverEtaBox}>
                <Text style={styles.driverEtaTime}>3 min</Text>
                <Text style={styles.driverEtaSub}>Arriving in</Text>
              </View>
            </View>

            <View style={styles.driverTripSummary}>
              <Text style={styles.tripSummaryRow} numberOfLines={1}>
                📍 <Text style={{ fontWeight: '700' }}>To:</Text> {confirmedBooking.destination}
              </Text>
              <Text style={styles.tripSummaryFare}>
                Fare: ₹{confirmedBooking.fare} ({confirmedBooking.paymentType})
              </Text>
            </View>

            <View style={styles.driverActionButtons}>
              <TouchableOpacity
                style={styles.trackRideBtn}
                onPress={() => {
                  setConfirmedBooking(null);
                  router.push('/(rider)/(tabs)/activities');
                }}
              >
                <Ionicons name="receipt-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.trackRideText}>View In Activities</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Toast feedback */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  recentTrips: { position: 'absolute', left: 16, right: 16, zIndex: 25, backgroundColor: '#fff', borderRadius: 18, padding: 14, ...THEME.shadows.floating },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  recentTitle: { color: '#173a2c', fontSize: 15, fontWeight: '800' },
  recentSeeAll: { color: '#0f7a56', fontSize: 12, fontWeight: '700', padding: 4 },
  recentTripRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  recentTripText: { flex: 1 },
  recentDestination: { color: '#173a2c', fontSize: 14, fontWeight: '700' },
  recentDetails: { color: '#71837c', fontSize: 12, marginTop: 2 },
  reviewScreen: { flex: 1, backgroundColor: '#f5f8f7' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff' },
  reviewBack: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f6f4' },
  reviewTitle: { fontSize: 19, fontWeight: '800', color: '#102b25' },
  reviewSubtitle: { fontSize: 12, color: '#71837c', marginTop: 3 },
  reviewContent: { padding: 20, paddingBottom: 28 },
  reviewVehicle: { backgroundColor: '#e4f5ec', borderWidth: 1, borderColor: '#c5ead6', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewVehicleIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  reviewVehicleName: { fontSize: 17, fontWeight: '800', color: '#123d2f', marginBottom: 4 },
  reviewPrice: { fontSize: 21, fontWeight: '800', color: '#0f7a56' },
  reviewMuted: { color: '#71837c', fontSize: 12, lineHeight: 18 },
  reviewSectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a302b', marginTop: 24, marginBottom: 10 },
  reviewCard: { borderRadius: 18, paddingHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9efeb' },
  reviewRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  reviewPoint: { width: 11, height: 11, borderRadius: 5.5 },
  reviewRouteDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e6ece9', marginLeft: 25 },
  reviewLabel: { color: '#8b9b95', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 4 },
  reviewAddress: { color: '#1c302b', fontSize: 14, fontWeight: '700' },
  paymentRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e6ece9' },
  paymentName: { color: '#1c302b', fontSize: 14, fontWeight: '700' },
  demoNotice: { flexDirection: 'row', gap: 8, backgroundColor: '#eaf8f0', borderRadius: 12, padding: 12, marginTop: 20, alignItems: 'flex-start' },
  demoNoticeText: { flex: 1, color: '#356b52', fontSize: 12, lineHeight: 18 },
  reviewError: { color: '#b91c1c', fontSize: 13, marginTop: 12 },
  reviewFooter: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderColor: '#e7eee9' },
  reviewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewTotalLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  reviewTotal: { fontSize: 20, color: '#142f27', fontWeight: '800' },
  reviewConfirm: { backgroundColor: '#0f7a56', minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  reviewConfirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  container: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  driverModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  driverCard: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  otpCode: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.primaryDark,
    letterSpacing: 2,
  },
  closeDriverCardBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  driverRating: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  vehicleNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  driverEtaBox: {
    alignItems: 'flex-end',
  },
  driverEtaTime: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  driverEtaSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  driverTripSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  tripSummaryRow: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  tripSummaryFare: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  driverActionButtons: {
    marginTop: 16,
  },
  trackRideBtn: {
    backgroundColor: THEME.colors.primary,
    height: 48,
    borderRadius: THEME.radius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trackRideText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -60,
    marginTop: -44,
    width: 120,
    alignItems: 'center',
    zIndex: 15,
  },
  centerTooltip: {
    position: 'absolute',
    bottom: 52,
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
  dualSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  dualSearchTimeline: {
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 8,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  timelineLine: {
    width: 2,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  dropSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  dualSearchInputsCol: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: THEME.colors.textPrimary,
    paddingVertical: 0,
  },
  searchInputActive: {
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  clearBtn: {
    padding: 4,
  },
  searchActionsCol: {
    alignItems: 'center',
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
  },
  swapBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
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
  searchEmpty: {
    padding: 16,
    color: THEME.colors.mutedText,
    fontSize: 13,
  },
  searchAttribution: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 10,
    color: THEME.colors.mutedText,
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
  fareScroll: {
    flex: 1,
  },
  bookFooter: { flexShrink: 0, paddingTop: 8 },
  saveLocations: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  saveLocationsLabel: { fontSize: 11, color: '#64748b' },
  saveLocationLink: { fontSize: 12, color: '#0f7a56', fontWeight: '700' },
  otpHelp: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    marginVertical: 12,
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
