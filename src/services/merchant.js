import AsyncStorage from '@react-native-async-storage/async-storage';
import { RESTAURANTS } from '../data/restaurants';

export const STORAGE_KEY_MERCHANT_RESTAURANTS = '@unigo_merchant_restaurants';
export const STORAGE_KEY_MERCHANT_PROFILE = '@unigo_merchant_profile';

export async function getMerchantRestaurants() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_MERCHANT_RESTAURANTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getMergedRestaurants() {
  const custom = await getMerchantRestaurants();
  // Custom restaurants go first so the owner immediately sees their newly listed place at the top!
  return [...custom, ...RESTAURANTS];
}

export async function saveMerchantRestaurant(data) {
  try {
    const custom = await getMerchantRestaurants();
    const newRestaurant = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: data.name.trim(),
      ownerName: data.ownerName?.trim() || '',
      phone: data.phone?.trim() || '',
      cuisine: data.cuisine || 'Fast Food, Snacks',
      category: data.category || 'all',
      categories: data.categories || [data.category || 'all'],
      rating: 5.0,
      reviewCount: 1,
      deliveryTime: data.deliveryTime || '20-25 min',
      deliveryFee: Number(data.deliveryFee) || 20,
      distance: '0.8 km',
      offer: data.offer || 'Welcome offer · 20% OFF',
      veg: Boolean(data.veg),
      promoted: true,
      address: data.address?.trim() || 'Rajkot',
      city: data.city || 'Rajkot',
      fssai: data.fssai || 'FSSAI License In Process',
      gstin: data.gstin || '',
      upi: data.upi || '',
      verified: Boolean(data.verified !== false),
      lat: 22.3039,
      lng: 70.8022,
      createdAt: new Date().toISOString(),
      isCustom: true,
      menu: data.menu && data.menu.length > 0 ? data.menu : [
        {
          category: 'Recommended',
          items: [
            {
              id: `item_${Date.now()}_1`,
              name: 'Special Signature Dish',
              price: 150,
              description: 'Freshly prepared specialty of the house',
              veg: Boolean(data.veg),
              bestseller: true,
            },
            {
              id: `item_${Date.now()}_2`,
              name: 'House Special Combo',
              price: 220,
              description: 'Complete meal combo with sides & beverage',
              veg: Boolean(data.veg),
              bestseller: true,
            },
          ],
        },
      ],
    };

    const updated = [newRestaurant, ...custom.filter((r) => r.id !== newRestaurant.id)];
    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_RESTAURANTS, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(newRestaurant));
    return newRestaurant;
  } catch (error) {
    console.warn('Failed to save merchant restaurant:', error);
    throw error;
  }
}

export async function getActiveMerchantProfile() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_MERCHANT_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
