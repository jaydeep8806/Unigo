import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { RESTAURANTS } from '../data/restaurants';

const FoodCartContext = createContext(null);
const catalog = {};
RESTAURANTS.forEach((restaurant) => {
  if (restaurant.informationOnly) return;
  restaurant.menu.forEach((section) => section.items.forEach((item) => {
    catalog[item.id] = { ...item, restaurantId: restaurant.id, restaurantName: restaurant.name };
  }));
});

export function FoodCartProvider({ children }) {
  const [quantities, setQuantities] = useState({});
  const updateQuantity = useCallback((id, change) => {
    if (!catalog[id]) return;
    setQuantities((previous) => {
      const next = { ...previous };
      const quantity = (next[id] || 0) + change;
      if (quantity > 0) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }, []);
  const items = useMemo(() => Object.entries(quantities).filter(([id]) => catalog[id]).map(([id, quantity]) => ({ ...catalog[id], quantity })), [quantities]);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const itemTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const value = useMemo(() => ({ quantities, items, totalItems, itemTotal, updateQuantity }), [quantities, items, totalItems, itemTotal, updateQuantity]);
  return <FoodCartContext.Provider value={value}>{children}</FoodCartContext.Provider>;
}

export function useFoodCart() {
  const context = useContext(FoodCartContext);
  if (!context) throw new Error('useFoodCart must be used within FoodCartProvider');
  return context;
}
