import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { asActivity, driverAction, simulationEnabled, watchRides } from '../services/drivers';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    if (!isLoaded) return undefined;
    let disposed = false; let stop = () => {}; let generation = 0;
    const attach = async (session) => {
      const current = ++generation;
      let pending = false;
      stop();
      if (disposed) return;
      if (!session) {
        const local = ridesRef.current.filter(r => !r.backend);
        ridesRef.current = local; setRides(local);
        return;
      }
      const refresh = async () => {
        if (pending || disposed || current !== generation) return;
        pending = true;
        try {
          const { data, error } = await supabase.from('driver_rides').select('*').eq('rider_id', session.user.id).order('created_at', { ascending: false }).limit(100);
          if (error) return;
          const rows = [];
          for (const row of data) rows.push(['searching','requested','assigned','arrived','in_progress'].includes(row.status) ? await driverAction('sync', { id: row.id }) : row);
          if (disposed || current !== generation) return;
          const merged = rows.map(row => {
            const old = ridesRef.current.find(r => r.id === row.id);
            const next = { ...old, ...asActivity(row) };
            if (row.status === 'completed' && ['payment_pending','paid','rated'].includes(old?.status)) next.status = old.status;
            return next;
          });
          const updated = [...merged, ...ridesRef.current.filter(r => !r.backend)];
          ridesRef.current = updated; setRides(updated); await persist(updated);
        } catch { /* Preserve cached history when disconnected; trip screen shows connection errors. */ }
        finally { pending = false; }
      };
      await refresh();
      if (!disposed && current === generation) stop = watchRides(`rider_id=eq.${session.user.id}`, refresh);
    };
    supabase.auth.getSession().then(({ data }) => attach(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => { if (!disposed) attach(session); }, 0); });
    return () => { disposed = true; stop(); listener.subscription.unsubscribe(); };
  }, [isLoaded, persist]);

  const addRide = useCallback(async (rideData) => {
    const newRide = asActivity(await driverAction('request', { ...rideData, simulated: simulationEnabled }));

    const updated = [newRide, ...ridesRef.current.filter(r => r.id !== newRide.id)];
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
    if (ridesRef.current.find(r => r.id === rideId)?.backend) await driverAction('cancel', { id: rideId });
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
