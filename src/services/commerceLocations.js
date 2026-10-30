// Food/Shop's Rajkot launch zone includes the requested Shapar/Metoda outskirts.
// This is an explicit service zone, not a claim about municipal boundaries.
export const RAJKOT = { lat: 22.3039, lng: 70.8022 };
export const SERVICE_MESSAGE =
  "UniGoMoto Food & Shop is currently available in Rajkot.";
export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function inRajkot(a) {
  return (
    Number.isFinite(a?.latitude) &&
    Number.isFinite(a?.longitude) &&
    distanceKm({ latitude: RAJKOT.lat, longitude: RAJKOT.lng }, a) <= 25
  );
}
const endpoint =
  process.env.EXPO_PUBLIC_GEOCODER_URL || "https://photon.komoot.io";
async function request(path, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort);
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetch(`${endpoint}${path}`, {
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        "Location search is unavailable. Please try again or choose on map.",
      );
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
function address(feature) {
  const p = feature.properties || {};
  const [longitude, latitude] = feature.geometry.coordinates;
  const area = p.name || p.suburb || p.district || p.street || "Selected point";
  return {
    latitude,
    longitude,
    area,
    city: p.city || "Rajkot",
    state: p.state || "Gujarat",
    postalCode: p.postcode || "",
    addressLine: [
      ...new Set(
        [
          p.name,
          p.housenumber,
          p.street,
          p.suburb,
          p.district,
          p.city,
          p.state,
          p.postcode,
        ].filter(Boolean),
      ),
    ].join(", "),
    landmark: "",
    label: "Home",
  };
}
export async function searchRajkot(query, signal) {
  if (query.trim().length < 2) return [];
  // Bounding box + distance filter keeps dynamic street/landmark search in the launch area.
  const data = await request(
    `/api?q=${encodeURIComponent(query.trim())}&lat=${RAJKOT.lat}&lon=${RAJKOT.lng}&bbox=70.55,22.07,71.05,22.54&limit=20&lang=en`,
    signal,
  );
  return (data.features || []).map(address).filter(inRajkot);
}
export async function resolveAddress(latitude, longitude) {
  if (!inRajkot({ latitude, longitude })) throw new Error(SERVICE_MESSAGE);
  const data = await request(
    `/reverse?lat=${latitude}&lon=${longitude}&limit=1&lang=en`,
  );
  const result = data.features?.[0]
    ? address(data.features[0])
    : {
        area: "Selected point",
        city: "Rajkot",
        state: "Gujarat",
        postalCode: "",
        addressLine: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        label: "Home",
        landmark: "",
      };
  // Keep the exact pin/GPS point, not the geocoder's nearest feature coordinate.
  return { ...result, latitude, longitude };
}
