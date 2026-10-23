/**
 * Geocoding service using OpenStreetMap Nominatim API.
 * Strict India filtering (countrycodes=in) to ensure all search results are strictly within India.
 */

const USER_AGENT = 'UniGo-RideApp/1.0 (contact: unigo@local.dev)';

function isInsideIndia(lat, lon, item) {
  if (item && item.address && item.address.country_code) {
    if (item.address.country_code.toLowerCase() !== 'in') return false;
  }
  return lat >= 6.0 && lat <= 38.5 && lon >= 68.0 && lon <= 98.0;
}

/**
 * Searches places/addresses using Nominatim autocomplete search strictly within India.
 * @param {string} query
 * @param {{latitude: number, longitude: number} | null} userCoords
 * @returns {Promise<Array<{id: string, title: string, subtitle: string, latitude: number, longitude: number}>>}
 */
export async function searchLocations(query, userCoords = null) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const cleanQuery = query.trim();
    const encoded = encodeURIComponent(cleanQuery);
    // Strict India restriction: &countrycodes=in
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=in&addressdetails=1&limit=10`;

    // Bias search to user's geographic region if valid in India
    if (
      userCoords &&
      userCoords.latitude &&
      userCoords.longitude &&
      isInsideIndia(userCoords.latitude, userCoords.longitude)
    ) {
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
        'Accept-Language': 'en-IN,en;q=0.9',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((item) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        return !isNaN(lat) && !isNaN(lon) && isInsideIndia(lat, lon, item);
      })
      .map((item) => {
        const parts = (item.display_name || '').split(',').map((s) => s.trim());
        const title = parts.slice(0, 2).join(', ') || item.name || 'Location';
        const subtitle = parts.slice(2, 5).join(', ') || 'India';

        return {
          id: String(item.place_id || Math.random()),
          title,
          subtitle,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Reverse geocodes coordinates to a readable short address in India
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
        'Accept-Language': 'en-IN,en;q=0.9',
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

    const cityPart = addr.city || addr.town || addr.county || addr.state || 'India';

    const title =
      [mainPart, cityPart].filter(Boolean).join(', ') ||
      data.name ||
      `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    const parts = (data.display_name || '').split(',').map((s) => s.trim());
    const subtitle = parts.slice(1, 4).join(', ');

    return { title, subtitle };
  } catch {
    return {
      title: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      subtitle: 'Selected Point',
    };
  }
}
