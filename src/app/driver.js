import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocation } from "../context/LocationProvider";
import {
  driverAction,
  driverHistory,
  driverTodayHistory,
  driverProfile,
  registerDriver,
  watchRides,
} from "../services/drivers";
import { Button, Field, s } from "../components/DriverUI";
import { distanceKm } from "../services/commerceLocations";
import Account from "../components/commerce/Account";
import LeafletMap from "../components/LeafletMap";

const COMMISSION_RATE = 0.10;

const stages = [
  "Personal details",
  "Choose your vehicle",
  "Vehicle information",
  "Review and continue",
];
const labels = {
  requested: "Ride request received",
  assigned: "Ride accepted · Arriving at pickup",
  arrived: "At pickup",
  in_progress: "Ride started",
  completed: "Ride completed",
};
export default function Driver() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rides, setRides] = useState([]);
  const [todayRides, setTodayRides] = useState([]);
  const [step, setStep] = useState(0);
  const [otp, setOtp] = useState("");
  const [account, setAccount] = useState(false);
  const [screen, setScreen] = useState("home");
  const [selectedRide, setSelectedRide] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exampleState, setExampleState] = useState("available");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    category: "bike",
    brand: "",
    model: "",
    registration: "",
  });
  const { requestLocation, selectedCity, coordinates } = useLocation();
  const lock = useRef(false);
  const goingOffline = useRef(false);
  const heartbeatInFlight = useRef(null);
  const resumeRegistration = useRef(false);
  const active = rides.find((r) =>
    ["requested", "assigned", "arrived", "in_progress"].includes(r.status),
  );
  const refresh = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    try {
      const p = await driverProfile();
      setProfile(p);
      if (p) {
        let rows = await driverHistory(p.id);
        for (const row of rows.filter((r) => r.status === "requested"))
          await driverAction("sync", { id: row.id });
        rows = await driverHistory(p.id);
        const today = await driverTodayHistory(p.id);
        setRides(rows);
        setTodayRides(today);
      }
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(
    () =>
      profile?.id && !profile.localPreview
        ? watchRides(`driver_id=eq.${profile.id}`, refresh)
        : undefined,
    [profile?.id, profile?.localPreview, refresh],
  );
  // Foreground-only location: a short heartbeat lease excludes suspended/disconnected drivers.
  useEffect(() => {
    if (!profile?.online || profile.localPreview) return undefined;
    let disposed = false;
    let sending = false;
    const heartbeat = async () => {
      if (sending || goingOffline.current || AppState.currentState !== "active") return;
      sending = true;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted")
          throw new Error("Enable device location to remain available.");
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!disposed && !goingOffline.current) {
          const request = driverAction("presence", {
            online: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          heartbeatInFlight.current = request;
          try { await request; } finally { heartbeatInFlight.current = null; }
        }
      } catch (e) {
        if (!disposed) setError(e.message);
      } finally {
        sending = false;
      }
    };
    heartbeat();
    const timer = setInterval(heartbeat, 20000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [profile?.online, profile?.localPreview]);
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submitRegistration(afterSignIn = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const existing = afterSignIn ? await driverProfile() : null;
      const saved = existing || await registerDriver(form);
      setProfile(saved);
      setRides([]);
      setTodayRides([]);
    } catch (e) {
      if (e.code === "AUTH_REQUIRED") {
        resumeRegistration.current = true;
        setAccount(true);
      } else {
        setError(e.message || "Registration could not be saved. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }
  async function presence(online) {
    if (online) {
      goingOffline.current = false;
      const permission = await requestLocation();
      if (!permission.granted || permission.permission !== "granted")
        throw new Error("Allow device location to receive nearby requests.");
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await driverAction("presence", {
        online,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } else {
      goingOffline.current = true;
      try {
        if (heartbeatInFlight.current) await heartbeatInFlight.current.catch(() => {});
        await driverAction("presence", { online: false });
      } catch (e) {
        goingOffline.current = false;
        throw e;
      }
    }
  }
  function next() {
    if (
      step === 0 &&
      (form.name.trim().length < 2 || !/^[6-9]\d{9}$/.test(form.phone))
    ) {
      setError("Enter your full name and a valid 10-digit mobile number.");
      return;
    }
    if (
      step === 2 &&
      (!form.brand.trim() ||
        !form.model.trim() ||
        !/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(
          form.registration.replace(/[^A-Z0-9]/g, ""),
        ))
    ) {
      setError(
        "Enter the brand, model and a valid registration, such as GJ03AB1234.",
      );
      return;
    }
    setError("");
    setStep(step + 1);
  }
  const field = (key, label, props = {}) => (
    <Field
      label={label}
      value={form[key]}
      onChangeText={(value) =>
        setForm((f) => ({
          ...f,
          [key]: key === "registration" ? value.toUpperCase() : value,
        }))
      }
      {...props}
    />
  );
  const pickup = active?.details?.pickupCoords;
  const drop = active?.details?.destinationCoords;
  const mapPoint = coordinates || (profile?.latitude != null && profile?.longitude != null ? { latitude: profile.latitude, longitude: profile.longitude } : { latitude: selectedCity.lat, longitude: selectedCity.lng });
  const mapMarkers = [
    { lat: mapPoint.latitude, lng: mapPoint.longitude, label: "Your location", color: "#0f7a56" },
    ...(pickup ? [{ lat: pickup.latitude, lng: pickup.longitude, label: "Pickup", color: "#2563eb" }] : []),
    ...(drop ? [{ lat: drop.latitude, lng: drop.longitude, label: "Drop", color: "#dc2626" }] : []),
  ];
  const pickupDistance = profile?.latitude != null && profile?.longitude != null && pickup?.latitude != null && pickup?.longitude != null
    ? distanceKm(profile, pickup) : null;
  const completed = rides.filter((r) => r.status === "completed");
  const history = rides.filter((r) => ["completed", "cancelled"].includes(r.status));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const total = completed.filter((ride) => { const date = new Date(ride.updated_at); return date >= day && date < next; }).reduce((sum, ride) => sum + (Number(ride.details?.fare) || 0), 0);
    return { label: day.toLocaleDateString(undefined, { weekday: "short" }), total };
  });
  const maxDayFare = Math.max(1, ...days.map((day) => day.total));
  const todayFare = todayRides.reduce((sum, ride) => sum + (Number(ride.details?.fare) || 0), 0);
  const todayDriverShare = todayRides.reduce((sum, ride) => {
    const fare = Number(ride.details?.fare) || 0;
    return sum + fare - Math.round(fare * COMMISSION_RATE * 100) / 100;
  }, 0);
  const quotedFare = Number(active?.details?.fare) || 0;
  const commission = Math.round(quotedFare * COMMISSION_RATE * 100) / 100;
  return (
    <SafeAreaView style={s.screen}>
      {account && (
        <Account
          accountName="UNIGO"
          onClose={() => {
            setAccount(false);
            if (resumeRegistration.current) setError("Sign in to finish registration. Your vehicle details are still here.");
            resumeRegistration.current = false;
          }}
          onSignedIn={() => {
            setAccount(false);
            if (resumeRegistration.current) {
              resumeRegistration.current = false;
              submitRegistration(true);
            } else refresh();
          }}
        />
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } }} />}
        contentContainerStyle={s.content}
      >
        <View style={s.row}>
          <Text style={s.eyebrow}>UNIGO DRIVER</Text>
          <Button
            secondary
            title="Switch role"
            disabled={busy || !!active}
            onPress={() =>
              run(async () => {
                if (profile?.online) await presence(false);
                router.push("/role-selection");
              })
            }
          />
        </View>
        {loading ? (
          <ActivityIndicator color="#0f7a56" />
        ) : !profile ? (
          <>
            <Text style={s.title}>Your next chapter starts here.</Text>
            <Text style={s.text}>
              Join the UNIGO driver community with your own vehicle.
            </Text>
            <Button
              secondary
              title="Already registered? Sign in"
              onPress={() => setAccount(true)}
            />
            <View style={s.row}>
              {stages.map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 4,
                    backgroundColor: i <= step ? "#0f7a56" : "#dce8df",
                  }}
                />
              ))}
            </View>
            <Text style={s.label}>
              Step {step + 1} of 4 · {stages[step]}
            </Text>
            {step === 0 && (
              <>
                {field("name", "Full name", { maxLength: 80 })}
                {field("phone", "Mobile number", {
                  keyboardType: "phone-pad",
                  maxLength: 10,
                })}
                <Text style={s.text}>
                  Your profile is linked to this signed-in account or persistent
                  device session.
                </Text>
              </>
            )}
            {step === 1 &&
              [
                ["bike", "Two Wheeler · Bike / Scooter"],
                ["car", "Four Wheeler · Car / Cab"],
                ["auto", "Auto Rickshaw"],
              ].map(([category, title]) => (
                <Button
                  key={category}
                  secondary={
                    form.category !== category &&
                    !(category === "car" && form.category === "sedan")
                  }
                  title={title}
                  onPress={() => setForm((f) => ({ ...f, category }))}
                />
              ))}
            {step === 2 && (
              <>
                {field("brand", "Vehicle brand", { maxLength: 60 })}
                {field("model", "Vehicle model", { maxLength: 60 })}
                {field("registration", "Vehicle registration number", {
                  autoCapitalize: "characters",
                  maxLength: 15,
                })}
                {["car", "sedan"].includes(form.category) && (
                  <>
                    <Text style={s.label}>Vehicle category</Text>
                    {["car", "sedan"].map((category) => (
                      <Button
                        key={category}
                        title={category === "car" ? "Mini / Compact" : "Sedan"}
                        secondary={form.category !== category}
                        onPress={() => setForm((f) => ({ ...f, category }))}
                      />
                    ))}
                  </>
                )}
              </>
            )}
            {step === 3 && (
              <View style={s.card}>
                <Text style={s.label}>{form.name}</Text>
                <Text style={s.text}>{form.phone}</Text>
                <Text style={s.label}>
                  {form.brand} {form.model}
                </Text>
                <Text style={s.text}>
                  {form.category.toUpperCase()} · {form.registration}
                </Text>
                <Text style={s.text}>
                  You will start offline. Go online when you are ready to
                  receive requests.
                </Text>
              </View>
            )}
            <Button
              title={
                busy
                  ? "Saving…"
                  : step === 3
                    ? "Register and continue"
                    : "Continue"
              }
              disabled={busy}
              onPress={() =>
                step === 3 ? submitRegistration() : next()
              }
            />
            {__DEV__ && step === 3 && (
              <Button
                secondary
                title="Preview driver dashboard"
                disabled={busy}
                onPress={() => {
                  setError("");
                  setRides([]);
                  setProfile({ ...form, id: "local-preview", localPreview: true, online: false });
                }}
              />
            )}
            {step > 0 && (
              <Button
                secondary
                title="Back"
                disabled={busy}
                onPress={() => setStep(step - 1)}
              />
            )}
          </>
        ) : (
          <>
            <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 18, padding: 5, gap: 2 }}>
              {[["home", "home-outline", "Home"], ["earnings", "wallet-outline", "Earnings"], ["rides", "time-outline", "Rides"], ["profile", "person-outline", "Profile"]].map(([key, icon, title]) => (
                <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: screen === key }} onPress={() => setScreen(key)} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 14, backgroundColor: screen === key ? "#e4f2e9" : "transparent" }}>
                  <Ionicons name={icon} size={20} color={screen === key ? "#0f7a56" : "#74877d"} />
                  <Text style={{ color: screen === key ? "#0f7a56" : "#74877d", fontSize: 11, fontWeight: "700" }}>{title}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {screen === "home" && <View style={{ backgroundColor: profile.online ? "#0b7453" : "#143b2e", borderRadius: 26, padding: 22, gap: 16 }}>
              <View style={s.row}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: "#b9dfcc", fontWeight: "800", fontSize: 11, letterSpacing: 1.3 }}>DRIVER DASHBOARD</Text>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 25 }}>Hello, {profile.name.split(" ")[0]}</Text>
                </View>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff25" }}><Ionicons name="person" size={24} color="#fff" /></View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: profile.online ? "#a8ef86" : "#f5c776" }} />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>{active ? "On a ride" : profile.online ? "You are online" : "You are offline"}</Text>
              </View>
              <Text style={{ color: "#d6e9de", lineHeight: 21 }}>{profile.localPreview ? "Preview only. Ride requests are unavailable." : active ? "Finish your current ride before going offline." : profile.online ? "You can receive compatible nearby ride requests." : "Go online when you are ready to receive ride requests."}</Text>
              <Button title={busy ? "Updating…" : profile.online ? "Go Offline" : "Go Online"} secondary disabled={busy || !!active || !!profile.localPreview} onPress={() => run(() => presence(!profile.online))} />
            </View>}
            {screen === "home" && <View style={{ height: 270, borderRadius: 22, overflow: "hidden", backgroundColor: "#e3eee8" }}><LeafletMap center={{ lat: mapPoint.latitude, lng: mapPoint.longitude }} markers={mapMarkers} route={active?.details?.routeCoords || []} /></View>}
            {profile.localPreview && <View style={s.card}><Text style={s.label}>Local preview</Text><Text style={s.text}>This profile is not saved and cannot receive requests.</Text></View>}
            {screen === "profile" && <>
            <Text style={s.title}>Driver profile</Text>
            <View style={s.card}><Text style={s.label}>{profile.name}</Text><Text style={s.text}>{profile.phone}</Text></View>
            <View style={[s.card, { flexDirection: "row", alignItems: "center" }]}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#e4f2e9", alignItems: "center", justifyContent: "center" }}><Ionicons name={profile.category === "bike" ? "bicycle-outline" : "car-outline"} size={25} color="#0f7a56" /></View>
              <View style={{ flex: 1 }}><Text style={s.label}>{profile.brand} {profile.model}</Text><Text style={s.text}>{profile.category.toUpperCase()} · {profile.registration}</Text></View>
            </View>
            {!profile.localPreview && <Button secondary title="Location permission" onPress={() => run(requestLocation)} disabled={busy} />}
            </>}
            {screen === "home" && !profile.localPreview && <Text style={s.text}>Keep this screen open while online. Location updates pause when the app is in the background.</Text>}
            {active ? (
              <View style={[s.card, { borderWidth: 2, borderColor: "#35ad6b", gap: 15 }]}>
                <View style={s.row}>
                  <Text style={s.eyebrow}>{labels[active.status]}</Text>
                  {active.status === "requested" && <Text style={{ color: "#0f7a56", fontWeight: "800", fontSize: 12 }}>1 REQUEST</Text>}
                </View>
                <View><Text style={{ color: "#63766c", fontSize: 12, fontWeight: "700" }}>RIDER&#39;S QUOTED FARE</Text><Text style={[s.title, { fontSize: 36 }]}>₹{active.details.fare}</Text></View>
                <View style={{ backgroundColor: "#f2f8f4", padding: 14, borderRadius: 14, gap: 7 }}>
                  <View style={s.row}><Text style={s.text}>UniGo commission (10%)</Text><Text style={s.label}>− ₹{commission.toFixed(2)}</Text></View>
                  <View style={s.row}><Text style={s.label}>Estimated driver share</Text><Text style={s.label}>₹{(quotedFare - commission).toFixed(2)}</Text></View>
                  <Text style={{ color: "#63766c", fontSize: 12, lineHeight: 18 }}>Estimate only. Payments and payouts are not connected.</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <Ionicons name="radio-button-on" size={20} color="#0f7a56" />
                  <View style={{ flex: 1, gap: 4 }}><Text style={s.label}>Pickup {pickupDistance == null ? "" : "· " + pickupDistance.toFixed(1) + " km away (straight line)"}</Text><Text style={s.text}>{active.details.origin}</Text></View>
                </View>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <Ionicons name="location" size={20} color="#db7048" />
                  <View style={{ flex: 1, gap: 4 }}><Text style={s.label}>Drop · {active.details.distanceKm} km trip</Text><Text style={s.text}>{active.details.destination}</Text></View>
                </View>
                <Text style={s.text}>Payment: {active.details.paymentType}</Text>
                {active.status === "requested" && (
                  <>
                    <Text style={s.text}>
                      Respond before{" "}
                      {new Date(active.expires_at).toLocaleTimeString()}.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reject ride" disabled={busy} onPress={() => run(() => driverAction("reject", { id: active.id }))} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "#bcc8c1", alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1 }}><Ionicons name="close" size={26} color="#283b32" /></TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => run(() => driverAction("accept", { id: active.id }))} style={{ flex: 1, minHeight: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#ffcf28", opacity: busy ? 0.5 : 1 }}><Text style={{ color: "#19251e", fontWeight: "800", fontSize: 16 }}>Accept</Text></TouchableOpacity>
                    </View>
                  </>
                )}
                {active.status === "assigned" && (
                  <>
                    <Button
                      secondary
                      title="Navigate to pickup"
                      onPress={() =>
                        run(() =>
                          Linking.openURL(
                            `https://www.google.com/maps/dir/?api=1&destination=${active.details.pickupCoords.latitude},${active.details.pickupCoords.longitude}`,
                          ),
                        )
                      }
                    />
                    <Button
                      disabled={busy}
                      title="I've arrived at pickup"
                      onPress={() =>
                        run(() => driverAction("arrive", { id: active.id }))
                      }
                    />
                  </>
                )}
                {active.status === "arrived" && (
                  <>
                    <Field
                      label="Rider's start code"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                    <Button
                      disabled={busy || otp.length !== 4}
                      title="Start ride"
                      onPress={() =>
                        run(() => driverAction("start", { id: active.id, otp }))
                      }
                    />
                  </>
                )}
                {active.status === "in_progress" && (
                  <Button
                    disabled={busy}
                    title="Complete ride"
                    onPress={() =>
                      run(() => driverAction("complete", { id: active.id }))
                    }
                  />
                )}
              </View>
            ) : screen === "home" ? (
              <View style={s.card}>
                <Text style={s.label}>
                  {profile.localPreview ? "Preview your dashboard" : profile.online
                    ? "Ready for your next pickup"
                    : "Take the wheel when you’re ready"}
                </Text>
                <Text style={s.text}>
                  {profile.localPreview ? "Ride requests are not connected to this preview." : profile.online
                    ? "Compatible nearby ride requests appear here."
                    : "Go online to receive ride requests."}
                </Text>
              </View>
            ) : null}
            {screen === "rides" && !active && exampleState !== "hidden" && <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, gap: 15, borderWidth: 3, borderColor: "#35ad6b" }}>
              <View style={s.row}><Text style={{ color: "#24362d", fontWeight: "800", fontSize: 15 }}>Example request</Text><Text style={{ color: "#667d70", fontSize: 11 }}>No real ride</Text></View>
              <Text style={{ color: "#15261d", fontSize: 34, fontWeight: "800" }}>₹240</Text>
              <Text style={{ color: "#63766c", fontSize: 13 }}>10% commission ₹24 · Estimated driver share ₹216</Text>
              <View style={{ flexDirection: "row", gap: 12 }}><Ionicons name="radio-button-on" size={20} color="#172b20" /><View style={{ flex: 1, gap: 4 }}><Text style={s.label}>0.8 km to pickup</Text><Text style={s.text}>Kalawad Road, Rajkot</Text></View></View>
              <View style={{ flexDirection: "row", gap: 12 }}><Ionicons name="location" size={20} color="#172b20" /><View style={{ flex: 1, gap: 4 }}><Text style={s.label}>14 km trip</Text><Text style={s.text}>Race Course Road, Rajkot</Text></View></View>
              {exampleState === "accepted" ? <Text style={s.text}>Example accepted. No rider was contacted and no ride was created.</Text> : <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dismiss example request" onPress={() => setExampleState("hidden")} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "#bcc8c1", alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={26} color="#283b32" /></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => setExampleState("accepted")} style={{ flex: 1, minHeight: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#ffcf28" }}><Text style={{ color: "#19251e", fontWeight: "800", fontSize: 16 }}>Accept example</Text></TouchableOpacity>
              </View>}
            </View>}
            {(screen === "home" || screen === "earnings") && <>
            {screen === "earnings" && <Text style={s.title}>Earnings</Text>}
            <View style={[s.card, { padding: 20, gap: 16 }]}>
              <View style={s.row}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.eyebrow}>TODAY&#39;S ACTIVITY</Text>
                  <Text style={s.text}>Your completed rides today</Text>
                </View>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#e4f2e9", alignItems: "center", justifyContent: "center" }}><Ionicons name="today-outline" size={21} color="#0f7a56" /></View>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: "#f2f8f4", borderRadius: 16, padding: 15, gap: 5 }}>
                  <Text style={{ color: "#60796c", fontSize: 12, fontWeight: "700" }}>COMPLETED RIDES</Text>
                  <Text style={{ color: "#123d2c", fontWeight: "800", fontSize: 27 }}>{todayRides.length}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "#f2f8f4", borderRadius: 16, padding: 15, gap: 5 }}>
                  <Text style={{ color: "#60796c", fontSize: 12, fontWeight: "700" }}>EST. DRIVER SHARE</Text>
                  <Text style={{ color: "#123d2c", fontWeight: "800", fontSize: 27 }}>₹{todayDriverShare.toFixed(2)}</Text>
                </View>
              </View>
              <Text style={{ color: "#63766c", fontSize: 12, lineHeight: 18 }}>Based on today’s completed rides and the current 10% commission rate. Quoted fares: ₹{todayFare.toFixed(2)}. Estimates only; payments and payouts are not connected.</Text>
            </View>
            {screen === "earnings" && <View style={s.card}>
              <Text style={s.label}>Last 7 days</Text>
              <Text style={s.text}>Gross quoted fares from your latest 50 rides</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 125, gap: 5 }}>
                {days.map((day, index) => <View key={index} style={{ flex: 1, alignItems: "center", gap: 4 }}><Text style={{ color: "#63766c", fontSize: 10 }}>₹{day.total.toFixed(0)}</Text><View style={{ width: "75%", height: Math.max(3, (day.total / maxDayFare) * 80), borderRadius: 5, backgroundColor: "#0f7a56" }} /><Text style={{ color: "#63766c", fontSize: 11 }}>{day.label}</Text></View>)}
              </View>
              <Text style={s.text}>Last 7 days: ₹{days.reduce((sum, day) => sum + day.total, 0).toFixed(2)} · Completed trips in latest 50: {completed.length}</Text>
            </View>}
            </>}
            {screen === "rides" && <>
            <Text style={s.title}>Ride history</Text>
            <Text style={s.text}>Showing your latest 50 rides.</Text>
            {!history.length && <Text style={s.text}>No trips yet.</Text>}
            {history.map((r) => (
              <TouchableOpacity key={r.id} accessibilityRole="button" onPress={() => setSelectedRide(selectedRide === r.id ? null : r.id)} style={s.card}>
                <View style={s.row}><Text style={[s.label, { flex: 1 }]}>{r.details.destination}</Text><Text style={s.label}>₹{r.details.fare}</Text></View>
                <Text style={s.text}>{r.status === "completed" ? "Completed" : "Cancelled"} · {new Date(r.created_at).toLocaleString()}</Text>
                {selectedRide === r.id && <><Text style={s.text}>Pickup: {r.details.origin}</Text><Text style={s.text}>Drop: {r.details.destination}</Text><Text style={s.text}>Distance: {r.details.distanceKm} km · Payment: {r.details.paymentType}</Text></>}
              </TouchableOpacity>
            ))}
            </>}
          </>
        )}
        {!!error && (
          <View style={s.card}>
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
            <Button
              secondary
              title="Retry connection"
              onPress={refresh}
              disabled={busy}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
