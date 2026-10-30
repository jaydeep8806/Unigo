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
