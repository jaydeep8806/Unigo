import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import LeafletMap from "../LeafletMap";
import { supabase } from "../../services/supabase";
import {
  discoverPlaces,
  myOrders,
  nearbyMerchants,
  remoteAddresses,
  saveRemoteAddress,
  SHOP_CATEGORIES,
} from "../../services/commerce";
import { inRajkot, RAJKOT } from "../../services/commerceLocations";
import DeliveryLocation from "./DeliveryLocation";
import Storefront from "./Storefront";
import Inventory from "./Inventory";
import Account from "./Account";
import { Button, Field, Sheet, s } from "./UI";

const KEY = "@unigo_food_shop_addresses_v1";
export default function NearbyCommerce() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = params.type === "shops" ? "shops" : "food";
  const [startInShops] = useState(type === "shops");
  const [address, setAddress] = useState(null);
  const [saved, setSaved] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [store, setStore] = useState(null);
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [orders, setOrders] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!live) return;
        const data = raw ? JSON.parse(raw) : {};
        const valid = (Array.isArray(data.saved) ? data.saved : []).filter(
          inRajkot,
        );
        setSaved(valid);
        setAddress(inRajkot(data.current) ? data.current : null);
        setSelecting(startInShops || !inRajkot(data.current));
      })
      .catch(() => {
        if (live) setSelecting(true);
      })
      .finally(() => {
        if (live) setReady(true);
      });
    supabase.auth.getSession().then(({ data }) => {
      if (live) setUser(data.session?.user || null);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (live) setUser(session?.user || null);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, [startInShops]);
  useEffect(() => {
    if (!user) return;
    let live = true;
    remoteAddresses()
      .then((rows) => {
        if (live && rows.length)
          setSaved(rows.map((r) => r.address).filter(inRajkot));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user]);
  useEffect(() => {
    if (!address) return;
    let live = true;
    const controller = new AbortController();
    // Begin a cancellable external request; cleanup prevents stale location results.
    const load = async () => {
      await Promise.resolve();
      if (!live) return;
      setLoading(true);
      setPlaces([]);
      setError("");
      setNotice("");
      Promise.allSettled([
        nearbyMerchants(type, address),
        discoverPlaces(type, address, controller.signal),
      ]).then(([registered, discovery]) => {
        if (!live) return;
        const merchants =
          registered.status === "fulfilled" ? registered.value : [];
        const mapPlaces =
          discovery.status === "fulfilled"
            ? discovery.value.filter(
                (p) =>
                  !merchants.some(
                    (m) => m.name.toLowerCase() === p.name.toLowerCase(),
                  ),
              )
            : [];
        setPlaces([...merchants, ...mapPlaces]);
        if (registered.status === "rejected")
          setNotice(
            "Ordering is unavailable right now. Map listings below are for discovery only.",
          );
        if (discovery.status === "rejected")
          setError(
            "Nearby map places could not load. Check your connection and retry.",
          );
        setLoading(false);
      });
    };
    load();
    return () => {
      live = false;
      controller.abort();
    };
  }, [address, type, refresh]);
  async function select(a) {
    const next = [
      a,
      ...saved.filter(
        (p) =>
          !(
            p.label === a.label &&
            p.latitude === a.latitude &&
            p.longitude === a.longitude
          ),
      ),
    ].slice(0, 20);
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ current: a, saved: next }),
    );
    setAddress(a);
    setSaved(next);
    setSelecting(false);
    setStore(null);
    if (user)
      saveRemoteAddress(user.id, a).catch(() =>
        setNotice(
          "Address saved on this device. Cloud sync failed; please try again later.",
        ),
      );
  }
  const openPlace = useCallback((p) => {
    setSelectedId(p.id);
    if (p.discovery)
      setNotice(
        `${p.name}: mapped nearby, but not registered for UniGoMoto ordering. Opening hours: ${p.opening_hours || "not supplied"}.`,
      );
    else setStore(p);
  }, []);
  async function viewOrders() {
    if (!user) {
      setLogin(true);
      return;
    }
    try {
      setOrders(await myOrders(user.id));
    } catch (e) {
      setNotice(e.message);
    }
  }
  const visible = places.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (category === "All" ||
        (p.category || "").toLowerCase().includes(category.toLowerCase()) ||
        (category === "Grocery" &&
          ["supermarket", "convenience"].includes(p.category))),
  );
  const center = address
    ? { lat: address.latitude, lng: address.longitude }
    : RAJKOT;
  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <TouchableOpacity
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ padding: 8 }}
        >
          <Text style={s.title}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>
            {type === "food" ? "Food & Cafes Near You" : "Shops & Supermarkets"}
          </Text>
          <TouchableOpacity onPress={() => setSelecting(true)}>
            <Text style={{ color: "#0F7A56", fontWeight: "700", marginTop: 5 }}>
              {address
                ? `${address.label} · ${address.area}  ▾`
                : "Select delivery location  ▾"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
        <View style={s.row}>
          <Button
            title="Food"
            secondary={type !== "food"}
            onPress={() => {
              setCategory("All");
              router.setParams({ type: "food" });
            }}
          />
          <Button
            title="Shops"
            secondary={type !== "shops"}
            onPress={() => {
              setCategory("All");
              router.setParams({ type: "shops" });
              if (type !== "shops") setSelecting(true);
            }}
          />
          <Button secondary title="My orders" onPress={viewOrders} />
        </View>
      </View>
      <View style={{ height: "24%", minHeight: 120 }}>
        <LeafletMap
          key={address ? `${address.latitude}-${address.longitude}` : "rajkot"}
          center={center}
          zoom={type === "shops" ? 12 : 14}
          markers={visible.map((p) => ({
            id: p.id,
            lat: p.latitude,
            lng: p.longitude,
            label: p.name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
            color: p.id === selectedId ? "#DC2626" : "#0F7A56",
          }))}
          onMarkerPress={(marker) => {
            const p = places.find((item) => item.id === marker.id);
            if (p) openPlace(p);
          }}
        />
        <Text
          style={{
            position: "absolute",
            bottom: 4,
            right: 8,
            fontSize: 10,
            backgroundColor: "#FFFFFFDD",
            color: "#334155",
          }}
        >
          © OpenStreetMap contributors
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          backgroundColor: "#F4F7F5",
          paddingHorizontal: 14,
          paddingTop: 10,
        }}
      >
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <>
              <Text style={s.title}>
                {type === "food" ? "Places to eat" : "Nearby stores"}{" "}
                {address ? `(${visible.length})` : ""}
              </Text>
              <Text style={s.muted}>
                {type === "shops"
                  ? "Delivery partners first · Map discoveries across Rajkot"
                  : "Delivery partners first · Map discoveries within 6 km"}
              </Text>
              <Field
                placeholder={
                  type === "food" ? "Search restaurants" : "Search stores"
                }
                value={query}
                onChangeText={setQuery}
              />
              {type === "shops" && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 12 }}
                >
                  {["All", ...SHOP_CATEGORIES].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        s.chip,
                        category === c && { backgroundColor: "#BDDCC9" },
                      ]}
                      onPress={() => setCategory(c)}
                    >
                      <Text style={s.text}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {notice ? (
                <Text style={[s.muted, { marginBottom: 12 }]}>{notice}</Text>
              ) : null}
              {error ? <Text style={s.error}>{error}</Text> : null}
              {loading && (
                <ActivityIndicator color="#0F7A56" style={{ padding: 20 }} />
              )}
            </>
          }
          renderItem={({ item }) => (
            <View
              style={[
                s.card,
                selectedId === item.id && { borderColor: "#0F7A56" },
              ]}
            >
              <View style={s.row}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 64, height: 64, borderRadius: 12 }}
                    accessibilityLabel={item.name}
                  />
                ) : (
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      backgroundColor: "#E6F4EA",
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>
                      {type === "food" ? "🍽️" : "🛍️"}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, { fontSize: 17 }]}>{item.name}</Text>
                  <Text style={s.muted}>
                    {item.category} · {item.distance.toFixed(1)} km
                  </Text>
                </View>
              </View>
              {item.discovery ? (
                <Text style={s.muted}>
                  Map listing · Delivery and ratings not verified
                </Text>
              ) : (
                <>
                  <Text style={s.muted}>
                    {item.rating == null ? "Not yet rated" : `★ ${item.rating}`}{" "}
                    · {item.status === "open" ? "Open" : "Closed"} ·{" "}
                    {item.delivery_minutes
                      ? `${item.delivery_minutes} min estimated`
                      : "Delivery time not supplied"}
                  </Text>
                  <Text style={s.text}>
                    ₹{Number(item.delivery_fee).toFixed(2)} delivery
                    {item.offer ? ` · ${item.offer}` : ""}
                  </Text>
                </>
              )}
              <Button
                secondary={item.discovery}
                title={
                  item.discovery
                    ? "View place details"
                    : type === "food"
                      ? "View menu"
                      : "Shop products"
                }
                onPress={() => openPlace(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            !loading && (
              <View style={s.card}>
                <Text style={s.text}>
                  {!address
                    ? "Choose your Rajkot delivery location to see nearby food and shops."
                    : "No matching places found. Try another category, landmark or delivery location."}
                </Text>
                <Button
                  title="Choose location"
                  onPress={() => setSelecting(true)}
                />
              </View>
            )
          }
          ListFooterComponent={
            <View style={{ gap: 10 }}>
              <Button
                secondary
                title="Retry / refresh nearby places"
                disabled={loading || !address}
                onPress={() => setRefresh((n) => n + 1)}
              />
              <Button
                secondary
                title="Shop owner dashboard"
                onPress={() => (user ? setAdmin(true) : setLogin(true))}
              />
              {user && (
                <Button
                  secondary
                  title="Sign out of Food & Shop"
                  onPress={async () => {
                    await supabase.auth.signOut();
                    setOrders(null);
                    setAdmin(false);
                  }}
                />
              )}
            </View>
          }
        />
      </View>
      {ready && selecting && (
        <DeliveryLocation
          current={address}
          saved={saved}
          autoLocate={type === "shops"}
          onSelect={select}
          onClose={() => setSelecting(false)}
        />
      )}
      {store && (
        <Storefront
          visible={!login}
          store={store}
          address={address}
          user={user}
          onLogin={() => setLogin(true)}
          onClose={() => {
            setStore(null);
            setRefresh((n) => n + 1);
          }}
        />
      )}
      {login && (
        <Account
          onClose={() => setLogin(false)}
          onSignedIn={(u) => {
            setUser(u);
            setLogin(false);
          }}
        />
      )}
      {admin && user && (
        <Inventory
          user={user}
          onClose={() => {
            setAdmin(false);
            setRefresh((n) => n + 1);
          }}
        />
      )}
      {orders && (
        <Sheet title="Food & Shop orders" onClose={() => setOrders(null)}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {!orders.length && (
              <Text style={s.text}>You have not placed an order yet.</Text>
            )}
            {orders.map((o) => (
              <View key={o.id} style={s.card}>
                <Text style={s.title}>Order {o.id.slice(0, 8)}</Text>
                <Text style={s.text}>
                  {o.status.replaceAll("_", " ")} · ₹{o.total}
                </Text>
                <Text style={s.muted}>{o.address.addressLine}</Text>
                {o.items.map((item, i) => (
                  <Text style={s.muted} key={i}>
                    {item.quantity} × {item.name}
                  </Text>
                ))}
              </View>
            ))}
            <Button title="Refresh orders" onPress={viewOrders} />
          </ScrollView>
        </Sheet>
      )}
    </SafeAreaView>
  );
}
