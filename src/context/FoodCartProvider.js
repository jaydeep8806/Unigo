import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { RESTAURANTS } from '../data/restaurants';
import { getMerchantRestaurants } from '../services/merchant';

const FoodCartContext = createContext(null);
const staticCatalog = {};
RESTAURANTS.forEach((restaurant) => {
  if (restaurant.informationOnly) return;
  restaurant.menu.forEach((section) => section.items.forEach((item) => {
    staticCatalog[item.id] = { ...item, restaurantId: restaurant.id, restaurantName: restaurant.name };
  }));
});

export function FoodCartProvider({ children }) {
  const [catalog, setCatalog] = useState(staticCatalog);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    let active = true;
    getMerchantRestaurants().then((merchants) => {
      if (!active || !merchants?.length) return;
      setCatalog((prev) => {
        const next = { ...prev };
        merchants.forEach((m) => {
          m.menu?.forEach((section) => section.items?.forEach((item) => {
            next[item.id] = { ...item, restaurantId: m.id, restaurantName: m.name };
          }));
        });
        return next;
      });
    });
    return () => { active = false; };
  }, []);

  const updateQuantity = useCallback((id, change, itemData) => {
    if (itemData) {
      setCatalog((prev) => (prev[id] ? prev : { ...prev, [id]: itemData }));
    }

    setQuantities((previous) => {
      const next = { ...previous };
      const quantity = (next[id] || 0) + change;
      if (quantity > 0) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }, []);

  const clearCart = useCallback(() => setQuantities({}), []);

  const items = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([id]) => catalog[id])
        .map(([id, quantity]) => ({ ...catalog[id], quantity })),
    [quantities, catalog]
  );

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const itemTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  const value = useMemo(
    () => ({ quantities, items, totalItems, itemTotal, updateQuantity, clearCart }),
    [quantities, items, totalItems, itemTotal, updateQuantity, clearCart]
  );

  return <FoodCartContext.Provider value={value}>{children}</FoodCartContext.Provider>;
}

export function useFoodCart() {
  const context = useContext(FoodCartContext);
  if (!context) throw new Error('useFoodCart must be used within FoodCartProvider');
  return context;
}

