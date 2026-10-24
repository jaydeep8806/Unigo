/**
 * Rapido-style Fare Pricing Engine for UniGo.
 *
 * Formula:
 * Total Fare = Base Fare + (Distance beyond Base Km × Per Km Rate) + (Trip Duration × Per Minute Rate) + Platform Fee
 *
 * Subject to a guaranteed Minimum Fare.
 */

export const RAPIDO_PRICING_CONFIG = {
  bike: {
    id: 'bike',
    name: 'UniGo Moto',
    icon: '🏍️',
    capacity: '1 Seat',
    etaText: '2 mins away',
    baseFare: 25, // Covers first 1.5 km
    baseKm: 1.5,
    perKm: 9.0, // After 1.5 km
    perMinute: 1.0, // Traffic / ride time charge
    platformFee: 3,
    minFare: 25,
  },
  auto: {
    id: 'auto',
    name: 'UniGo Auto',
    icon: '🛺',
    capacity: '3 Seats',
    etaText: '3 mins away',
    baseFare: 35, // Covers first 1.5 km
    baseKm: 1.5,
    perKm: 13.0,
    perMinute: 1.25,
    platformFee: 4,
    minFare: 35,
  },
  car: {
    id: 'car',
    name: 'UniGo Prime',
    icon: '🚗',
    capacity: '4 Seats',
    etaText: '5 mins away',
    baseFare: 60, // Covers first 2.0 km
    baseKm: 2.0,
    perKm: 18.0,
    perMinute: 1.75,
    platformFee: 5,
    minFare: 60,
  },
};

/**
 * Calculates vehicle fare breakdown following the Rapido pricing model.
 * @param {string} vehicleId - 'bike' | 'auto' | 'car'
 * @param {number} distanceKm - Total driving distance in kilometers
 * @param {number} durationMins - Estimated duration in minutes
 * @param {boolean} isCarpool - Whether carpool discount applies
 * @returns {{
 *   vehicleId: string,
 *   name: string,
 *   icon: string,
 *   capacity: string,
 *   etaText: string,
 *   fare: number,
 *   baseFare: number,
 *   distanceFare: number,
 *   timeFare: number,
 *   platformFee: number,
 *   rawFare: number,
 *   discount: number
 * }}
 */
export function calculateRapidoFare(vehicleId, distanceKm = 0, durationMins = 0, isCarpool = false) {
  const config = RAPIDO_PRICING_CONFIG[vehicleId] || RAPIDO_PRICING_CONFIG.bike;
  const dist = Math.max(0, Number(distanceKm) || 0);
  const duration = Math.max(0, Number(durationMins) || 0);

  // Distance beyond base km
  const extraDistance = Math.max(0, dist - config.baseKm);
  const distanceFare = Math.round(extraDistance * config.perKm);

  // Time charge for travel duration
  const timeFare = Math.round(duration * config.perMinute);

  // Raw fare
  const rawFare = config.baseFare + distanceFare + timeFare + config.platformFee;

  // Apply minimum fare threshold
  let finalFare = Math.max(config.minFare, rawFare);

  let discount = 0;
  if (isCarpool) {
    discount = Math.round(finalFare * 0.40);
    finalFare = Math.max(config.minFare, finalFare - discount);
  }

  return {
    ...config,
    fare: finalFare,
    baseFare: config.baseFare,
    distanceFare,
    timeFare,
    platformFee: config.platformFee,
    rawFare,
    discount,
  };
}

/**
 * Calculates fares for all vehicle tiers.
 * @param {number} distanceKm
 * @param {number} durationMins
 * @param {boolean} isCarpool
 * @returns {Array<ReturnType<typeof calculateRapidoFare>>}
 */
export function calculateAllFares(distanceKm = 0, durationMins = 0, isCarpool = false) {
  return ['bike', 'auto', 'car'].map((id) =>
    calculateRapidoFare(id, distanceKm, durationMins, isCarpool)
  );
}
