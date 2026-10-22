import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  ScrollView,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchDrivingRoute } from './src/services/osrm';
import { searchLocations, reverseGeocode } from './src/services/geocoding';

const { width } = Dimensions.get('window');

// Default fallback coordinate (Rajkot, Gujarat center)
const DEFAULT_FALLBACK = {
  latitude: 22.3039,
  longitude: 70.8022,
};

// Available vehicle ride tiers
const VEHICLE_TYPES = [
  {
    id: 'bike',
    name: 'UniGo Moto',
    icon: '🏍️',
    capacity: '1 Seat',
    baseFare: 20,
    perKm: 8,
    speedMultiplier: 0.85,
    driverName: 'Rahul Sharma',
    driverPhone: '+91 98765 43210',
    vehiclePlate: 'GJ 03 BK 4821',
    vehicleModel: 'Hero Splendor Plus',
  },
  {
    id: 'auto',
    name: 'UniGo Auto',
    icon: '🛺',
    capacity: '3 Seats',
    baseFare: 30,
    perKm: 12,
    speedMultiplier: 1.0,
    driverName: 'Sunil Vala',
    driverPhone: '+91 98251 12345',
    vehiclePlate: 'GJ 03 AT 9104',
    vehicleModel: 'Bajaj Compact Auto',
  },
  {
    id: 'car',
    name: 'UniGo Prime',
    icon: '🚗',
    capacity: '4 Seats',
    baseFare: 50,
    perKm: 18,
    speedMultiplier: 1.1,
    driverName: 'Amit Patel',
    driverPhone: '+91 99130 98765',
    vehiclePlate: 'GJ 03 CP 7312',
    vehicleModel: 'Maruti Suzuki Dzire (AC)',
  },
];

export default function App() {
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const driverSimulationTimerRef = useRef(null);

  // User Pickup & Location
  const [origin, setOrigin] = useState(null);
  const [originAddress, setOriginAddress] = useState({ title: 'My Location', subtitle: '' });

  // Selected / Pending Destination
  const [pendingDestination, setPendingDestination] = useState(null);
  const [confirmedDestination, setConfirmedDestination] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState({ title: '', subtitle: '' });

  // Route Data
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  const [routeDurationMins, setRouteDurationMins] = useState(0);

  // App Flow State:
  // 'IDLE'             -> Fresh start: Only basic map + user location pin + top search bar
  // 'SEARCH'           -> Fullscreen search overlay with autocomplete
  // 'LOCATION_PREVIEW' -> Destination pinned, asking "Confirm Destination"
  // 'ROUTE_READY'      -> Route calculated, vehicle choices & booking card
  // 'RIDE_ACTIVE'      -> Live ride tracking with driver marker & OTP
  const [appState, setAppState] = useState('IDLE');

  const [selectedVehicle, setSelectedVehicle] = useState('bike');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Search Input State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Live Driver Simulation State
  const [driverLocation, setDriverLocation] = useState(null);
  const [rideStatusText, setRideStatusText] = useState('Driver is arriving in 3 mins');
  const [otpCode] = useState(String(Math.floor(1000 + Math.random() * 9000)));

  // On App Launch: Get GPS location, center map, do NOT calculate any route unprompted
  useEffect(() => {
    initializeLocation();
    return () => {
      if (driverSimulationTimerRef.current) {
        clearInterval(driverSimulationTimerRef.current);
      }
    };
  }, []);

  const initializeLocation = async () => {
    setLoadingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      let currentCoords = DEFAULT_FALLBACK;

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Using Rajkot center as default. You can search or tap on the map to set destinations.'
        );
      } else {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          currentCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        } catch (gpsError) {
          console.warn('GPS location fallback:', gpsError);
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc) {
            currentCoords = {
              latitude: lastLoc.coords.latitude,
              longitude: lastLoc.coords.longitude,
            };
          }
        }
      }

      setOrigin(currentCoords);

      // Reverse geocode user's location
      reverseGeocode(currentCoords.latitude, currentCoords.longitude).then((addr) => {
        setOriginAddress(addr);
      });

      // Smoothly animate map to user's location (Basic Map View)
      if (mapRef.current) {
        try {
          mapRef.current.animateToRegion(
            {
              ...currentCoords,
              latitudeDelta: 0.035,
              longitudeDelta: 0.035,
            },
            700
          );
        } catch (e) {
          console.warn('Initial map camera notice:', e);
        }
      }
    } catch (err) {
      console.warn('Init error:', err);
    } finally {
      setLoadingLocation(false);
    }
  };

  /**
   * Recenter map to user's current GPS position
   */
  const recenterToUser = () => {
    if (!origin || !mapRef.current) return;
    try {
      mapRef.current.animateToRegion(
        {
          ...origin,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        },
        500
      );
    } catch (e) {
      console.warn('recenterToUser notice:', e);
    }
  };

  /**
   * When user selects a place from search OR taps on the map:
   * Stage 1: Preview the location and ask for confirmation
   */
  const handleSelectLocationForPreview = (coord, title = '', subtitle = '') => {
    setPendingDestination(coord);

    if (title) {
      setDestinationAddress({ title, subtitle });
    } else {
      // Reverse geocode if tapped on map
      setDestinationAddress({ title: 'Locating address...', subtitle: '' });
      reverseGeocode(coord.latitude, coord.longitude).then((addr) => {
        setDestinationAddress(addr);
      });
    }

    // Animate map camera to focus on selected destination
    if (mapRef.current) {
      try {
        mapRef.current.animateToRegion(
          {
            ...coord,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          550
        );
      } catch (e) {
        console.warn('Preview camera error:', e);
      }
    }

    // Switch to LOCATION_PREVIEW state (shows "Confirm Location" button)
    setAppState('LOCATION_PREVIEW');
  };

  /**
   * Stage 2: User explicitly taps "Confirm Destination"
   * ONLY now do we calculate the driving route and show vehicle booking options!
   */
  const handleConfirmDestination = async () => {
    if (!origin || !pendingDestination) return;

    setConfirmedDestination(pendingDestination);
    setLoadingRoute(true);

    try {
      const result = await fetchDrivingRoute(origin, pendingDestination);
      setRouteCoords(result.coordinates);

      const distanceKm = result.distanceMeters / 1000;
      const durationMins = Math.max(1, Math.round(result.durationSeconds / 60));

      setRouteDistanceKm(distanceKm);
      setRouteDurationMins(durationMins);

      setAppState('ROUTE_READY');

      // Fit route between pickup and destination
      setTimeout(() => {
        fitRouteOnMap(origin, pendingDestination, result.coordinates);
      }, 300);
    } catch (error) {
      console.warn('OSRM routing notice:', error);
      Alert.alert('Route Notice', error.message || 'Could not calculate driving route.');
    } finally {
      setLoadingRoute(false);
    }
  };

  /**
   * Cancel selection and return to basic map view
   */
  const handleResetToBasicMap = () => {
    setAppState('IDLE');
    setPendingDestination(null);
    setConfirmedDestination(null);
    setRouteCoords([]);
    setSearchQuery('');
    setSearchResults([]);
    recenterToUser();
  };

  /**
   * Fit map viewport so route is visible
   */
  const fitRouteOnMap = useCallback((start, end, coords) => {
    if (!mapRef.current) return;

    const pointsToFit = [
      start,
      end,
      ...(coords && coords.length > 0 ? coords : []),
    ].filter(Boolean);

    if (pointsToFit.length === 0) return;

    try {
      mapRef.current.fitToCoordinates(pointsToFit, {
        edgePadding: {
          top: Platform.OS === 'android' ? 90 : 110,
          right: 45,
          bottom: 230,
          left: 45,
        },
        animated: true,
      });
    } catch (e) {
      console.warn('fitToCoordinates notice:', e);
    }
  }, []);

  /**
   * Handle user tapping on map
   */
  const handleMapPress = (e) => {
    // If in search overlay, tapping map does nothing
    if (appState === 'SEARCH') {
      setAppState('IDLE');
      Keyboard.dismiss();
      return;
    }

    // If ride is active, ignore map tapping
    if (appState === 'RIDE_ACTIVE') return;

    const tappedCoord = e.nativeEvent.coordinate;
    if (!tappedCoord) return;

    // Put map into location preview mode for confirmation
    handleSelectLocationForPreview(tappedCoord);
  };

  /**
   * Handle search query typing with debounced autocomplete
   */
  const handleSearchTextChange = (text) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchLocations(text, origin);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
  };

  /**
   * User clicks a search result: Open Location Preview to ask for confirmation
   */
  const handleSelectSearchResult = (item) => {
    Keyboard.dismiss();
    setSearchQuery(item.title);

    const coord = {
      latitude: item.latitude,
      longitude: item.longitude,
    };

    handleSelectLocationForPreview(coord, item.title, item.subtitle);
  };

  // Pricing & ETA calculation
  const calculateFare = (vehicle) => {
    const rawFare = vehicle.baseFare + routeDistanceKm * vehicle.perKm;
    return Math.max(vehicle.baseFare, Math.round(rawFare));
  };

  const calculateETA = (vehicle) => {
    return Math.max(2, Math.round(routeDurationMins * vehicle.speedMultiplier));
  };

  const activeVehicleData =
    VEHICLE_TYPES.find((v) => v.id === selectedVehicle) || VEHICLE_TYPES[0];
  const activeFare = calculateFare(activeVehicleData);
  const activeETA = calculateETA(activeVehicleData);

  /**
   * User clicks "Book UniGo" -> Transition to Live Ride Tracking Mode
   */
  const handleBookRide = () => {
    setAppState('RIDE_ACTIVE');
    setRideStatusText('Driver is arriving in 3 mins');

    // Place simulated driver roughly 800m away on the route or near pickup
    let initialDriverPos = origin;
    if (routeCoords.length > 6) {
      const midIdx = Math.min(10, Math.floor(routeCoords.length / 2));
      initialDriverPos = routeCoords[midIdx];
    } else if (origin) {
      initialDriverPos = {
        latitude: origin.latitude + 0.005,
        longitude: origin.longitude + 0.004,
      };
    }

    setDriverLocation(initialDriverPos);

    // Zoom map to show both Driver and Pickup
    setTimeout(() => {
      if (mapRef.current && origin && initialDriverPos) {
        try {
          mapRef.current.fitToCoordinates([origin, initialDriverPos], {
            edgePadding: { top: 110, right: 60, bottom: 220, left: 60 },
            animated: true,
          });
        } catch (e) {
          console.warn('Active ride camera fit notice:', e);
        }
      }
    }, 350);

    // Simulate driver moving towards user's pickup point step-by-step
    let currentStep = 0;
    if (driverSimulationTimerRef.current) clearInterval(driverSimulationTimerRef.current);

    driverSimulationTimerRef.current = setInterval(() => {
      currentStep += 1;

      if (currentStep === 1) {
        setRideStatusText('Driver is 2 mins away (500m)');
      } else if (currentStep === 2) {
        setRideStatusText('Driver is 1 min away (200m)');
      } else if (currentStep >= 3) {
        setRideStatusText('Driver has arrived at pickup point!');
        if (origin) setDriverLocation(origin);
        clearInterval(driverSimulationTimerRef.current);
      }
    }, 3500);
  };

  /**
   * Cancel active ride
   */
  const handleCancelRide = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => {
          if (driverSimulationTimerRef.current) {
            clearInterval(driverSimulationTimerRef.current);
          }
          handleResetToBasicMap();
        },
      },
    ]);
  };

  /**
   * Quick call driver action
   */
  const handleCallDriver = () => {
    Alert.alert(
      `Call ${activeVehicleData.driverName}`,
      `Dialing driver at ${activeVehicleData.driverPhone}...`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* ─────────────────────────────────────────────────────────────
          1. FULL-SCREEN BASIC MAP (Visible in all modes)
      ───────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: DEFAULT_FALLBACK.latitude,
          longitude: DEFAULT_FALLBACK.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={() => setIsMapReady(true)}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* Origin Marker (Green Pin - Always visible once location is fetched) */}
        {origin && (
          <Marker
            coordinate={origin}
            title={originAddress.title || 'My Location'}
            description="Your current location"
            pinColor="green"
          />
        )}

        {/* Pending / Preview Destination Marker (Orange Pin) */}
        {appState === 'LOCATION_PREVIEW' && pendingDestination && (
          <Marker
            coordinate={pendingDestination}
            title={destinationAddress.title || 'Selected Location'}
            description="Tap 'Confirm Destination' below"
            pinColor="red"
          />
        )}

        {/* Confirmed Destination Marker (Red Pin - when route is calculated) */}
        {(appState === 'ROUTE_READY' || appState === 'RIDE_ACTIVE') && confirmedDestination && (
          <Marker
            coordinate={confirmedDestination}
            title={destinationAddress.title || 'Destination'}
            description="Drop-off point"
            pinColor="red"
          />
        )}

        {/* Route Polyline (Rendered ONLY after destination is confirmed) */}
        {(appState === 'ROUTE_READY' || appState === 'RIDE_ACTIVE') && routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2563EB"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Live Driver Marker (When ride is active) */}
        {appState === 'RIDE_ACTIVE' && driverLocation && (
          <Marker
            coordinate={driverLocation}
            title={`${activeVehicleData.name} - ${activeVehicleData.driverName}`}
            description="Driver on the way"
            pinColor="blue"
          >
            <View style={styles.driverMarkerBubble}>
              <Text style={styles.driverMarkerIcon}>{activeVehicleData.icon}</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ─────────────────────────────────────────────────────────────
          2. FLOATING SEARCH BAR (Visible in IDLE & ROUTE_READY)
      ───────────────────────────────────────────────────────────── */}
      {(appState === 'IDLE' || appState === 'ROUTE_READY') && (
        <View style={styles.floatingTopBar}>
          <TouchableOpacity
            style={styles.searchBarButton}
            onPress={() => setAppState('SEARCH')}
            activeOpacity={0.88}
          >
            <Text style={styles.searchBarIcon}>🔍</Text>
            <View style={styles.searchBarTextContainer}>
              <Text style={styles.searchBarPlaceholder} numberOfLines={1}>
                {confirmedDestination && destinationAddress.title
                  ? destinationAddress.title
                  : 'Where to? (e.g. Bus Station, Airport)'}
              </Text>
            </View>
            <View style={styles.searchBadge}>
              <Text style={styles.searchBadgeText}>Search</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. FULLSCREEN SEARCH OVERLAY (Opens when user taps search)
      ───────────────────────────────────────────────────────────── */}
      {appState === 'SEARCH' && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchHeader}>
            <TouchableOpacity
              onPress={() => {
                setAppState('IDLE');
                Keyboard.dismiss();
              }}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>

            <View style={styles.searchInputWrapper}>
              <Text style={styles.innerSearchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInputActive}
                placeholder="Search destination place or street..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={handleSearchTextChange}
                autoFocus={true}
                returnKeyType="search"
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />
              )}
              {searchQuery.length > 0 && !isSearching && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  style={styles.clearSearchBtn}
                >
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Suggestions / Popular Nearby Rajkot Picks */}
          {searchResults.length === 0 && !isSearching && (
            <View style={styles.quickPillsSection}>
              <Text style={styles.quickPillsTitle}>POPULAR NEARBY IN RAJKOT</Text>
              <View style={styles.quickPillsRow}>
                {['Rajkot Bus Station', 'Rajkot Railway Station', 'Crystal Mall', 'Rajkot Airport', 'Race Course'].map(
                  (place) => (
                    <TouchableOpacity
                      key={place}
                      style={styles.quickPill}
                      onPress={() => handleSearchTextChange(place)}
                    >
                      <Text style={styles.quickPillText}>📍 {place}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          )}

          {/* Autocomplete Results List */}
          <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.searchResultItem}
                onPress={() => handleSelectSearchResult(item)}
                activeOpacity={0.7}
              >
                <View style={styles.pinCircle}>
                  <Text style={styles.pinCircleText}>📍</Text>
                </View>
                <View style={styles.resultTextCol}>
                  <Text style={styles.resultMainTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.resultSubTitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.selectArrow}>→</Text>
              </TouchableOpacity>
            ))}

            {isSearching && (
              <View style={styles.searchStatusBox}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.searchStatusText}>Searching OpenStreetMap places...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FLOATING MAP CONTROLS (Recenter & Fit)
      ───────────────────────────────────────────────────────────── */}
      {appState !== 'SEARCH' && (
        <View
          style={[
            styles.floatingControls,
            appState === 'IDLE' && { bottom: 30 },
            appState === 'LOCATION_PREVIEW' && { bottom: 180 },
            appState === 'ROUTE_READY' && { bottom: 230 },
            appState === 'RIDE_ACTIVE' && { bottom: 210 },
          ]}
        >
          <TouchableOpacity style={styles.controlCircle} onPress={recenterToUser} activeOpacity={0.8}>
            <Text style={styles.controlEmoji}>🎯</Text>
          </TouchableOpacity>

          {(appState === 'ROUTE_READY' || appState === 'RIDE_ACTIVE') && origin && confirmedDestination && (
            <TouchableOpacity
              style={styles.controlCircle}
              onPress={() => fitRouteOnMap(origin, confirmedDestination, routeCoords)}
              activeOpacity={0.8}
            >
              <Text style={styles.controlEmoji}>🗺️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. LOCATION CONFIRMATION CARD (Step 2: User must confirm!)
      ───────────────────────────────────────────────────────────── */}
      {appState === 'LOCATION_PREVIEW' && (
        <View style={styles.previewConfirmationCard}>
          <View style={styles.previewCardHeader}>
            <View style={styles.previewPinBadge}>
              <Text style={styles.previewPinEmoji}>📍</Text>
            </View>
            <View style={styles.previewTextCol}>
              <Text style={styles.previewLabel}>CONFIRM DESTINATION</Text>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {destinationAddress.title || 'Selected Location'}
              </Text>
              {destinationAddress.subtitle ? (
                <Text style={styles.previewSubtitle} numberOfLines={1}>
                  {destinationAddress.subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Action Buttons: Cancel vs Confirm Destination */}
          <View style={styles.previewActionRow}>
            <TouchableOpacity
              style={styles.previewCancelBtn}
              onPress={handleResetToBasicMap}
              activeOpacity={0.7}
            >
              <Text style={styles.previewCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.previewConfirmBtn}
              onPress={handleConfirmDestination}
              disabled={loadingRoute}
              activeOpacity={0.85}
            >
              {loadingRoute ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.previewConfirmText}>✓ Confirm Destination</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. ROUTE READY & VEHICLE SELECTION CARD (After Confirmation)
      ───────────────────────────────────────────────────────────── */}
      {appState === 'ROUTE_READY' && (
        <View style={styles.compactBottomCard}>
          {/* Destination Header Row */}
          <View style={styles.destHeaderRow}>
            <View style={styles.destPinPill}>
              <Text style={styles.destPinEmoji}>📍</Text>
            </View>
            <View style={styles.destTextCol}>
              <Text style={styles.destTitleText} numberOfLines={1}>
                {destinationAddress.title || 'Drop-off Location'}
              </Text>
              <Text style={styles.destSubtitleText}>
                {loadingRoute
                  ? 'Calculating route...'
                  : `${routeDistanceKm.toFixed(1)} km • ${activeETA} mins away`}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={handleResetToBasicMap}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle Selection Row */}
          <View style={styles.vehicleRow}>
            {VEHICLE_TYPES.map((vehicle) => {
              const isSelected = selectedVehicle === vehicle.id;
              const fare = calculateFare(vehicle);
              const eta = calculateETA(vehicle);

              return (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[styles.vehicleOption, isSelected && styles.vehicleOptionActive]}
                  onPress={() => setSelectedVehicle(vehicle.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.vehicleOptionIcon}>{vehicle.icon}</Text>
                  <Text style={[styles.vehicleOptionName, isSelected && styles.vehicleOptionNameActive]}>
                    {vehicle.name.replace('UniGo ', '')}
                  </Text>
                  <Text style={styles.vehicleOptionEta}>{loadingRoute ? '--' : `${eta}m`}</Text>
                  <Text style={[styles.vehicleOptionFare, isSelected && styles.vehicleOptionFareActive]}>
                    ₹{loadingRoute ? '--' : fare}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Primary Book Button */}
          <TouchableOpacity
            style={[styles.primaryBookButton, loadingRoute && styles.primaryBookButtonDisabled]}
            onPress={handleBookRide}
            disabled={loadingRoute}
            activeOpacity={0.88}
          >
            {loadingRoute ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryBookButtonText}>
                Book {activeVehicleData.name} • ₹{activeFare}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. LIVE RIDE TRACKING CARD (When Ride is Active)
      ───────────────────────────────────────────────────────────── */}
      {appState === 'RIDE_ACTIVE' && (
        <View style={styles.activeRideCard}>
          {/* Status Header */}
          <View style={styles.activeStatusHeader}>
            <View style={styles.pulsingLiveDot} />
            <Text style={styles.activeStatusTitle}>{rideStatusText}</Text>
          </View>

          {/* Driver & Vehicle Details */}
          <View style={styles.activeDriverRow}>
            <View style={styles.activeDriverAvatar}>
              <Text style={styles.activeDriverEmoji}>{activeVehicleData.icon}</Text>
            </View>

            <View style={styles.activeDriverDetails}>
              <Text style={styles.activeDriverName}>{activeVehicleData.driverName}</Text>
              <Text style={styles.activeVehicleText}>
                {activeVehicleData.vehicleModel} • {activeVehicleData.vehiclePlate}
              </Text>
              <Text style={styles.activeRatingText}>⭐ 4.9 (850+ rides)</Text>
            </View>

            {/* Start OTP Box */}
            <View style={styles.otpBadgeContainer}>
              <Text style={styles.otpBadgeLabel}>START OTP</Text>
              <Text style={styles.otpBadgeValue}>{otpCode}</Text>
            </View>
          </View>

          {/* Action Buttons: Call, Cancel */}
          <View style={styles.activeActionsRow}>
            <TouchableOpacity style={styles.activeCallBtn} onPress={handleCallDriver} activeOpacity={0.8}>
              <Text style={styles.activeCallBtnText}>📞 Call Driver</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.activeCancelBtn} onPress={handleCancelRide} activeOpacity={0.7}>
              <Text style={styles.activeCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  // Floating Top Search Bar (IDLE & ROUTE_READY)
  floatingTopBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 54,
    left: 16,
    right: 16,
    zIndex: 30,
  },
  searchBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  searchBarIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchBarTextContainer: {
    flex: 1,
  },
  searchBarPlaceholder: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  searchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Fullscreen Search Overlay (Standard View with status bar padding)
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 99,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 44,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 8,
    marginRight: 6,
  },
  backBtnText: {
    fontSize: 22,
    color: '#0f172a',
    fontWeight: '700',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  innerSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInputActive: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  quickPillsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  quickPillsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickPillText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  searchResultsList: {
    flex: 1,
    marginTop: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pinCircleText: {
    fontSize: 16,
  },
  resultTextCol: {
    flex: 1,
  },
  resultMainTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  resultSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  selectArrow: {
    fontSize: 16,
    color: '#94a3b8',
    marginLeft: 8,
  },
  searchStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  searchStatusText: {
    fontSize: 13,
    color: '#64748b',
  },

  // Floating Map Controls (Recenter & Fit)
  floatingControls: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    zIndex: 25,
  },
  controlCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  controlEmoji: {
    fontSize: 18,
  },

  // Stage 2: Location Preview & Confirmation Card
  previewConfirmationCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 18 : 32,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 20,
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  previewPinBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewPinEmoji: {
    fontSize: 16,
  },
  previewTextCol: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  previewSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  previewActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewCancelBtn: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  previewConfirmBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  previewConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Driver Marker Bubble on Map
  driverMarkerBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  driverMarkerIcon: {
    fontSize: 22,
  },

  // Compact Bottom Ride Card (Route Ready Mode)
  compactBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 30,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 20,
  },
  destHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  destPinPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  destPinEmoji: {
    fontSize: 14,
  },
  destTextCol: {
    flex: 1,
  },
  destTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  destSubtitleText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 1,
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Vehicle Option Tabs
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  vehicleOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  vehicleOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  vehicleOptionIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  vehicleOptionName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  vehicleOptionNameActive: {
    color: '#0f172a',
  },
  vehicleOptionEta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  vehicleOptionFare: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  vehicleOptionFareActive: {
    color: '#1d4ed8',
  },

  // Primary Book Button
  primaryBookButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  primaryBookButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryBookButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Live Active Ride Tracking Card
  activeRideCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 18 : 32,
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 20,
  },
  activeStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  pulsingLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 8,
  },
  activeStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  activeDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeDriverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activeDriverEmoji: {
    fontSize: 22,
  },
  activeDriverDetails: {
    flex: 1,
  },
  activeDriverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  activeVehicleText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginTop: 1,
  },
  activeRatingText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  otpBadgeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  otpBadgeLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
  },
  otpBadgeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  activeCallBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCallBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  activeCancelBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCancelBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
});
