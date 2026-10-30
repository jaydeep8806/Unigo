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
  if (!product.available || product.stock_quantity <= 0) return "OUT_OF_STOCK";
  return product.stock_quantity <= product.low_stock_threshold
    ? "LOW_STOCK"
    : "IN_STOCK";
}

export function deliverable(store, address) {
  return (
    inRajkot(address) &&
    store.status === "open" &&
    distanceKm(address, store) <= store.delivery_radius
  );
}
