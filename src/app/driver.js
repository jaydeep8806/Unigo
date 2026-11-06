import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useLocation } from "../context/LocationProvider";
import {
  driverAction,
  driverHistory,
  driverProfile,
  registerDriver,
  watchRides,
} from "../services/drivers";
import { Button, Field, s } from "../components/DriverUI";
import Account from "../components/commerce/Account";

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
  const [step, setStep] = useState(0);
  const [otp, setOtp] = useState("");
  const [account, setAccount] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    category: "bike",
    brand: "",
    model: "",
    registration: "",
  });
  const { requestLocation } = useLocation();
  const lock = useRef(false);
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
        setRides(rows);
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
      if (sending || AppState.currentState !== "active") return;
      sending = true;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted")
          throw new Error("Enable device location to remain available.");
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!disposed)
          await driverAction("presence", {
            online: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
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
    } else await driverAction("presence", { online: false });
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
  const completed = rides.filter((r) => r.status === "completed");
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
            <Text style={s.title}>Hello, {profile.name.split(" ")[0]}.</Text>
            <Text style={s.text}>Your road. Your rhythm.</Text>
            {profile.localPreview && <View style={s.card}><Text style={s.label}>Local preview</Text><Text style={s.text}>This profile is only in this screen. It is not saved to Supabase and cannot receive ride requests. Leaving or reloading this screen clears it.</Text></View>}
            <View style={s.card}>
              <View style={s.row}>
                <View>
                  <Text style={s.label}>
                    {profile.online ? "Online" : "Offline"}
                    {active
                      ? " · On a ride"
                      : profile.online
                        ? " · Available"
                        : ""}
                  </Text>
                  <Text style={s.text}>
                    {profile.category.toUpperCase()} · {profile.registration}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Driver online status"
                  value={profile.online}
                  disabled={busy || !!active || !!profile.localPreview}
                  onValueChange={(value) => run(() => presence(value))}
                />
              </View>
              <Text style={s.text}>
                {profile.brand} {profile.model}
              </Text>
              <Text style={s.text}>
                {profile.localPreview ? "Location sharing is unavailable in this preview." : profile.latitude != null
                  ? `Location: ${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
                  : "Go online to share your current location."}
              </Text>
              <Text style={s.text}>
                {profile.localPreview ? "The availability toggle is disabled in this preview." : "Keep this screen open while available. Location updates pause when the app is in the background."}
              </Text>
            </View>
            {active ? (
              <View style={s.card}>
                <Text style={s.eyebrow}>{labels[active.status]}</Text>
                <Text style={s.label}>{active.details.origin}</Text>
                <Text style={s.text}>↓</Text>
                <Text style={s.label}>{active.details.destination}</Text>
                <Text style={s.title}>₹{active.details.fare}</Text>
                <Text style={s.text}>
                  {active.details.paymentType} · {active.details.distanceKm} km
                </Text>
                {active.status === "requested" && (
                  <>
                    <Text style={s.text}>
                      Respond before{" "}
                      {new Date(active.expires_at).toLocaleTimeString()}.
                    </Text>
                    <Button
                      disabled={busy}
                      title="Accept ride"
                      onPress={() =>
                        run(() => driverAction("accept", { id: active.id }))
                      }
                    />
                    <Button
                      disabled={busy}
                      secondary
                      title="Reject"
                      onPress={() =>
                        run(() => driverAction("reject", { id: active.id }))
                      }
                    />
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
            ) : (
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
            )}
            <View style={s.card}>
              <Text style={s.eyebrow}>RECENT EARNINGS</Text>
              <Text style={s.title}>
                ₹
                {completed
                  .reduce((sum, r) => sum + Number(r.details.fare || 0), 0)
                  .toFixed(2)}
              </Text>
              <Text style={s.text}>
                Gross quoted fares from {completed.length} completed rides in
                your latest 50 rides. Payment collection and payouts are not
                connected.
              </Text>
            </View>
            <Text style={s.label}>Completed rides</Text>
            {!completed.length && (
              <Text style={s.text}>Your completed trips will appear here.</Text>
            )}
            {completed.map((r) => (
              <View key={r.id} style={s.card}>
                <Text style={s.label}>
                  {r.details.destination} · ₹{r.details.fare}
                </Text>
                <Text style={s.text}>
                  {new Date(r.created_at).toLocaleString()} · {r.details.origin}
                </Text>
              </View>
            ))}
            {!profile.localPreview && <Button
              secondary
              title="Driver settings · Location permission"
              onPress={() => run(requestLocation)}
              disabled={busy}
            />}
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
