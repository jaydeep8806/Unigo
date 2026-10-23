/**
 * Overpass API service – fetch nearby POIs from OpenStreetMap.
 * Falls back to hardcoded places around the city center when the API fails or is unreachable.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const USER_AGENT = 'UniGo-RideApp/1.0 (contact: unigo@local.dev)';

/**
 * Query nearby POIs of given types within radius meters of (lat, lng).
 * @param {number} lat
 * @param {number} lng
 * @param {string[]} types – OSM amenity/shop values, e.g. ['restaurant', 'fast_food']
 * @param {number} radiusMeters – default 2000 (2 km)
 * @returns {Promise<Array<{id: string, name: string, lat: number, lng: number, type: string}>>}
 */
export async function fetchNearbyPOIs(lat, lng, types = [], radiusMeters = 2000) {
  if (!types || types.length === 0) return [];

  // Fast single-pass node query using regex for low latency and to avoid 502/timeout
  const typePattern = types.join('|');
  const query = `[out:json][timeout:5];(node["amenity"~"^(${typePattern})$"](around:${radiusMeters},${lat},${lng});node["shop"~"^(${typePattern})$"](around:${radiusMeters},${lat},${lng}););out 30;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        continue;
      }

      return data.elements
        .filter((el) => {
          const elLat = el.lat || (el.center && el.center.lat);
          const elLng = el.lon || (el.center && el.center.lon);
          return elLat && elLng;
        })
        .map((el) => ({
          id: String(el.id),
          name: (el.tags && (el.tags.name || el.tags['name:en'])) || 'Unnamed Place',
          lat: el.lat || el.center.lat,
          lng: el.lon || el.center.lon,
          type: (el.tags && (el.tags.amenity || el.tags.shop)) || 'place',
        }));
    } catch {
      // Quietly fall through to next mirror or fallback places
      continue;
    }
  }

  // If endpoints are unreachable or timed out, gracefully return empty array to trigger fallback places
  return [];
}

/**
 * Generate fallback places in a ring around the center.
 * @param {number} lat
 * @param {number} lng
 * @param {string} type – label like 'food' or 'shops'
 * @param {number} count
 */
export function generateFallbackPlaces(lat, lng, type, count = 8) {
  const names =
    type === 'food'
      ? [
          'Green Bites Café',
          'Tandoori House',
          'Pizza Corner',
          'South Indian Delight',
          'Chai & Snacks',
          'Biryani Palace',
          'Fresh Juice Bar',
          'Burger Hub',
        ]
      : [
          'City Mall',
          'Fresh Mart',
          'Daily Needs Store',
          'SuperBazaar',
          'Quick Stop Grocery',
          'Green Basket',
          'Baker Street',
          'Fashion Hub',
        ];

  const places = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const offsetLat = 0.008 * Math.cos(angle) + (Math.random() - 0.5) * 0.003;
    const offsetLng = 0.008 * Math.sin(angle) + (Math.random() - 0.5) * 0.003;
    places.push({
      id: `fallback-${type}-${i}`,
      name: names[i % names.length],
      lat: +(lat + offsetLat).toFixed(5),
      lng: +(lng + offsetLng).toFixed(5),
      type: type === 'food' ? 'restaurant' : 'shop',
    });
  }
  return places;
}
