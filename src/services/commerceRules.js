import { distanceKm, inRajkot } from "./commerceLocations.js";

export function shopCategory(tags) {
  const type = tags.shop || tags.amenity || "";
  return (
    {
      supermarket: "Grocery",
      convenience: "Grocery",
      greengrocer: "Fruits & Vegetables",
      dairy: "Dairy",
      bakery: "Bakery",
      pharmacy: "Pharmacy",
      electronics: "Electronics",
      mobile_phone: "Electronics",
      stationery: "Stationery",
      clothes: "Fashion",
      shoes: "Fashion",
      general: "General Store",
      confectionery: "Snacks",
      beverages: "Beverages",
      household: "Household",
      hardware: "Household",
      cosmetics: "Personal Care",
      chemist: "Personal Care",
    }[type] || type.replaceAll("_", " ")
  );
}

export function stockState(product) {
  if (!product || !product.available || (product.stock_quantity ?? 0) <= 0) {
    return "OUT_OF_STOCK";
  }
  const threshold = product.low_stock_threshold ?? 5;
  return product.stock_quantity <= threshold ? "LOW_STOCK" : "IN_STOCK";
}

export function deliverable(store, address) {
  if (!store || !address) return false;
  
  // Store must be actively accepting orders
  if (store.status !== "open") return false;

  // In-service validation: checks store/address zone or defaults to inRajkot launch check
  const inServiceZone = store.city
    ? (address.city ? store.city.toLowerCase() === address.city.toLowerCase() : inRajkot(address))
    : inRajkot(address);

  if (!inServiceZone) return false;

  const distance = distanceKm(address, store);
  const maxRadius = Number(store.delivery_radius ?? 5);

  return distance <= maxRadius;
}

