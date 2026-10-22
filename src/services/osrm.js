import polyline from '@mapbox/polyline';

/**
 * Fetches driving route coordinates between two points using public OSRM API.
 * @param {{latitude: number, longitude: number}} start
 * @param {{latitude: number, longitude: number}} end
 * @returns {Promise<{coordinates: Array<{latitude: number, longitude: number}>, distanceMeters: number, durationSeconds: number}>}
 */
export async function fetchDrivingRoute(start, end) {
  if (!start || !end) {
    throw new Error('Start and end coordinates are required.');
  }

  // OSRM expects coordinates in {lon},{lat} format
  const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=polyline`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM network request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No route found between these points.');
  }

  const route = data.routes[0];
  const decodeFunc = polyline.decode || (polyline.default && polyline.default.decode);
  const rawPoints = decodeFunc(route.geometry);

  // polyline.decode yields [[latitude, longitude], ...]
  const coordinates = rawPoints.map(([latitude, longitude]) => ({
    latitude,
    longitude,
  }));

  return {
    coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
