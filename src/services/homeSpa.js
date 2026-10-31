const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const FILTERS = {
  cleaning: ['["craft"="cleaning"]', '["office"="cleaning"]', '["shop"~"^(laundry|dry_cleaning)$"]'],
  salon: ['["shop"~"^(hairdresser|beauty|barber)$"]'],
  spa: ['["leisure"="spa"]', '["shop"="spa"]', '["shop"="beauty"]'],
  massage: ['["shop"="massage"]', '["healthcare"="massage"]', '["leisure"="massage"]', '["shop"="beauty"]'],
};

// Demo listings are deliberately synthetic; coordinates are relative to the
// selected service location and must never be presented as real businesses.
export function demoHomeSpaPlaces(lat, lng, category) {
  const names = {
    cleaning: ['Sparkle Home Care', 'Fresh Nest Cleaning', 'Bright Rooms'],
    salon: ['Style at Home', 'Glow Salon', 'The Beauty Room'],
    spa: ['Serenity Spa', 'Calm Home Spa', 'Lotus Wellness'],
    massage: ['Relax Massage', 'Tranquil Touch', 'Wellness Hands'],
  };
  if (!names[category]) return [];
  const offsets = [[0.012, 0.008], [-0.009, 0.014], [0.006, -0.015]];
  return names[category].map((name, index) => ({
    id: `demo-${category}-${index}`, name, lat: lat + offsets[index][0],
    lng: lng + offsets[index][1], type: category, demo: true,
  }));
}

export async function findHomeSpaPlaces(lat, lng, category) {
  const filters = FILTERS[category];
  if (!filters || !Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Invalid search');
  const clauses = filters.map((filter) => `nwr${filter}["name"](around:10000,${lat},${lng});`).join('');
  const query = `[out:json][timeout:8];(${clauses});out center 100;`;
  const search = async (endpoint) => {
    const controller = new AbortController();
    let timeout;
    try {
      const data = await Promise.race([
        (async () => {
          const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}`, signal: controller.signal });
          if (!response.ok) throw new Error('Listings unavailable');
          return response.json();
        })(),
        new Promise((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error('Search timed out')); }, 10000); }),
      ]);
      if (!Array.isArray(data.elements)) throw new Error('Invalid response');
      return data.elements.map((element) => ({
        id: `${element.type}-${element.id}`,
        name: element.tags?.name,
        lat: element.lat ?? element.center?.lat,
        lng: element.lon ?? element.center?.lon,
        phone: element.tags?.['contact:phone'] || element.tags?.phone || '',
        type: element.tags?.shop || element.tags?.craft || element.tags?.office || element.tags?.leisure || element.tags?.healthcare || '',
      })).filter((place) => place.name && Number.isFinite(place.lat) && Number.isFinite(place.lng));
    } finally {
      clearTimeout(timeout);
    }
  };
  return Promise.any(ENDPOINTS.map(search));
}
