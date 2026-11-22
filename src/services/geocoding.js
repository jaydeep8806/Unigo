import { Platform } from 'react-native';
import * as Location from 'expo-location';

const GEOCODER_URL = process.env.EXPO_PUBLIC_GEOCODER_URL || 'https://photon.komoot.io';
const cache = new Map();

/* ─── Rich Offline Landmarks Database for Instant Fallback ─────────── */
const OFFLINE_LANDMARKS = [
  // Rajkot Key Hubs, Universities & Transport
  { title: 'Race Course Ground', subtitle: 'Race Course Road, Sadar, Rajkot', latitude: 22.3015, longitude: 70.7978, keywords: ['race', 'course', 'ground', 'sadar', 'rajkot', 'madhavrao'] },
  { title: 'Crystal Mall', subtitle: 'Kalawad Road, Rajkot', latitude: 22.2882, longitude: 70.7674, keywords: ['crystal', 'mall', 'kalawad', 'road', 'cinema', 'inox'] },
  { title: 'Marwadi University', subtitle: 'Rajkot-Morbi Highway, Gauridad, Rajkot', latitude: 22.3692, longitude: 70.7963, keywords: ['marwadi', 'university', 'college', 'morbi', 'highway', 'mu'] },
  { title: 'Atmiya University', subtitle: 'Kalawad Road, Rajkot', latitude: 22.2858, longitude: 70.7725, keywords: ['atmiya', 'university', 'college', 'kalawad', 'yogi'] },
  { title: 'RK University', subtitle: 'Bhavnagar Highway, Kasturbadham, Rajkot', latitude: 22.2412, longitude: 70.9004, keywords: ['rk', 'university', 'college', 'tramba', 'bhavnagar', 'rku'] },
  { title: 'Rajkot Junction Railway Station', subtitle: 'Junction Plot, Station Road, Rajkot', latitude: 22.3128, longitude: 70.8016, keywords: ['railway', 'station', 'junction', 'train', 'rajkot', 'main'] },
  { title: 'Bhakti Nagar Railway Station', subtitle: 'Bhakti Nagar, Rajkot', latitude: 22.2785, longitude: 70.8091, keywords: ['bhakti', 'nagar', 'station', 'railway'] },
  { title: 'Central Bus Station (GSRTC)', subtitle: 'Dhebar Road, Kanak Road, Rajkot', latitude: 22.2965, longitude: 70.8005, keywords: ['bus', 'stand', 'station', 'gsrtc', 'st', 'dhebar'] },
  { title: 'Rajkot International Airport (Hirasar)', subtitle: 'NH 27, Hirasar, Rajkot', latitude: 22.3551, longitude: 71.0182, keywords: ['airport', 'hirasar', 'flight', 'international', 'rajkot'] },
  { title: 'Old Airport Road', subtitle: 'Race Course Ring Road, Rajkot', latitude: 22.3092, longitude: 70.7795, keywords: ['old', 'airport', 'aerodrome', 'gandhigram'] },
  { title: 'Civil Hospital', subtitle: 'Hospital Chowk, Jamnagar Road, Rajkot', latitude: 22.3088, longitude: 70.7989, keywords: ['civil', 'hospital', 'chowk', 'doctor', 'emergency'] },
  { title: 'AIIMS Rajkot', subtitle: 'Khandheri, Para Pipaliya, Rajkot', latitude: 22.3854, longitude: 70.7291, keywords: ['aiims', 'hospital', 'khandheri', 'medical'] },
  { title: 'Indira Circle', subtitle: '150 Feet Ring Road / University Road, Rajkot', latitude: 22.2917, longitude: 70.7735, keywords: ['indira', 'circle', 'ring', 'road', 'university'] },
  { title: 'Nana Mava Circle', subtitle: '150 Feet Ring Road, Nana Mava, Rajkot', latitude: 22.2743, longitude: 70.7778, keywords: ['nana', 'mava', 'circle', 'ring', 'road'] },
  { title: 'Madhapar Chowk', subtitle: '150 Feet Ring Road, Jamnagar Highway, Rajkot', latitude: 22.3276, longitude: 70.7744, keywords: ['madhapar', 'chowk', 'jamnagar'] },
  { title: 'Mavdi Chowkadi', subtitle: '150 Feet Ring Road, Mavdi, Rajkot', latitude: 22.2612, longitude: 70.7852, keywords: ['mavdi', 'chowkadi', 'ring', 'road'] },
  { title: 'Gondal Road Chowkadi', subtitle: 'Gondal Road, Rajkot', latitude: 22.2536, longitude: 70.7972, keywords: ['gondal', 'road', 'chowkadi', 'highway'] },
  { title: 'Dr. Yagnik Road / Astron Chowk', subtitle: 'Dr. Yagnik Road, Sardar Nagar, Rajkot', latitude: 22.2987, longitude: 70.7942, keywords: ['yagnik', 'road', 'astron', 'chowk', 'jagnath', 'imperial'] },
  { title: 'Kotecha Chowk', subtitle: 'Nirmala Convent Road, Rajkot', latitude: 22.2934, longitude: 70.7821, keywords: ['kotecha', 'chowk', 'nirmala', 'convent'] },
  { title: 'Saurashtra University Campus', subtitle: 'University Road, Rajkot', latitude: 22.2952, longitude: 70.7423, keywords: ['saurashtra', 'university', 'campus'] },
  { title: 'Reliance Mega Mall', subtitle: '150 Feet Ring Road, Near Indira Circle, Rajkot', latitude: 22.2825, longitude: 70.7742, keywords: ['reliance', 'mall', 'mega'] },
  { title: 'Shapar-Veraval GIDC', subtitle: 'NH 27, Shapar, Rajkot', latitude: 22.1812, longitude: 70.7834, keywords: ['shapar', 'veraval', 'gidc', 'industrial'] },
  { title: 'Metoda GIDC', subtitle: 'Kalawad Road, Metoda, Rajkot', latitude: 22.2478, longitude: 70.6974, keywords: ['metoda', 'gidc', 'lodhika', 'industrial'] },
  { title: 'Aji Dam Garden', subtitle: 'Bhavnagar Road, Rajkot', latitude: 22.2575, longitude: 70.8354, keywords: ['aji', 'dam', 'garden', 'zoo'] },
  { title: 'Ishwariya Park & Temple', subtitle: 'Jamnagar Highway, Madhapar, Rajkot', latitude: 22.3421, longitude: 70.7456, keywords: ['ishwariya', 'park', 'temple', 'lake'] },
  { title: 'Pradhyuman Zoological Park', subtitle: 'Near Lalpari Lake, Rajkot', latitude: 22.3082, longitude: 70.8412, keywords: ['zoo', 'pradhyuman', 'park', 'lalpari'] },

  // Gujarat & Major Metros
  { title: 'Ahmedabad Junction Railway Station (Kalupur)', subtitle: 'Kalupur, Ahmedabad, Gujarat', latitude: 23.0238, longitude: 72.5997, keywords: ['ahmedabad', 'kalupur', 'railway', 'station'] },
  { title: 'Sardar Vallabhbhai Patel Airport', subtitle: 'Hansol, Ahmedabad, Gujarat', latitude: 23.0734, longitude: 72.6266, keywords: ['ahmedabad', 'airport', 'svpi'] },
  { title: 'Surat Railway Station', subtitle: 'Station Road, Surat, Gujarat', latitude: 21.2049, longitude: 72.8406, keywords: ['surat', 'railway', 'station'] },
  { title: 'Vadodara Junction Railway Station', subtitle: 'Sayajiganj, Vadodara, Gujarat', latitude: 22.3107, longitude: 73.1812, keywords: ['vadodara', 'baroda', 'railway', 'station'] },
  { title: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)', subtitle: 'Fort, Mumbai, Maharashtra', latitude: 18.9401, longitude: 72.8353, keywords: ['mumbai', 'csmt', 'vt', 'station'] },
  { title: 'New Delhi Railway Station', subtitle: 'Paharganj, New Delhi', latitude: 28.6415, longitude: 77.2198, keywords: ['delhi', 'new delhi', 'railway', 'station'] },
  { title: 'Indira Gandhi International Airport (IGI)', subtitle: 'Palam, New Delhi', latitude: 28.5562, longitude: 77.1000, keywords: ['delhi', 'airport', 'igi'] },
  { title: 'Kempegowda International Airport (BLR)', subtitle: 'Devanahalli, Bengaluru, Karnataka', latitude: 13.1986, longitude: 77.7066, keywords: ['bengaluru', 'bangalore', 'airport', 'blr'] },
];

function searchOfflineLandmarks(query) {
  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return OFFLINE_LANDMARKS.filter((item) => {
    const haystack = `${item.title} ${item.subtitle} ${(item.keywords || []).join(' ')}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  }).map((item, idx) => ({
    id: `landmark-${idx}-${item.latitude}-${item.longitude}`,
    title: item.title,
    subtitle: item.subtitle,
    latitude: item.latitude,
    longitude: item.longitude,
  })).slice(0, 6);
}

async function requestPhoton(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${GEOCODER_URL}${path}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'UniGo-Mobile-App/1.0', Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Photon unavailable');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchNominatim(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&addressdetails=1&limit=10`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'UniGo-Mobile-App/1.0', Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const addr = item.address || {};
      const title = item.name || addr.road || addr.suburb || addr.city || (item.display_name ? item.display_name.split(',')[0] : 'Location');
      const subtitle = [...new Set([addr.road, addr.suburb, addr.city || addr.town, addr.state, addr.postcode].filter((s) => s && s !== title))].join(', ');
      return {
        id: `nom-${item.place_id || `${lat}-${lon}`}`,
        title,
        subtitle: subtitle || item.display_name,
        latitude: lat,
        longitude: lon,
      };
    }).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
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

  const key = `q=${encodeURIComponent(clean)}&lat=${userCoords?.latitude || ''}&lon=${userCoords?.longitude || ''}`;
  if (cache.has(key)) return cache.get(key);

  let results = [];

  // Tier 1: Try Photon API
  try {
    const params = { q: clean, countrycode: 'IN', limit: '15', lang: 'en' };
    if (Number.isFinite(userCoords?.latitude) && Number.isFinite(userCoords?.longitude)) {
      params.lat = String(userCoords.latitude);
      params.lon = String(userCoords.longitude);
    }
    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const data = await requestPhoton(`/api?${qs}`);
    results = (data.features || []).map(toPlace).filter(Boolean);
  } catch {
    results = [];
  }

  // Tier 2: Try OpenStreetMap Nominatim
  if (!results.length) {
    try {
      results = await searchNominatim(clean);
    } catch {
      results = [];
    }
  }

  // Tier 3: Try On-device Geocoding if available
  if (!results.length && Platform.OS !== 'web') {
    try {
      results = await searchOnDevice(clean);
    } catch {
      results = [];
    }
  }

  // Tier 4: Offline Curated Landmarks
  const offline = searchOfflineLandmarks(clean);
  if (!results.length) {
    results = offline;
  } else if (offline.length) {
    const existing = new Set(results.map((r) => r.title.toLowerCase()));
    for (const item of offline) {
      if (!existing.has(item.title.toLowerCase())) {
        results.push(item);
      }
    }
  }

  if (results.length) {
    cache.set(key, results);
    if (cache.size > 100) cache.delete(cache.keys().next().value);
  }

  return results;
}

export async function reverseGeocode(latitude, longitude) {
  const fallback = { title: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, subtitle: 'Selected point' };
  try {
    const data = await requestPhoton(`/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&limit=1&lang=en`);
    const place = toPlace(data.features?.[0] || {});
    if (place) return place;
  } catch {
    // Try device reverse geocode
    if (Platform.OS !== 'web') {
      try {
        const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (result) {
          const title = result.name || result.street || 'Selected location';
          const subtitle = [...new Set([result.street, result.district, result.city, result.region].filter(Boolean))].join(', ');
          return { id: `rev-${latitude}-${longitude}`, title, subtitle, latitude, longitude };
        }
      } catch {}
    }
  }
  return fallback;
}

// On-demand fallback: native geocoding
export async function searchOnDevice(query, city) {
  if (Platform.OS === 'web') return [];
  const permission = Platform.OS === 'android' ? await Location.requestForegroundPermissionsAsync() : null;
  if (Platform.OS === 'android' && permission.status !== 'granted') return [];
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
    } catch { /* Coordinates displayed for confirmation */ }
    return { id: 'device-' + index + '-' + point.latitude + '-' + point.longitude, title: text, subtitle: label || 'Device search result · check the pin', latitude: point.latitude, longitude: point.longitude };
  }));
  return places.filter(Boolean);
}
