// Local demo data only. Replace this adapter when ride matching is available.
const vehicles = {
  bike: { vehicleModel: 'Honda Activa', vehicleColor: 'Black', vehicleNumber: 'GJ 03 AB 4821' },
  auto: { vehicleModel: 'Auto rickshaw', vehicleColor: 'Green and yellow', vehicleNumber: 'GJ 03 CD 2364' },
  car: { vehicleModel: 'Compact car', vehicleColor: 'White', vehicleNumber: 'GJ 03 EF 8912' },
  sedan: { vehicleModel: 'Sedan', vehicleColor: 'Silver', vehicleNumber: 'GJ 03 GH 5678' },
};

export function getDemoDriver(vehicleId) {
  return { name: 'Ramesh Patel', rating: '4.8', trips: '1,420', ...vehicles[vehicleId] };
}
