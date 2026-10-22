/**
 * Geocoding service using OpenStreetMap Nominatim API with localized search bias
 */

const USER_AGENT = 'UniGo-RideApp/1.0 (contact: unigo@local.dev)';

/**
 * Searches places/addresses using Nominatim autocomplete search with local coordinate bias
 * @param {string} query
 * @param {{latitude: number, longitude: number} | null} userCoords
 * @returns {Promise<Array<{id: string, title: string, subtitle: string, latitude: number, longitude: number}>>}
 */
export async function searchLocations(query, userCoords = null) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const encoded = encodeURIComponent(query.trim());
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&addressdetails=1&limit=6`;

    // Bias search to user's geographic region (approx ~80km viewbox)
    if (userCoords && userCoords.latitude && userCoords.longitude) {
      const lat = userCoords.latitude;
      const lon = userCoords.longitude;
      const x1 = (lon - 0.7).toFixed(4);
      const y1 = (lat + 0.7).toFixed(4);
      const x2 = (lon + 0.7).toFixed(4);
      const y2 = (lat - 0.7).toFixed(4);
      url += `&viewbox=${x1},${y1},${x2},${y2}&bounded=0`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item) => {
      const parts = (item.display_name || '').split(',').map((s) => s.trim());
      const title = parts.slice(0, 2).join(', ') || item.name || 'Location';
      const subtitle = parts.slice(2, 5).join(', ') || '';

      return {
        id: String(item.place_id || Math.random()),
        title,
        subtitle,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });
  } catch (error) {
    console.warn('Geocoding search warning:', error);
    return [];
  }
}

/**
 * Reverse geocodes coordinates to a readable short address
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{title: string, subtitle: string}>}
 */
export async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) {
    return { title: 'Unknown Location', subtitle: '' };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        title: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        subtitle: 'GPS Coordinate',
      };
    }

    const data = await response.json();
    const addr = data.address || {};

    // Construct friendly short name
    const mainPart =
      addr.road ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.commercial ||
      addr.residential ||
      addr.city_district ||
      '';

    const cityPart = addr.city || addr.town || addr.county || addr.state || '';

    const title = [mainPart, cityPart].filter(Boolean).join(', ') || data.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    const parts = (data.display_name || '').split(',').map((s) => s.trim());
    const subtitle = parts.slice(1, 4).join(', ');

    return { title, subtitle };
  } catch (error) {
    console.warn('Reverse geocode warning:', error);
    return {
      title: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      subtitle: 'Selected Point',
    };
  }
}
