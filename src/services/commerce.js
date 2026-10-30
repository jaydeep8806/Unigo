import { supabase } from "./supabase";
import { distanceKm } from "./commerceLocations";
import { shopCategory } from "./commerceRules";
export { stockState, deliverable } from "./commerceRules";

export const SHOP_CATEGORIES = [
  "Grocery",
  "Fruits & Vegetables",
  "Dairy",
  "Bakery",
  "Pharmacy",
  "Electronics",
  "Stationery",
  "Fashion",
  "General Store",
  "Snacks",
  "Beverages",
  "Household",
  "Personal Care",
];
export function newOrderReference() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
async function result(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const { data, error } = await query.abortSignal(controller.signal);
    if (error)
      throw new Error(
        error.code === "42P01" || error.code === "PGRST205"
          ? "Ordering is not configured yet. Nearby map places are still available."
          : error.message,
      );
    return data;
  } finally {
    clearTimeout(timer);
  }
}
export async function nearbyMerchants(type, address) {
  const stores = await result(
    supabase
      .from("commerce_shops")
      .select("*")
      .eq("kind", type)
      .eq("city", "Rajkot"),
  );
  return stores
    .map((s) => ({ ...s, distance: distanceKm(address, s) }))
    .filter((s) => s.distance <= s.delivery_radius)
    .sort((a, b) => a.distance - b.distance);
}
export const productsFor = (id) =>
  result(
    supabase
      .from("commerce_products")
      .select("*")
      .eq("shop_id", id)
      .order("name"),
  );
export const ownedShops = (userId) =>
  result(supabase.from("commerce_shops").select("*").eq("owner_id", userId));
export const ordersForShop = (id) =>
  result(
    supabase
      .from("commerce_orders")
      .select("*")
      .eq("shop_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  );
export const myOrders = (userId) =>
  result(
    supabase
      .from("commerce_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  );
export async function saveProduct(product) {
  const { id, revision, created_at, ...fields } = product;
  const query = id
    ? supabase
        .from("commerce_products")
        .update(fields)
        .eq("id", id)
        .eq("revision", revision)
    : supabase.from("commerce_products").insert(fields);
  const row = await result(query.select().maybeSingle());
  if (!row)
    throw new Error(
      "This product changed while you were editing. Refresh and try again.",
    );
  return row;
}
export const deleteProduct = (id) =>
  result(supabase.from("commerce_products").delete().eq("id", id));
export const adjustStock = (id, delta) =>
  result(supabase.rpc("commerce_adjust_stock", { product_id: id, delta }));
export const placeOrder = (shopId, items, address, requestId) =>
  result(
    supabase.rpc("commerce_place_order", {
      target_shop: shopId,
      items,
      delivery_address: address,
      request_id: requestId,
    }),
  );
export const remoteAddresses = () =>
  result(
    supabase
      .from("commerce_addresses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  );
export const saveRemoteAddress = (userId, address) =>
  result(
    supabase
      .from("commerce_addresses")
      .insert({ user_id: userId, address })
      .select()
      .single(),
  );

// OSM is discovery data, never proof of a merchant partnership or delivery stock.
export async function discoverPlaces(type, address, signal) {
  const filter =
    type === "food"
      ? '["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]'
      : '["shop"]';
  const around = `(around:6000,${address.latitude},${address.longitude})`;
  const query = `[out:json][timeout:10];(nwr${filter}["name"]${around};${type === "shops" ? `nwr["amenity"="pharmacy"]["name"]${around};` : ""});out center 100;`;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error("Nearby map places could not load. Tap Retry.");
    const data = await response.json();
    return (data.elements || [])
      .map((el) => {
        const p = {
          id: `osm-${el.type}-${el.id}`,
          name: el.tags["name:en"] || el.tags.name,
          latitude: el.lat ?? el.center?.lat,
          longitude: el.lon ?? el.center?.lon,
          category:
            type === "shops"
              ? shopCategory(el.tags)
              : (
                  el.tags.cuisine ||
                  el.tags.shop ||
                  el.tags.amenity ||
                  ""
                ).replaceAll("_", " "),
          opening_hours: el.tags.opening_hours,
          discovery: true,
        };
        return { ...p, distance: distanceKm(address, p) };
      })
      .filter((p) => Number.isFinite(p.distance))
      .sort((a, b) => a.distance - b.distance);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
