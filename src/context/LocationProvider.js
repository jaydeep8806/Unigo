import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { DEFAULT_CITY, CITIES } from '../constants/config';

const STORAGE_KEY_MANUAL_CITY = '@unigo_manual_city';
const STORAGE_KEY_MANUAL_MODE = '@unigo_manual_location_mode';
const LocationContext = createContext(null);
const PICKUP_ACCURACY_METERS = 50;

// Wait for a usable GPS fix rather than discarding the first coarse reading.
function getAccuratePosition() {
  return new Promise((resolve, reject) => {
    let subscription;
    let finished = false;
    let inaccurate = false;
    let failures = 0;
    let bestAccuracy = null;
    let bestPosition = null;
    const errors = [];
    const finish = (error, position) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      subscription?.remove();
      if (error) reject(error); else resolve(position);
    };
    const failure = (reason) => {
      const error = new Error(reason);
      error.diagnostic = { reason, bestAccuracy, errors };
      return error;
    };
    const timer = setTimeout(() => bestPosition ? finish(null, bestPosition) : finish(failure(inaccurate ? 'inaccurate' : 'timeout')), 20000);
    const accept = (position) => {
      if (typeof position.coords.accuracy === 'number') {
        bestAccuracy = Math.min(bestAccuracy ?? Infinity, position.coords.accuracy);
      }
      if (position.coords.accuracy == null || position.coords.accuracy > PICKUP_ACCURACY_METERS) {
        inaccurate = true;
        if (!bestPosition || (position.coords.accuracy ?? Infinity) < (bestPosition.coords.accuracy ?? Infinity)) bestPosition = position;
        return;
      }
      finish(null, position);
    };
    const failed = (source, error) => {
      failures += 1;
      errors.push(`${source}:${error?.code || 'error'}`);
      if (failures === 2) {
        if (bestPosition) finish(null, bestPosition);
        else finish(failure('unavailable'));
      }
    };
    let watchFailed = false;
    const failWatch = (error) => {
      if (!watchFailed) { watchFailed = true; failed('watch', error); }
    };
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }).then(accept).catch((error) => failed('position', error));
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      accept,
      failWatch,
    ).then((watch) => {
      subscription = watch;
      if (finished) watch.remove();
    }).catch(failWatch);
  });
}

export function LocationProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [servicesEnabled, setServicesEnabled] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [approximateCoordinates, setApproximateCoordinates] = useState(null);
  const [locationIssue, setLocationIssue] = useState('');
  const [locationDiagnostic, setLocationDiagnostic] = useState('');
  const [detectedCity, setDetectedCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [hasMadeDecision, setHasMadeDecision] = useState(false);
  const checkingRef = useRef(false);
  const locationRequestRef = useRef(0);
  const refinementRef = useRef(null);

  const loadPosition = useCallback(async (permission) => {
    refinementRef.current?.();
    const requestId = ++locationRequestRef.current;
    try {
      setLocationIssue('');
      setLocationDiagnostic('');
      const position = await getAccuratePosition();
      if (requestId !== locationRequestRef.current) return false;
      const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      if (position.coords.accuracy == null || position.coords.accuracy > PICKUP_ACCURACY_METERS) {
        setCoordinates(null);
        setApproximateCoordinates({ ...current, accuracy: position.coords.accuracy });
        const accuracyText = position.coords.accuracy == null ? '' : ` (about ${Math.round(position.coords.accuracy)} m)`;
        setLocationIssue(`Your location is approximate${accuracyText}. Looking for a more accurate location; you can also choose your pickup on the map.`);
        let watch;
        let stopped = false;
        let bestAccuracy = position.coords.accuracy ?? Infinity;
        const stop = () => {
          if (stopped) return;
          stopped = true;
          clearTimeout(timer);
          watch?.remove();
          if (refinementRef.current === stop) refinementRef.current = null;
        };
        const timer = setTimeout(() => {
          if (requestId === locationRequestRef.current) setLocationIssue('Your location is still approximate. Choose your exact pickup on the map.');
          stop();
        }, 60000);
        refinementRef.current = stop;
        Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 }, (next) => {
          if (stopped || requestId !== locationRequestRef.current) return;
          const accuracy = next.coords.accuracy;
          if (accuracy == null || accuracy >= bestAccuracy) return;
          bestAccuracy = accuracy;
          const nextPoint = { latitude: next.coords.latitude, longitude: next.coords.longitude };
          if (accuracy <= PICKUP_ACCURACY_METERS) {
            setCoordinates(nextPoint);
            setApproximateCoordinates(null);
            setLocationIssue('');
            stop();
          } else {
            setApproximateCoordinates({ ...nextPoint, accuracy });
            setLocationIssue(`Your location is approximate (about ${Math.round(accuracy)} m). Looking for a more accurate location; you can also choose your pickup on the map.`);
          }
        }, () => {
          if (requestId === locationRequestRef.current) setLocationIssue('Your location is still approximate. Choose your exact pickup on the map.');
          stop();
        }).then((subscription) => {
          watch = subscription;
          if (stopped) subscription.remove();
        }).catch(() => {
          if (requestId === locationRequestRef.current) setLocationIssue('Your location is still approximate. Choose your exact pickup on the map.');
          stop();
        });
      } else {
        setApproximateCoordinates(null);
        setCoordinates(current);
      }
      Location.reverseGeocodeAsync(current).then(async ([place]) => {
        const name = place?.city || place?.subregion || place?.district;
        if (name && requestId === locationRequestRef.current) {
          const city = CITIES.find((item) => item.name.toLowerCase() === name.toLowerCase()) ||
            { name, lat: current.latitude, lng: current.longitude, state: place.region || '' };
          setDetectedCity(city);
          const manualCity = await AsyncStorage.getItem(STORAGE_KEY_MANUAL_CITY);
          if (!manualCity && requestId === locationRequestRef.current) setSelectedCity(city);
        }
      }).catch(() => { /* Coordinates are still usable if reverse geocoding is unavailable. */ });
      return true;
    } catch (error) {
      if (requestId === locationRequestRef.current) {
        setCoordinates(null);
        setApproximateCoordinates(null);
        const detail = error.diagnostic || { reason: 'unavailable', errors: [] };
        const accuracy = permission?.android?.accuracy || permission?.ios?.accuracy || 'unknown';
        const reading = detail.bestAccuracy == null ? 'no GPS reading' : `best accuracy ${Math.round(detail.bestAccuracy)} m`;
        setLocationDiagnostic(`Permission: ${accuracy}; result: ${detail.reason}; ${reading}.`);
        if (__DEV__) console.warn('[Location diagnostic]', { permission: accuracy, ...detail });
        setLocationIssue(permission?.android?.accuracy === 'coarse' || permission?.ios?.accuracy === 'reduced'
          ? 'Precise location is off. Enable it for Expo Go in your phone settings, then try again.'
          : error.message === 'inaccurate'
            ? 'The GPS reading is not precise enough. Try again outdoors or select your pickup on the map.'
            : 'The phone could not provide a GPS location. Check location services, try outdoors, or select your pickup on the map.');
      }
      return false;
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    try {
      const [permission, enabled, manualMode] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync(),
        AsyncStorage.getItem(STORAGE_KEY_MANUAL_MODE),
      ]);
      // A settings refresh started earlier must not interrupt a user-initiated fix.
      if (checkingRef.current) return { granted: false, checking: true };
      const ready = (permission.status === 'granted' && enabled) || manualMode === 'true';
      setPermissionStatus(permission.status);
      setCanAskAgain(permission.canAskAgain !== false);
      setServicesEnabled(enabled);
      setHasMadeDecision(ready);
      if (!ready || manualMode === 'true') { locationRequestRef.current += 1; refinementRef.current?.(); setCoordinates(null); setApproximateCoordinates(null); }
      if (permission.status === 'granted' && enabled && manualMode !== 'true' && !checkingRef.current) loadPosition(permission);
      return { granted: ready, permission: permission.status, servicesEnabled: enabled, canAskAgain: permission.canAskAgain };
    } catch {
      setHasMadeDecision(false);
      return { granted: false, error: true };
    }
  }, [loadPosition]);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        const city = await AsyncStorage.getItem(STORAGE_KEY_MANUAL_CITY);
        if (city && mounted) setSelectedCity(JSON.parse(city));
        await refreshLocation();
      } catch (error) {
        console.warn('Could not check location:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    initialize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !checkingRef.current) refreshLocation();
      else if (state !== 'active') refinementRef.current?.();
    });
    return () => { mounted = false; locationRequestRef.current += 1; refinementRef.current?.(); subscription.remove(); };
  }, [refreshLocation]);

  const requestLocation = useCallback(async () => {
    if (checkingRef.current) return { granted: false };
    checkingRef.current = true;
    refinementRef.current?.();
    locationRequestRef.current += 1;
    setCoordinates(null);
    setApproximateCoordinates(null);
    setSelectedCity(DEFAULT_CITY);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(permission.status);
      setCanAskAgain(permission.canAskAgain !== false);
      if (permission.status !== 'granted') {
        setHasMadeDecision(false);
        return { granted: false, permission: permission.status, canAskAgain: permission.canAskAgain };
      }
      let enabled = await Location.hasServicesEnabledAsync();
      if (!enabled && Platform.OS === 'android') {
        try { await Location.enableNetworkProviderAsync(); } catch { /* User can enable it in settings. */ }
        enabled = await Location.hasServicesEnabledAsync();
      }
      setServicesEnabled(enabled);
      if (enabled) {
        await AsyncStorage.removeItem(STORAGE_KEY_MANUAL_MODE);
        await AsyncStorage.removeItem(STORAGE_KEY_MANUAL_CITY);
        setSelectedCity(DEFAULT_CITY);
      }
      setHasMadeDecision(enabled);
      const located = enabled ? await loadPosition(permission) : false;
      return { granted: enabled, located, permission: permission.status, servicesEnabled: enabled };
    } catch (error) {
      setHasMadeDecision(false);
      return { granted: false, error };
    } finally {
      checkingRef.current = false;
    }
  }, [loadPosition]);

  const setCity = useCallback(async (city) => {
    if (!city) return;
    setSelectedCity(city);
    await AsyncStorage.setItem(STORAGE_KEY_MANUAL_CITY, JSON.stringify(city));
  }, []);

  const selectManualLocation = useCallback(async (place) => {
    const city = { name: place.title, state: place.subtitle || '', lat: place.latitude, lng: place.longitude, isManual: true };
    await AsyncStorage.setItem(STORAGE_KEY_MANUAL_CITY, JSON.stringify(city));
    await AsyncStorage.setItem(STORAGE_KEY_MANUAL_MODE, 'true');
    locationRequestRef.current += 1;
    refinementRef.current?.();
    setCoordinates(null);
    setApproximateCoordinates(null);
    setSelectedCity(city);
    setHasMadeDecision(true);
  }, []);

  const resetLocationDecision = useCallback(async () => {
    setHasMadeDecision(false);
    await AsyncStorage.removeItem(STORAGE_KEY_MANUAL_CITY);
    await AsyncStorage.removeItem(STORAGE_KEY_MANUAL_MODE);
    await refreshLocation();
  }, [refreshLocation]);

  return <LocationContext.Provider value={{ isLoading, permissionStatus, canAskAgain, servicesEnabled, coordinates, approximateCoordinates, locationIssue, locationDiagnostic, detectedCity, selectedCity, hasMadeDecision, requestLocation, refreshLocation, setCity, selectManualLocation, resetLocationDecision }}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within a LocationProvider');
  return context;
}
