import polyline from '@mapbox/polyline';

/**
 * Fetches a distance-optimized driving route, falling back to OSRM alternatives.
 * @param {{latitude: number, longitude: number}} start
 * @param {{latitude: number, longitude: number}} end
 * @returns {Promise<{coordinates: Array<{latitude: number, longitude: number}>, distanceMeters: number, durationSeconds: number}>}
 */
export async function fetchDrivingRoute(start, end) {
  if (!start || !end) {
    throw new Error('Start and end coordinates are required.');
  }

  try {
    return await fetchShortestRoute(start, end);
  } catch {
    return fetchOsrmRoute(start, end);
  }
}

async function fetchShortestRoute(start, end) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [start, end].map(({ latitude, longitude }) => ({ lat: latitude, lon: longitude })),
        costing: 'auto',
        costing_options: { auto: { shortest: true } },
        units: 'kilometers',
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Routing request failed with status ${response.status}`);
    const { trip } = await response.json();
    if (!trip?.legs?.length || !trip.summary || trip.legs.some((leg) => !leg.shape)) {
      throw new Error('No route found between these points.');
    }
    const decode = polyline.decode || polyline.default?.decode;
    const coordinates = trip.legs.flatMap((leg) => decode(leg.shape, 6))
      .map(([latitude, longitude]) => ({ latitude, longitude }));
    if (coordinates.length < 2 || !Number.isFinite(trip.summary.length) || !Number.isFinite(trip.summary.time)) {
      throw new Error('Invalid route returned.');
    }
    return { coordinates, distanceMeters: trip.summary.length * 1000, durationSeconds: trip.summary.time };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOsrmRoute(start, end) {

  // OSRM expects coordinates in {lon},{lat} format
  const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=polyline&alternatives=true`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`OSRM network request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No route found between these points.');
  }

  const route = data.routes.reduce((shortest, candidate) =>
    candidate.distance < shortest.distance ? candidate : shortest
  );
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
