import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { DEFAULT_CITY, CITIES } from '../constants/config';

const STORAGE_KEY_MANUAL_CITY = '@unigo_manual_city';
const STORAGE_KEY_MANUAL_MODE = '@unigo_manual_location_mode';
const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [servicesEnabled, setServicesEnabled] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [detectedCity, setDetectedCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [hasMadeDecision, setHasMadeDecision] = useState(false);
  const checkingRef = useRef(false);

  const loadPosition = useCallback(async () => {
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoordinates(current);
      try {
        const [place] = await Location.reverseGeocodeAsync(current);
        const name = place?.city || place?.subregion || place?.district;
        if (name) {
          const city = CITIES.find((item) => item.name.toLowerCase() === name.toLowerCase()) ||
            { name, lat: current.latitude, lng: current.longitude, state: place.region || '' };
          setDetectedCity(city);
          if (!await AsyncStorage.getItem(STORAGE_KEY_MANUAL_CITY)) setSelectedCity(city);
        }
      } catch { /* Coordinates are still usable if reverse geocoding is unavailable. */ }
    } catch { /* Location services can take time to obtain a fix. */ }
  }, []);

  const refreshLocation = useCallback(async () => {
    try {
      const [permission, enabled, manualMode] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync(),
        AsyncStorage.getItem(STORAGE_KEY_MANUAL_MODE),
      ]);
      const ready = (permission.status === 'granted' && enabled) || manualMode === 'true';
      setPermissionStatus(permission.status);
      setCanAskAgain(permission.canAskAgain !== false);
      setServicesEnabled(enabled);
      setHasMadeDecision(ready);
      if (!ready) setCoordinates(null);
      if (permission.status === 'granted' && enabled && manualMode !== 'true') loadPosition();
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
    });
    return () => { mounted = false; subscription.remove(); };
  }, [refreshLocation]);

  const requestLocation = useCallback(async () => {
    if (checkingRef.current) return { granted: false };
    checkingRef.current = true;
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
      if (enabled) await AsyncStorage.removeItem(STORAGE_KEY_MANUAL_MODE);
      setHasMadeDecision(enabled);
      if (enabled) loadPosition();
      return { granted: enabled, permission: permission.status, servicesEnabled: enabled };
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
    setCoordinates(null);
    setSelectedCity(city);
    setHasMadeDecision(true);
  }, []);

  const resetLocationDecision = useCallback(async () => {
    setHasMadeDecision(false);
    await AsyncStorage.removeItem(STORAGE_KEY_MANUAL_CITY);
    await AsyncStorage.removeItem(STORAGE_KEY_MANUAL_MODE);
    await refreshLocation();
  }, [refreshLocation]);

  return <LocationContext.Provider value={{ isLoading, permissionStatus, canAskAgain, servicesEnabled, coordinates, detectedCity, selectedCity, hasMadeDecision, requestLocation, refreshLocation, setCity, selectManualLocation, resetLocationDecision }}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within a LocationProvider');
  return context;
}
