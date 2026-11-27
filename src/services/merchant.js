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
  // Only restaurants approved by Admin are visible to public customers!
  const approved = custom.filter((r) => r.status === 'approved' || (r.verified === true && r.status !== 'under_review' && r.status !== 'rejected'));
  return [...approved, ...RESTAURANTS];
}

export async function getAllRestaurantsForPreview() {
  const custom = await getMerchantRestaurants();
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
      fssai: data.fssai || '',
      gstin: data.gstin || '',
      upi: data.upi || '',
      status: data.status || 'under_review', // 'under_review' | 'approved' | 'rejected'
      verified: Boolean(data.verified || false),
      lat: 22.3039,
      lng: 70.8022,
      createdAt: new Date().toISOString(),
      isCustom: true,
      menu: data.menu && data.menu.length > 0 ? data.menu : [
        {
          category: 'House Specials',
          items: [
            {
              id: `item_${Date.now()}_1`,
              name: 'House Signature Dish',
              price: 150,
              description: 'Freshly prepared specialty of the house',
              veg: Boolean(data.veg),
              bestseller: true,
              inStock: true,
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

export async function approveMerchantRestaurant(id) {
  try {
    const custom = await getMerchantRestaurants();
    const updated = custom.map((r) =>
      r.id === id ? { ...r, status: 'approved', verified: true, approvedAt: new Date().toISOString() } : r
    );
    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_RESTAURANTS, JSON.stringify(updated));

    const active = await getActiveMerchantProfile();
    if (active && active.id === id) {
      const updatedActive = { ...active, status: 'approved', verified: true };
      await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(updatedActive));
      return updatedActive;
    }
    return updated.find((r) => r.id === id);
  } catch (err) {
    console.warn('Could not approve restaurant:', err);
    throw err;
  }
}

export async function rejectMerchantRestaurant(id, reason = 'Under review / verification revoked') {
  try {
    const custom = await getMerchantRestaurants();
    const updated = custom.map((r) =>
      r.id === id ? { ...r, status: 'under_review', verified: false, rejectReason: reason } : r
    );
    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_RESTAURANTS, JSON.stringify(updated));

    const active = await getActiveMerchantProfile();
    if (active && active.id === id) {
      const updatedActive = { ...active, status: 'under_review', verified: false, rejectReason: reason };
      await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(updatedActive));
      return updatedActive;
    }
    return updated.find((r) => r.id === id);
  } catch (err) {
    console.warn('Could not reject restaurant:', err);
    throw err;
  }
}

export async function addDishToMerchantRestaurant(restaurantId, dishData) {
  try {
    const custom = await getMerchantRestaurants();
    const target = custom.find((r) => r.id === restaurantId);
    if (!target) throw new Error('Restaurant not found');

    const newDish = {
      id: `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: dishData.name.trim(),
      price: Number(dishData.price) || 100,
      description: dishData.description?.trim() || '',
      veg: Boolean(dishData.veg),
      bestseller: Boolean(dishData.bestseller),
      inStock: true,
      photo: dishData.photo || null,
      photoCategory: dishData.photoCategory || target.category || 'thali',
    };

    const targetCategory = dishData.category?.trim() || 'Menu Items';
    let menu = target.menu || [];
    const sectionIndex = menu.findIndex((s) => s.category.toLowerCase() === targetCategory.toLowerCase());

    if (sectionIndex >= 0) {
      menu[sectionIndex].items = [newDish, ...menu[sectionIndex].items];
    } else {
      menu = [{ category: targetCategory, items: [newDish] }, ...menu];
    }

    const updatedRestaurant = { ...target, menu };
    const updatedList = custom.map((r) => (r.id === restaurantId ? updatedRestaurant : r));

    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_RESTAURANTS, JSON.stringify(updatedList));
    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(updatedRestaurant));
    return updatedRestaurant;
  } catch (err) {
    console.warn('Failed to add dish:', err);
    throw err;
  }
}

export async function deleteDishFromMerchantRestaurant(restaurantId, dishId) {
  try {
    const custom = await getMerchantRestaurants();
    const target = custom.find((r) => r.id === restaurantId);
    if (!target) throw new Error('Restaurant not found');

    const menu = (target.menu || []).map((section) => ({
      ...section,
      items: section.items.filter((item) => item.id !== dishId),
    })).filter((section) => section.items.length > 0);

    const updatedRestaurant = { ...target, menu };
    const updatedList = custom.map((r) => (r.id === restaurantId ? updatedRestaurant : r));

    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_RESTAURANTS, JSON.stringify(updatedList));
    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(updatedRestaurant));
    return updatedRestaurant;
  } catch (err) {
    console.warn('Failed to delete dish:', err);
    throw err;
  }
}

export async function toggleDishStock(restaurantId, dishId) {
  try {
    const custom = await getMerchantRestaurants();
    const target = custom.find((r) => r.id === restaurantId);
    if (!target) throw new Error('Restaurant not found');

    const menu = (target.menu || []).map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id === dishId ? { ...item, inStock: !item.inStock } : item
      ),
    }));

    const updatedRestaurant = { ...target, menu };
    const updatedList = custom.map((r) => (r.id === restaurantId ? updatedRestaurant : r));

    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_RESTAURANTS, JSON.stringify(updatedList));
    await AsyncStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(updatedRestaurant));
    return updatedRestaurant;
  } catch (err) {
    console.warn('Failed to toggle dish stock:', err);
    throw err;
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
