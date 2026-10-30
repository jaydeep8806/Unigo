import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  adjustStock,
  deleteProduct,
  ordersForShop,
  ownedShops,
  productsFor,
  saveProduct,
  SHOP_CATEGORIES,
  stockState,
} from "../../services/commerce";
import { supabase } from "../../services/supabase";
import { Button, Field, Sheet, s } from "./UI";

const blank = {
  name: "",
  category: "Grocery",
  description: "",
  image: "",
  mrp: "",
  price: "",
  quantity: "1",
  unit: "piece",
  stock_quantity: "0",
  low_stock_threshold: "5",
  available: true,
};
export default function Inventory({ user, onClose }) {
  const [shops, setShops] = useState([]);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("products");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  useEffect(() => {
    let live = true;
    ownedShops(user.id)
      .then((rows) => {
        if (live) {
          setShops(rows);
          setShop(rows[0] || null);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [user.id]);
  const reload = useCallback(async () => {
    if (!shop) return;
    const [p, o] = await Promise.all([
      productsFor(shop.id),
      ordersForShop(shop.id),
    ]);
    setProducts(p);
    setOrders(o);
  }, [shop]);
  useEffect(() => {
    if (!shop) return;
    let live = true;
    Promise.all([productsFor(shop.id), ordersForShop(shop.id)])
      .then(([p, o]) => {
        if (live) {
          setProducts(p);
          setOrders(o);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [shop]);
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const data = { ...editing, shop_id: shop.id };
    for (const field of [
      "mrp",
      "price",
      "quantity",
      "stock_quantity",
      "low_stock_threshold",
    ])
      data[field] = Number(data[field]);
    if (
      !data.name.trim() ||
      !data.category.trim() ||
      !data.unit.trim() ||
      [
        "mrp",
        "price",
        "quantity",
        "stock_quantity",
        "low_stock_threshold",
      ].some((k) => !Number.isFinite(data[k]) || data[k] < 0) ||
      data.quantity <= 0 ||
      data.mrp < data.price ||
      !Number.isInteger(data.stock_quantity) ||
      !Number.isInteger(data.low_stock_threshold)
    )
      throw new Error(
        "Enter a name, category, unit and valid prices/quantities. MRP must be at least the price; stock must be a whole number.",
      );
    if (data.image && !/^https:\/\//i.test(data.image))
      throw new Error("Use an HTTPS image URL.");
    await saveProduct(data);
    setEditing(null);
  }
  return (
    <Sheet title="Shop management" onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {error ? <Text style={s.error}>{error}</Text> : null}
        {!shops.length && (
          <Text style={s.text}>
            No shop is assigned to your account. An administrator must onboard
            your shop and assign your account as its owner.
          </Text>
        )}
        <View style={s.row}>
          {shops.map((item) => (
            <Button
              key={item.id}
              title={item.name}
              secondary={shop?.id !== item.id}
              disabled={busy}
              onPress={() => {
                setShop(item);
                setEditing(null);
                setProducts([]);
                setOrders([]);
              }}
            />
          ))}
        </View>
        {shop && (
          <>
            <View style={s.row}>
              <Button
                title="Products"
                secondary={tab !== "products"}
                onPress={() => setTab("products")}
              />
              <Button
                title="Orders"
                secondary={tab !== "orders"}
                onPress={() => setTab("orders")}
              />
              <Button
                secondary
                title="Refresh"
                disabled={busy}
                onPress={() => action(async () => {})}
              />
            </View>
            {tab === "orders" ? (
              <>
                {!orders.length && <Text style={s.muted}>No orders yet.</Text>}
                {orders.map((o) => (
                  <View style={s.card} key={o.id}>
                    <Text style={s.text}>
                      {o.id.slice(0, 8)} · ₹{o.total} · {o.status}
                    </Text>
                    <Text style={s.muted}>{o.address.addressLine}</Text>
                    {o.items.map((line, i) => (
                      <Text key={i} style={s.muted}>
                        {line.quantity} × {line.name}
                      </Text>
                    ))}
                    {[
                      "placed",
                      "accepted",
                      "preparing",
                      "out_for_delivery",
                    ].includes(o.status) && (
                      <Button
                        title={`Mark ${{ placed: "accepted", accepted: "preparing", preparing: "out_for_delivery", out_for_delivery: "delivered" }[o.status].replaceAll("_", " ")}`}
                        disabled={busy}
                        onPress={() =>
                          action(async () => {
                            const { error: err } = await supabase.rpc(
                              "commerce_advance_order",
                              { order_id: o.id },
                            );
                            if (err) throw err;
                          })
                        }
                      />
                    )}
                  </View>
                ))}
              </>
            ) : editing ? (
              <View style={s.card}>
                <Text style={s.title}>
                  {editing.id ? "Edit product" : "Add product"}
                </Text>
                {[
                  "name",
                  "category",
                  "description",
                  "image",
                  "mrp",
                  "price",
                  "quantity",
                  "unit",
                  "stock_quantity",
                  "low_stock_threshold",
                ].map((key) => (
                  <Field
                    key={key}
                    label={key.replaceAll("_", " ")}
                    value={String(editing[key] ?? "")}
                    keyboardType={
                      [
                        "mrp",
                        "price",
                        "quantity",
                        "stock_quantity",
                        "low_stock_threshold",
                      ].includes(key)
                        ? "decimal-pad"
                        : "default"
                    }
                    onChangeText={(value) =>
                      setEditing({ ...editing, [key]: value })
                    }
                  />
                ))}
                <Button
                  secondary
                  title={
                    editing.available
                      ? "Available · tap to pause sales"
                      : "Unavailable · tap to enable sales"
                  }
                  onPress={() =>
                    setEditing({ ...editing, available: !editing.available })
                  }
                />
                <Button
                  title="Save product"
                  disabled={busy}
                  onPress={() => action(save)}
                />
                <Button
                  secondary
                  title="Cancel"
                  onPress={() => setEditing(null)}
                />
              </View>
            ) : (
              <>
                <Button
                  title="+ Add product"
                  onPress={() =>
                    setEditing({
                      ...blank,
                      category: shop.kind === "food" ? "Menu" : "Grocery",
                    })
                  }
                />
                <Field
                  placeholder="Search products"
                  value={query}
                  onChangeText={setQuery}
                />
                <View style={s.row}>
                  {["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"].map((f) => (
                    <Button
                      key={f}
                      secondary={filter !== f}
                      title={f.replaceAll("_", " ")}
                      onPress={() => setFilter(f)}
                    />
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    "All",
                    ...new Set([
                      ...SHOP_CATEGORIES,
                      ...products.map((p) => p.category),
                    ]),
                  ].map((c) => (
                    <Button
                      key={c}
                      title={c}
                      secondary={category !== c}
                      onPress={() => setCategory(c)}
                      style={{ marginRight: 6 }}
                    />
                  ))}
                </ScrollView>
                {products
                  .filter(
                    (p) =>
                      p.name.toLowerCase().includes(query.toLowerCase()) &&
                      (filter === "ALL" || stockState(p) === filter) &&
                      (category === "All" || p.category === category),
                  )
                  .map((p) => (
                    <View key={p.id} style={s.card}>
                      <Text style={s.title}>{p.name}</Text>
                      <Text style={s.muted}>
                        ₹{p.price} · {p.stock_quantity} in stock ·{" "}
                        {stockState(p).replaceAll("_", " ")}
                      </Text>
                      <View style={s.row}>
                        <Button
                          title="−1"
                          disabled={busy || p.stock_quantity === 0}
                          secondary
                          onPress={() => action(() => adjustStock(p.id, -1))}
                        />
                        <Button
                          title="+1"
                          disabled={busy}
                          secondary
                          onPress={() => action(() => adjustStock(p.id, 1))}
                        />
                        <Button title="Edit" onPress={() => setEditing(p)} />
                        <Button
                          secondary
                          title={
                            p.available ? "Mark unavailable" : "Mark available"
                          }
                          disabled={busy || (!p.available && !p.stock_quantity)}
                          onPress={() =>
                            action(() =>
                              saveProduct({
                                id: p.id,
                                shop_id: p.shop_id,
                                ...p,
                                available: !p.available,
                              }),
                            )
                          }
                        />
                        <Button
                          title="Delete"
                          secondary
                          onPress={() => setDeleting(p.id)}
                        />
                      </View>
                      {deleting === p.id && (
                        <>
                          <Text style={s.error}>
                            Delete {p.name} from this shop?
                          </Text>
                          <Button
                            title="Confirm delete"
                            disabled={busy}
                            onPress={() =>
                              action(async () => {
                                await deleteProduct(p.id);
                                setDeleting(null);
                              })
                            }
                          />
                          <Button
                            secondary
                            title="Keep product"
                            onPress={() => setDeleting(null)}
                          />
                        </>
                      )}
                    </View>
                  ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}
