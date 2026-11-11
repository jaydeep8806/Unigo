import { supabase } from "../lib/supabase";

export const simulationEnabled =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_RIDE_SIMULATION === "true";
let identityRequest;
export async function rideIdentity() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session.user;
  if (!identityRequest)
    identityRequest = supabase.auth
      .signInAnonymously()
      .then((result) => {
        if (result.error) {
          const error = new Error("Sign in or create an account to save your driver registration.");
          error.code = "AUTH_REQUIRED";
          throw error;
        }
        return result.data.user;
      })
      .finally(() => {
        identityRequest = null;
      });
  return identityRequest;
}
export async function driverAction(action, payload = {}) {
  await rideIdentity();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let result;
  try {
    result = await supabase.rpc("driver_action", { action, payload }).abortSignal(controller.signal);
  } finally {
    clearTimeout(timer);
  }
  const { data, error } = result;
  if (controller.signal.aborted)
    throw new Error("Could not confirm the save. Check your connection and tap Retry connection before registering again.");
  if (error && ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code))
    throw new Error("Driver registration is not available on the server yet. Please contact support to finish setup.");
  if (error)
    throw new Error(
      error.code === "23505"
        ? "This vehicle or account is already registered, or has an active ride."
        : error.message,
    );
  return data;
}
// The RPC inserts into public.drivers and returns the committed database row.
// Never advance onboarding using only the submitted form or a local profile.
export async function registerDriver(form) {
  const saved = await driverAction("register", {
    name: form.name.trim(),
    phone: form.phone.trim(),
    category: form.category,
    brand: form.brand.trim(),
    model: form.model.trim(),
    registration: form.registration.toUpperCase().replace(/[^A-Z0-9]/g, ""),
  });
  if (!saved?.id || !saved.owner_id || saved.source !== "registered")
    throw new Error("Could not confirm your driver profile was saved. Tap Retry connection to check before registering again.");
  return saved;
}
export async function driverProfile() {
  // Reading onboarding state must not attempt anonymous sign-in on every refresh.
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const user = auth.session?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function driverHistory(id) {
  const { data, error } = await supabase
    .from("driver_rides")
    .select("*")
    .eq("driver_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
export async function driverTodayHistory(id) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("driver_rides")
    .select("id, details, updated_at")
    .eq("driver_id", id)
    .eq("status", "completed")
    .gte("updated_at", start.toISOString())
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}
export function watchRides(filter, refresh) {
  const channel = supabase
    .channel(`rides-${filter}-${Math.random()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "driver_rides", filter },
      refresh,
    )
    .subscribe();
  const timer = setInterval(refresh, 5000);
  return () => {
    clearInterval(timer);
    supabase.removeChannel(channel);
  };
}
export function asActivity(row) {
  return {
    ...row.details,
    id: row.id,
    backend: true,
    status: row.status,
    driver: row.driver,
    otp: row.otp,
    simulated: row.simulated,
    createdAt: row.created_at,
  };
}
