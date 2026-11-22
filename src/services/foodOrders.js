import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY_FOOD_ORDERS = '@unigo_food_orders';

export const FAKE_DELIVERY_PARTNERS = [
  {
    name: 'Kishan Solanki',
    phone: '+91 98251 44821',
    rating: '4.9',
    deliveries: '1,840',
    vehicle: 'Hero Splendor',
    plate: 'GJ 03 EQ 4521',
  },
  {
    name: 'Hardik Vala',
    phone: '+91 97123 55890',
    rating: '4.8',
    deliveries: '920',
    vehicle: 'Honda Shine',
    plate: 'GJ 03 AB 8912',
  },
  {
    name: 'Jayesh Rathod',
    phone: '+91 99245 66712',
    rating: '4.9',
    deliveries: '2,410',
    vehicle: 'TVS Raider',
    plate: 'GJ 03 CD 3344',
  },
];

export async function getFoodOrders() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_FOOD_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getFoodOrder(id) {
  const orders = await getFoodOrders();
  return orders.find((o) => o.id === id) || null;
}

export async function saveFoodOrder(order) {
  try {
    const current = await getFoodOrders();
    const updated = [order, ...current.filter((o) => o.id !== order.id)];
    await AsyncStorage.setItem(STORAGE_KEY_FOOD_ORDERS, JSON.stringify(updated));
    return order;
  } catch (error) {
    console.warn('Failed to save food order:', error);
    return order;
  }
}

export async function updateFoodOrder(id, changes) {
  try {
    const current = await getFoodOrders();
    const updated = current.map((order) => (order.id === id ? { ...order, ...changes } : order));
    await AsyncStorage.setItem(STORAGE_KEY_FOOD_ORDERS, JSON.stringify(updated));
    return updated.find((o) => o.id === id);
  } catch (error) {
    console.warn('Failed to update food order:', error);
    return null;
  }
}

