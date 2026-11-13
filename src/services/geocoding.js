import { Platform } from 'react-native';
import * as Location from 'expo-location';

// Photon supports search-as-you-type and uses OpenStreetMap data.
// The public instance is suitable for light development use; configure a hosted
// instance for a production app with more traffic.
const GEOCODER_URL = process.env.EXPO_PUBLIC_GEOCODER_URL || 'https://photon.komoot.io';
const cache = new Map();

async function request(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${GEOCODER_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error('Location service unavailable');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function toPlace(feature) {
  const [longitude, latitude] = feature.geometry?.coordinates || [];
  const p = feature.properties || {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < 6 || latitude > 38.5 || longitude < 68 || longitude > 98) return null;
  if (p.countrycode && p.countrycode.toLowerCase() !== 'in') return null;
  const title = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || 'Location';
  const subtitle = [...new Set([p.street, p.district, p.city, p.state, p.postcode].filter((s) => s && s !== title))].join(', ');
  return { id: `${p.osm_type || 'place'}-${p.osm_id || `${latitude}-${longitude}`}`, title, subtitle, latitude, longitude };
}

export async function searchLocations(query, userCoords = null) {
  const clean = query?.trim();
  if (!clean || clean.length < 2) return [];
  const params = { q: clean, countrycode: 'IN', limit: '20', lang: 'en' };
  if (Number.isFinite(userCoords?.latitude) && Number.isFinite(userCoords?.longitude)) {
    params.lat = String(userCoords.latitude);
    params.lon = String(userCoords.longitude);
  }
  const key = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  if (cache.has(key)) return cache.get(key);
  const data = await request(`/api?${key}`);
  const results = (data.features || []).map(toPlace).filter(Boolean);
  cache.set(key, results);
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return results;
}

export async function reverseGeocode(latitude, longitude) {
  const fallback = { title: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, subtitle: 'Selected point' };
  try {
    const data = await request(`/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&limit=1&lang=en`);
    return toPlace(data.features?.[0] || {}) || fallback;
  } catch {
    return fallback;
  }
}

// On-demand fallback: native geocoding is not an autocomplete API.
export async function searchOnDevice(query, city) {
  if (Platform.OS === 'web') throw new Error('Device search is only available on a phone.');
  const permission = Platform.OS === 'android' ? await Location.requestForegroundPermissionsAsync() : null;
  if (Platform.OS === 'android' && permission.status !== 'granted') throw new Error('Allow location permission to use device search.');
  const text = query.trim();
  if (text.length < 2) return [];
  const address = city && !text.toLowerCase().includes(city.toLowerCase()) ? text + ', ' + city : text;
  const points = await Location.geocodeAsync(address);
  const places = await Promise.all(points.slice(0, 5).map(async (point, index) => {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || point.latitude < 6 || point.latitude > 38.5 || point.longitude < 68 || point.longitude > 98) return null;
    let label = '';
    try {
      const [result] = await Location.reverseGeocodeAsync(point);
      label = [...new Set([result?.name, result?.street, result?.district, result?.city, result?.region].filter(Boolean))].join(', ');
    } catch { /* The coordinates can still be displayed for confirmation. */ }
    return { id: 'device-' + index + '-' + point.latitude + '-' + point.longitude, title: text, subtitle: label || 'Device search result · check the pin', latitude: point.latitude, longitude: point.longitude };
  }));
  return places.filter(Boolean);
}
