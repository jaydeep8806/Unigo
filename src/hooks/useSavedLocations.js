import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@unigo_places';
export function useSavedLocations() {
  const [places, setPlaces] = useState({ saved: {}, recent: [] });
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then((value) => { if (active && value) setPlaces(JSON.parse(value)); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const persist = useCallback((next) => {
    setPlaces(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((error) => console.warn('Could not save places:', error));
  }, []);
  const addRecent = useCallback((place) => {
    const recent = [place, ...places.recent.filter((item) => item.id !== place.id)].slice(0, 6);
    persist({ ...places, recent });
  }, [places, persist]);
  const savePlace = useCallback((label, place) => persist({ ...places, saved: { ...places.saved, [label]: place } }), [places, persist]);
  return { places, addRecent, savePlace };
}
