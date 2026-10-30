import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import LeafletMap from "../LeafletMap";
import {
  RAJKOT,
  inRajkot,
  resolveAddress,
  searchRajkot,
  SERVICE_MESSAGE,
} from "../../services/commerceLocations";
import { Button, Field, Sheet, s } from "./UI";

export default function DeliveryLocation({
  current,
  saved,
  onSelect,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("search");
  const [draft, setDraft] = useState(null);
  const [mapStart] = useState(
    current ? { lat: current.latitude, lng: current.longitude } : RAJKOT,
  );
  const pin = useRef(mapStart);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) return;
      try {
        const found = await searchRajkot(query, controller.signal);
        if (!controller.signal.aborted) {
          setResults(found);
          setError("");
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  async function resolve(lat, lng) {
    setBusy(true);
    setError("");
    try {
      setDraft(await resolveAddress(lat, lng));
      setMode("confirm");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function locate() {
    setBusy(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error(
          "Location permission was denied. You can search or choose on map.",
        );
      if (!(await Location.hasServicesEnabledAsync()))
        throw new Error(
          "Turn on device location, or search for your address below.",
        );
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setDraft(
        await resolveAddress(
          position.coords.latitude,
          position.coords.longitude,
        ),
      );
      setMode("confirm");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!inRajkot(draft)) {
      setError(SERVICE_MESSAGE);
      return;
    }
    if (!draft.addressLine.trim()) {
      setError("Enter a complete delivery address.");
      return;
    }
    setBusy(true);
    try {
      await onSelect(draft);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet title="Delivery location" onClose={onClose}>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      {mode === "map" ? (
        <>
          <View style={{ flex: 1 }}>
            <LeafletMap
              center={mapStart}
              pickerMode
              zoom={16}
              onCenterChange={(p) => {
                pin.current = p;
              }}
              onDraggingChange={setDragging}
            />
          </View>
          <View style={s.footer}>
            <Text style={s.muted}>
              Move the map to place the pin at your entrance.
            </Text>
            <Button
              title={busy ? "Finding address…" : "Confirm this location"}
              disabled={busy || dragging}
              onPress={() => resolve(pin.current.lat, pin.current.lng)}
            />
            <Button
              secondary
              title="Back to search"
              onPress={() => setMode("search")}
            />
          </View>
        </>
      ) : mode === "confirm" ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16 }}
        >
          <Text style={s.title}>{draft.area}</Text>
          <Text style={s.muted}>Rajkot service area · Exact pin saved</Text>
          <Field
            label="House / flat / full delivery address"
            value={draft.addressLine}
            multiline
            onChangeText={(addressLine) => setDraft({ ...draft, addressLine })}
          />
          <Field
            label="Landmark (optional)"
            value={draft.landmark}
            onChangeText={(landmark) => setDraft({ ...draft, landmark })}
          />
          <View style={s.row}>
            {["Home", "Work", "College", "Other"].map((label) => (
              <Button
                key={label}
                secondary={draft.label !== label}
                title={label}
                onPress={() => setDraft({ ...draft, label })}
              />
            ))}
          </View>
          <View style={{ height: 20 }} />
          <Button
            title={busy ? "Saving…" : "Save & use this address"}
            onPress={confirm}
            disabled={busy}
          />
          <Button
            secondary
            title="Choose another location"
            onPress={() => setMode("search")}
          />
        </ScrollView>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 12 }}
        >
          <Text style={s.muted}>Rajkot and nearby service areas</Text>
          <Field
            placeholder="Search for area, street or landmark"
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setResults([]);
              setSearching(value.trim().length >= 2);
            }}
            autoFocus
          />
          <Button
            title="Use Current Location"
            disabled={busy}
            onPress={locate}
          />
          <Button
            secondary
            title="Choose on Map"
            onPress={() => {
              setError("");
              setMode("map");
            }}
          />
          {(searching || busy) && <ActivityIndicator color="#0F7A56" />}
          {results.map((a, i) => (
            <TouchableOpacity
              key={`${a.latitude}-${a.longitude}-${i}`}
              style={s.card}
              onPress={() => {
                setDraft(a);
                setMode("confirm");
              }}
            >
              <Text style={s.text}>{a.area}</Text>
              <Text style={s.muted}>{a.addressLine}</Text>
            </TouchableOpacity>
          ))}
          {query.length >= 2 && !searching && results.length === 0 && (
            <Text style={s.muted}>
              No matching mapped addresses. Try a nearby landmark or choose your
              exact point on the map.
            </Text>
          )}
          {!query &&
            saved.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={s.card}
                onPress={() => {
                  setDraft(a);
                  setMode("confirm");
                }}
              >
                <Text style={s.text}>
                  {a.label} · {a.area}
                </Text>
                <Text style={s.muted}>{a.addressLine}</Text>
              </TouchableOpacity>
            ))}
          <Text style={s.muted}>
            Address search: © OpenStreetMap contributors / Photon
          </Text>
        </ScrollView>
      )}
    </Sheet>
  );
}
