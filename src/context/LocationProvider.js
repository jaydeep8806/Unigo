import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { DEFAULT_CITY, CITIES } from '../constants/config';

const STORAGE_KEY_DECISION = '@unigo_location_decision';
const STORAGE_KEY_MANUAL_CITY = '@unigo_manual_city';

const LocationContext = createContext({
  isLoading: true,
  permissionStatus: 'undetermined', // 'undetermined' | 'granted' | 'denied'
  coordinates: null,
  detectedCity: null,
  selectedCity: DEFAULT_CITY,
  hasMadeDecision: false,
  requestLocation: async () => {},
  setCity: async () => {},
  resetLocationDecision: async () => {},
});

/**
 * Calculates Euclidean distance between two coordinates to find nearest supported city
 */
function findNearestCity(lat, lng) {
  if (!lat || !lng) return DEFAULT_CITY;

  let nearest = DEFAULT_CITY;
  let minDistanceSq = Infinity;

  for (const city of CITIES) {
    const dLat = city.lat - lat;
    const dLng = city.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      nearest = city;
    }
  }

  return nearest;
}

export function LocationProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [coordinates, setCoordinates] = useState(null);
  const [detectedCity, setDetectedCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [hasMadeDecision, setHasMadeDecision] = useState(false);

  /**
   * Reverse geocodes coordinates to a known city in the config list
   */
  const resolveCityFromCoords = useCallback(async (lat, lng) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const place = results[0];
        const cityName = place.city || place.subregion || place.district || place.name || '';

        // Match case-insensitively with supported cities
        const matched = CITIES.find(
          (c) => c.name.toLowerCase() === cityName.toLowerCase()
        );

        if (matched) {
          return matched;
        }
      }
    } catch (e) {
      console.warn('Reverse geocode city resolution warning:', e);
    }

    // Fall back to nearest geographic city
    return findNearestCity(lat, lng);
  }, []);

  /**
   * Initial load: restores AsyncStorage choices and checks native permission state
   */
  useEffect(() => {
    let isMounted = true;

    async function initializeLocation() {
      try {
        const [savedDecision, savedCityJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_DECISION),
          AsyncStorage.getItem(STORAGE_KEY_MANUAL_CITY),
        ]);

        let initialCity = DEFAULT_CITY;
        let isDecisionMade = savedDecision === 'true';

        if (savedCityJson) {
          try {
            initialCity = JSON.parse(savedCityJson);
          } catch (err) {
            console.warn('Failed parsing saved city:', err);
          }
        }

        // Check native permission status without prompting
        const permission = await Location.getForegroundPermissionsAsync();

        if (permission.status === 'granted') {
          // If already granted, mark decision as made
          isDecisionMade = true;
          if (isMounted) {
            setPermissionStatus('granted');
          }

          try {
            const loc = await Location.getLastKnownPositionAsync();
            const currentCoords = loc
              ? { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
              : null;

            if (currentCoords && isMounted) {
              setCoordinates(currentCoords);
              const resolved = await resolveCityFromCoords(
                currentCoords.latitude,
                currentCoords.longitude
              );
              setDetectedCity(resolved);

              // If user hasn't explicitly picked a manual city, use detected
              if (!savedCityJson) {
                initialCity = resolved;
              }
            }
          } catch (posErr) {
            console.warn('Location query warning on init:', posErr);
          }
        } else if (permission.status === 'denied') {
          if (isMounted) setPermissionStatus('denied');
        } else {
          if (isMounted) setPermissionStatus('undetermined');
        }

        if (isMounted) {
          setSelectedCity(initialCity);
          setHasMadeDecision(isDecisionMade);
        }
      } catch (e) {
        console.warn('LocationProvider init error:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeLocation();

    return () => {
      isMounted = false;
    };
  }, [resolveCityFromCoords]);

  /**
   * User explicitly requests location permission
   */
  const requestLocation = useCallback(async () => {
    try {
      const response = await Location.requestForegroundPermissionsAsync();

      if (response.status === 'granted') {
        setPermissionStatus('granted');
        setHasMadeDecision(true);
        await AsyncStorage.setItem(STORAGE_KEY_DECISION, 'true');

        let currentCoords = null;
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          currentCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        } catch {
          const fallbackLoc = await Location.getLastKnownPositionAsync();
          if (fallbackLoc) {
            currentCoords = {
              latitude: fallbackLoc.coords.latitude,
              longitude: fallbackLoc.coords.longitude,
            };
          }
        }

        if (currentCoords) {
          setCoordinates(currentCoords);
          const resolved = await resolveCityFromCoords(
            currentCoords.latitude,
            currentCoords.longitude
          );
          setDetectedCity(resolved);
          setSelectedCity(resolved);
          await AsyncStorage.setItem(STORAGE_KEY_MANUAL_CITY, JSON.stringify(resolved));
          return { granted: true, city: resolved, coordinates: currentCoords };
        }

        return { granted: true, city: selectedCity, coordinates: null };
      }

      setPermissionStatus('denied');
      return { granted: false };
    } catch (error) {
      console.warn('requestLocation error:', error);
      setPermissionStatus('denied');
      return { granted: false, error };
    }
  }, [resolveCityFromCoords, selectedCity]);

  /**
   * User manually chooses a city from the list
   */
  const setCity = useCallback(async (city) => {
    if (!city) return;
    setSelectedCity(city);
    setHasMadeDecision(true);

    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_DECISION, 'true'),
        AsyncStorage.setItem(STORAGE_KEY_MANUAL_CITY, JSON.stringify(city)),
      ]);
    } catch (err) {
      console.warn('setCity persistence error:', err);
    }
  }, []);

  /**
   * Resets decision (useful for testing or profile settings)
   */
  const resetLocationDecision = useCallback(async () => {
    setHasMadeDecision(false);
    setPermissionStatus('undetermined');
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEY_DECISION),
        AsyncStorage.removeItem(STORAGE_KEY_MANUAL_CITY),
      ]);
    } catch (err) {
      console.warn('resetLocationDecision error:', err);
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        isLoading,
        permissionStatus,
        coordinates,
        detectedCity,
        selectedCity,
        hasMadeDecision,
        requestLocation,
        setCity,
        resetLocationDecision,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
