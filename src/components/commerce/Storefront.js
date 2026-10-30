import React, { useEffect, useRef, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import {
  deliverable,
  newOrderReference,
  placeOrder,
  productsFor,
  stockState,
} from "../../services/commerce";
import { Button, Sheet, s } from "./UI";

export default function Storefront({
  store,
  address,
  user,
  onLogin,
  onClose,
  visible = true,
}) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [order, setOrder] = useState(null);
  const requestId = useRef(null);
  const submitting = useRef(false);
  useEffect(() => {
    let live = true;
    productsFor(store.id)
      .then((p) => {
        if (live) setProducts(p);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [store.id]);
  const lines = products.filter((p) => cart[p.id] > 0);
  const subtotal = lines.reduce(
    (total, p) => total + Number(p.price) * cart[p.id],
    0,
  );
  const available = deliverable(store, address);
  async function refreshProducts() {
    setBusy(true);
    setError("");
    try {
      const updated = await productsFor(store.id);
      setProducts(updated);
      setCart((previous) =>
        Object.fromEntries(
          updated.map((p) => [
            p.id,
            p.available ? Math.min(previous[p.id] || 0, p.stock_quantity) : 0,
          ]),
        ),
      );
      setCheckout(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (submitting.current) return;
    if (!user) {
      onLogin();
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    if (!requestId.current) requestId.current = newOrderReference();
    try {
      const data = await placeOrder(
        store.id,
        lines.map((p) => ({ product_id: p.id, quantity: cart[p.id] })),
        address,
        requestId.current,
      );
      setOrder(data);
      setCart({});
    } catch (e) {
      setError(e.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Sheet
      visible={visible}
      title={
        order ? "Order placed" : checkout ? "Confirm your order" : store.name
      }
      onClose={onClose}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {error ? (
          <View style={{ gap: 8, marginBottom: 12 }}>
            <Text style={s.error}>{error}</Text>
            <Button
              secondary
              title="Refresh menu and stock"
              disabled={busy}
              onPress={refreshProducts}
            />
          </View>
        ) : null}
        {order ? (
          <View style={s.card}>
            <Text style={s.title}>Order received</Text>
            <Text style={s.text}>Reference: {order.id}</Text>
            <Text style={s.text}>
              ₹{Number(order.total).toFixed(2)} · Cash on delivery
            </Text>
            <Text style={s.muted}>
              The shop will need to accept and fulfil your order. No online
              payment has been taken.
            </Text>
          </View>
        ) : checkout ? (
          <>
            <View style={s.card}>
              <Text style={s.title}>Deliver to {address.label}</Text>
              <Text style={s.text}>{address.addressLine}</Text>
              <Text style={s.muted}>{address.landmark}</Text>
            </View>
            {lines.map((p) => (
              <View key={p.id} style={s.card}>
                <Text style={s.text}>
                  {cart[p.id]} × {p.name}
                </Text>
                <Text style={s.muted}>
                  ₹{(p.price * cart[p.id]).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={s.card}>
              <Text style={s.text}>Items: ₹{subtotal.toFixed(2)}</Text>
              <Text style={s.text}>
                Delivery: ₹{Number(store.delivery_fee).toFixed(2)}
              </Text>
              <Text style={s.title}>
                Total: ₹{(subtotal + Number(store.delivery_fee)).toFixed(2)}
              </Text>
              <Text style={s.muted}>Payment: Cash on delivery</Text>
            </View>
            <Button
              secondary
              title="Back to menu / products"
              onPress={() => setCheckout(false)}
            />
          </>
        ) : (
          <>
            <Text style={s.muted}>
              {store.category} · {store.distance.toFixed(1)} km
            </Text>
            <Text style={s.muted}>
              {available
                ? "Accepting orders"
                : "Currently unavailable for delivery"}
            </Text>
            {!busy && !products.length && (
              <Text style={s.error}>
                This merchant has not published a menu or products yet.
              </Text>
            )}
            {products.map((p) => (
              <View key={p.id} style={s.card}>
                <View style={s.row}>
                  {p.image ? (
                    <Image
                      source={{ uri: p.image }}
                      accessibilityLabel={p.name}
                      style={{ width: 64, height: 64, borderRadius: 12 }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{p.name}</Text>
                    <Text style={s.muted}>{p.description}</Text>
                    <Text style={s.text}>
                      ₹{Number(p.price).toFixed(2)} · {p.quantity} {p.unit}
                    </Text>
                    {p.mrp > p.price && (
                      <Text
                        style={[
                          s.muted,
                          { textDecorationLine: "line-through" },
                        ]}
                      >
                        MRP ₹{p.mrp}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={s.muted}>
                  {stockState(p).replaceAll("_", " ")}
                </Text>
                <View style={s.row}>
                  <Button
                    secondary
                    title="−"
                    disabled={!cart[p.id]}
                    onPress={() => {
                      requestId.current = newOrderReference();
                      setCart({
                        ...cart,
                        [p.id]: Math.max(0, (cart[p.id] || 0) - 1),
                      });
                    }}
                  />
                  <Text style={s.text}>{cart[p.id] || 0}</Text>
                  <Button
                    title="Add +"
                    disabled={
                      !available ||
                      !p.available ||
                      (cart[p.id] || 0) >= p.stock_quantity
                    }
                    onPress={() => {
                      requestId.current = newOrderReference();
                      setCart({ ...cart, [p.id]: (cart[p.id] || 0) + 1 });
                    }}
                  />
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <View style={s.footer}>
        {order ? (
          <Button title="Continue browsing" onPress={onClose} />
        ) : checkout ? (
          <Button
            title={
              busy
                ? "Placing order…"
                : user
                  ? "Place order · Cash on delivery"
                  : "Sign in to place order"
            }
            disabled={busy || !lines.length || !available}
            onPress={submit}
          />
        ) : (
          <Button
            title={
              busy ? "Loading products…" : `View cart · ₹${subtotal.toFixed(2)}`
            }
            disabled={busy || !lines.length || !available}
            onPress={() => setCheckout(true)}
          />
        )}
      </View>
    </Sheet>
  );
}
