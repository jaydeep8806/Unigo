import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    let mounted = true;
    async function loadRides() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_RIDES);
        if (stored && mounted) {
          setRides(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load rides from AsyncStorage:', e);
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

    const updated = [newRide, ...rides];
    setRides(updated);
    await persist(updated);
    return newRide;
  }, [rides, persist]);

  const cancelRide = useCallback(async (rideId) => {
    const updated = rides.map((r) =>
      r.id === rideId ? { ...r, status: 'cancelled' } : r
    );
    setRides(updated);
    await persist(updated);
  }, [rides, persist]);

  const clearRides = useCallback(async () => {
    setRides([]);
    await AsyncStorage.removeItem(STORAGE_KEY_RIDES);
  }, []);

  return (
    <ActivityContext.Provider value={{ rides, addRide, cancelRide, clearRides }}>
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
