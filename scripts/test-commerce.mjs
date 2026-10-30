import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  inRajkot,
  distanceKm,
  searchRajkot,
  resolveAddress,
} from "../src/services/commerceLocations.js";
import {
  deliverable,
  shopCategory,
  stockState,
} from "../src/services/commerceRules.js";

test("Rajkot service zone, merchant radius, and stock boundaries", () => {
  assert.equal(shopCategory({ shop: "greengrocer" }), "Fruits & Vegetables");
  assert.equal(shopCategory({ amenity: "pharmacy" }), "Pharmacy");
  const rajkot = { latitude: 22.3039, longitude: 70.8022 };
  assert.equal(inRajkot(rajkot), true);
  assert.equal(inRajkot({ latitude: 23.0225, longitude: 72.5714 }), false);
  assert.equal(inRajkot({ latitude: NaN, longitude: 70.8 }), false);
  assert.equal(inRajkot({ latitude: 22.16, longitude: 70.79 }), true); // Shapar outskirts
  assert.equal(distanceKm(rajkot, rajkot), 0);
  assert.equal(
    deliverable({ ...rajkot, delivery_radius: 6, status: "open" }, rajkot),
    true,
  );
  assert.equal(
    deliverable({ ...rajkot, delivery_radius: 6, status: "closed" }, rajkot),
    false,
  );
  assert.equal(
    deliverable(
      { latitude: 22.4, longitude: 70.8, delivery_radius: 6, status: "open" },
      rajkot,
    ),
    false,
  );
  for (const [qty, expected] of [
    [0, "OUT_OF_STOCK"],
    [1, "LOW_STOCK"],
    [5, "LOW_STOCK"],
    [6, "IN_STOCK"],
  ]) {
    assert.equal(
      stockState({
        stock_quantity: qty,
        available: true,
        low_stock_threshold: 5,
      }),
      expected,
    );
  }
  assert.equal(
    stockState({ stock_quantity: 20, available: false }),
    "OUT_OF_STOCK",
  );
});

test("dynamic search rejects out-of-area results and reverse geocoding preserves the pin", async () => {
  const original = globalThis.fetch;
  const feature = (lat, lng) => ({
    properties: {
      name: "Test landmark",
      city: "Rajkot",
      state: "Gujarat",
      postcode: "360001",
    },
    geometry: { coordinates: [lng, lat] },
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ features: [feature(22.3, 70.8), feature(23, 72)] }),
  });
  try {
    assert.equal((await searchRajkot("landmark")).length, 1);
    const exact = await resolveAddress(22.301, 70.801);
    assert.equal(exact.latitude, 22.301);
    assert.equal(exact.longitude, 70.801);
    assert.equal(exact.postalCode, "360001");
    await assert.rejects(
      () => resolveAddress(23, 72),
      /currently available in Rajkot/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("PostgreSQL migration: checkout, rollback, idempotency, ownership and stale edits", async () => {
  // Test-only dependency, deliberately outside the application's dependencies.
  const { PGlite } =
    await import("../.tools/commerce-validation/node_modules/@electric-sql/pglite/dist/index.js");
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610300001_food_shop.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const owner = "11111111-1111-4111-8111-111111111111";
    const buyer = "22222222-2222-4222-8222-222222222222";
    const other = "33333333-3333-4333-8333-333333333333";
    const shop = "44444444-4444-4444-8444-444444444444";
    const milk = "55555555-5555-4555-8555-555555555555";
    const empty = "66666666-6666-4666-8666-666666666666";
    await db.query("insert into auth.users values ($1),($2),($3)", [
      owner,
      buyer,
      other,
    ]);
    await db.query(
      `insert into commerce_shops(id,owner_id,kind,name,category,address,area,latitude,longitude,status,delivery_fee)
      values($1,$2,'shops','Test shop','Grocery','Test address','Rajkot',22.3039,70.8022,'open',20)`,
      [shop, owner],
    );
    await db.query(
      `insert into commerce_products(id,shop_id,name,category,mrp,price,stock_quantity)
      values($1,$3,'Milk','Dairy',40,32,2),($2,$3,'Empty','Dairy',10,10,0)`,
      [milk, empty, shop],
    );
    const asUser = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const address = {
      latitude: 22.3039,
      longitude: 70.8022,
      addressLine: "Test delivery address",
      label: "Home",
    };
    const order = (items, key, a = address) =>
      db.query("select commerce_place_order($1,$2,$3,$4) as result", [
        shop,
        JSON.stringify(items),
        JSON.stringify(a),
        key,
      ]);
    await asUser(buyer);
    const cart = [{ product_id: milk, quantity: 1 }];
    const first = (await order(cart, "test-order-1")).rows[0].result;
    assert.equal(Number(first.total), 52);
    assert.equal(
      (await order(cart, "test-order-1")).rows[0].result.id,
      first.id,
    );
    assert.equal(
      (
        await db.query(
          "select stock_quantity from commerce_products where id=$1",
          [milk],
        )
      ).rows[0].stock_quantity,
      1,
    );
    await assert.rejects(
      () =>
        order(
          [
            { product_id: milk, quantity: 1 },
            { product_id: empty, quantity: 1 },
          ],
          "test-rollback",
        ),
      /Insufficient stock/,
    );
    assert.equal(
      (
        await db.query(
          "select stock_quantity from commerce_products where id=$1",
          [milk],
        )
      ).rows[0].stock_quantity,
      1,
    );
    await assert.rejects(
      () => order(cart, "test-outside", { ...address, latitude: 23 }),
      /currently available in Rajkot/,
    );
    await assert.rejects(
      () => order(cart, "test-radius", { ...address, latitude: 22.4 }),
      /delivery radius/,
    );
    await assert.rejects(
      () => order([...cart, ...cart], "test-duplicate"),
      /Duplicate products/,
    );
    await assert.rejects(
      () => order([{ product_id: milk, quantity: 0.5 }], "test-invalid"),
      /Invalid quantity/,
    );
    await assert.rejects(
      () => db.query("select commerce_adjust_stock($1,10)", [milk]),
      /do not own/,
    );
    await assert.rejects(
      () => db.query("select commerce_advance_order($1)", [first.id]),
      /not owned/,
    );
    assert.equal(
      (
        await db.query(
          "update commerce_products set price=1 where id=$1 returning id",
          [milk],
        )
      ).rows.length,
      0,
    );
    await asUser(other);
    assert.equal(
      (await db.query("select * from commerce_orders")).rows.length,
      0,
    );
    await asUser(owner);
    assert.equal(
      (await db.query("select * from commerce_orders")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query("select commerce_advance_order($1) as status", [
          first.id,
        ])
      ).rows[0].status,
      "accepted",
    );
    assert.equal(
      (
        await db.query(
          "update commerce_products set stock_quantity=2 where id=$1 and revision=1 returning id",
          [milk],
        )
      ).rows.length,
      0,
    );
    await db.query("select commerce_adjust_stock($1,1)", [milk]);
    await asUser(buyer);
    const results = await Promise.allSettled([
      order([{ product_id: milk, quantity: 2 }], "test-last-a"),
      order([{ product_id: milk, quantity: 2 }], "test-last-b"),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (
        await db.query(
          "select stock_quantity from commerce_products where id=$1",
          [milk],
        )
      ).rows[0].stock_quantity,
      0,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(() => order(cart, "test-anon"), /permission denied/);
  } finally {
    await db.close();
  }
});
