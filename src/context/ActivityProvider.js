import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_RIDES = '@unigo_user_rides';

const ActivityContext = createContext({
  rides: [],
  addRide: async () => {},
  cancelRide: async () => {},
  clearRides: async () => {},
});

export function ActivityProvider({ children }) {
  const [rides, setRides] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const ridesRef = useRef([]);

  useEffect(() => {
    let mounted = true;
    async function loadRides() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_RIDES);
        if (stored && mounted) {
          const saved = JSON.parse(stored);
          ridesRef.current = saved;
          setRides(saved);
        }
      } catch (e) {
        console.warn('Failed to load rides from AsyncStorage:', e);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }
    loadRides();
    return () => { mounted = false; };
  }, []);

  const persist = useCallback(async (newRides) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_RIDES, JSON.stringify(newRides));
    } catch (e) {
      console.warn('Failed to save rides to AsyncStorage:', e);
    }
  }, []);

  const addRide = useCallback(async (rideData) => {
    const newRide = {
      id: `ride_${Date.now()}`,
      status: 'confirmed', // 'confirmed', 'completed', 'cancelled'
      createdAt: new Date().toISOString(),
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      driver: {
        name: 'Ramesh Patel',
        rating: '4.8',
        trips: '1,420',
        vehicleNumber: 'GJ-03-AX-8924',
        vehicleModel: rideData.vehicleName || 'UniGo Ride',
      },
      ...rideData,
    };

    const updated = [newRide, ...ridesRef.current];
    ridesRef.current = updated;
    setRides(updated);
    await persist(updated);
    return newRide;
  }, [persist]);

  const updateRide = useCallback(async (rideId, changes) => {
    const updated = ridesRef.current.map((ride) => ride.id === rideId ? { ...ride, ...changes } : ride);
    ridesRef.current = updated;
    setRides(updated);
    await persist(updated);
  }, [persist]);

  const cancelRide = useCallback(async (rideId) => {
    const updated = ridesRef.current.map((r) =>
      r.id === rideId ? { ...r, status: 'cancelled' } : r
    );
    ridesRef.current = updated;
    setRides(updated);
    await persist(updated);
  }, [persist]);

  const clearRides = useCallback(async () => {
    ridesRef.current = [];
    setRides([]);
    await AsyncStorage.removeItem(STORAGE_KEY_RIDES);
  }, []);

  return (
    <ActivityContext.Provider value={{ rides, isLoaded, addRide, updateRide, cancelRide, clearRides }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}
