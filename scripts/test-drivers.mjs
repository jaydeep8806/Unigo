import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "../.tools/commerce-validation/node_modules/@electric-sql/pglite/dist/index.js";

test("Driver database: identity, compatibility, allocation, lifecycle, seed isolation and RLS", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611060002_drivers.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const users = Array.from(
      { length: 5 },
      (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const id of users)
      await db.query("insert into auth.users values ($1)", [id]);
    const as = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const action = async (name, payload = {}) =>
      (
        await db.query("select driver_action($1,$2) result", [
          name,
          JSON.stringify(payload),
        ])
      ).rows[0].result;
    const form = {
      name: "Aarav Patel",
      phone: "9876543210",
      category: "bike",
      brand: "Honda",
      model: "Activa",
      registration: "GJ03AB1234",
    };
    const request = {
      origin: "Race Course",
      destination: "Kalawad Road",
      pickupCoords: { latitude: 22.3039, longitude: 70.8022 },
      destinationCoords: { latitude: 22.28, longitude: 70.77 },
      vehicleId: "bike",
      fare: 100,
    };
    await as(users[0]);
    const driver = await action("register", form);
    const persisted = (await db.query("select * from public.drivers where id=$1", [driver.id])).rows[0];
    assert.equal(persisted.owner_id, users[0]);
    assert.equal(persisted.name, form.name);
    assert.equal(persisted.phone, form.phone);
    assert.equal(persisted.registration, form.registration);
    assert.equal(persisted.category, form.category);
    assert.equal(persisted.brand, form.brand);
    assert.equal(persisted.model, form.model);
    assert.equal(persisted.source, "registered");
    assert.equal(persisted.online, false);
    await action("presence", {
      online: true,
      latitude: 22.304,
      longitude: 70.802,
    });
    await as(users[1]);
    await assert.rejects(() => action("register", form), /duplicate key/);
    await assert.rejects(
      () => action("request", { ...request, fare: null }),
      /Invalid ride/,
    );
    const wrong = await action("request", { ...request, vehicleId: "car" });
    assert.equal(wrong.status, "unavailable");
    const ride = await action("request", request);
    assert.equal(ride.driver_id, driver.id);
    assert.equal(ride.status, "requested");
    const again = await action("request", request);
    assert.equal(again.id, ride.id);
    await as(users[2]);
    assert.equal((await action("request", request)).status, "unavailable");
    await assert.rejects(
      () => action("sync", { id: ride.id }),
      /Ride not available/,
    );
    assert.equal((await db.query("select * from drivers")).rows.length, 0);
    assert.equal(
      (await db.query("select * from driver_rides where id=$1", [ride.id])).rows
        .length,
      0,
    );
    await assert.rejects(
      () => db.query("update drivers set online=true where id=$1", [driver.id]),
      /permission denied/,
    );
    await as(users[0]);
    assert.equal((await action("accept", { id: ride.id })).status, "assigned");
    await assert.rejects(
      () => action("presence", { online: false }),
      /Finish or reject/,
    );
    await assert.rejects(
      () => action("complete", { id: ride.id }),
      /Invalid ride transition/,
    );
    assert.equal((await action("arrive", { id: ride.id })).status, "arrived");
    await assert.rejects(
      () => action("start", { id: ride.id, otp: "wrong" }),
      /Invalid ride transition/,
    );
    assert.equal(
      (await action("start", { id: ride.id, otp: ride.otp })).status,
      "in_progress",
    );
    assert.equal(
      (await action("complete", { id: ride.id })).status,
      "completed",
    );
    await as(users[1]);
    const rejected = await action("request", request);
    await as(users[0]);
    assert.equal(
      (await action("reject", { id: rejected.id })).status,
      "unavailable",
    );
    await as(users[1]);
    const expired = await action("request", request);
    await db.exec("reset role");
    await db.query(
      "update driver_rides set expires_at=now()-interval '1 minute' where id=$1",
      [expired.id],
    );
    await as(users[1]);
    assert.equal(
      (await action("sync", { id: expired.id })).status,
      "unavailable",
    );
    await as(users[0]);
    await action("presence", { online: false });
    await db.exec("reset role");
    const seed = await readFile(
      new URL("../supabase/seed-drivers.sql", import.meta.url),
      "utf8",
    );
    await db.exec(seed);
    await db.exec(seed);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from drivers where source='seed'",
        )
      ).rows[0].n,
      3000,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from drivers where source='seed' and category='bike'",
        )
      ).rows[0].n,
      1800,
    );
    await as(users[1]);
    assert.equal((await action("request", request)).status, "unavailable");
    const simulation = await action("request", { ...request, simulated: true });
    assert.equal(simulation.status, "requested");
    assert.equal(simulation.simulated, true);
    for (const status of ["assigned", "arrived", "in_progress", "completed"]) {
      await db.exec("reset role");
      await db.query(
        "update driver_rides set updated_at=now()-interval '10 seconds' where id=$1",
        [simulation.id],
      );
      await as(users[1]);
      assert.equal(
        (await action("sync", { id: simulation.id })).status,
        status,
      );
    }
    await db.exec("reset role; update driver_settings set development=false");
    await as(users[1]);
    await assert.rejects(() => action("request", { ...request, simulated: true }), /not enabled/);
    assert.equal((await action("request", request)).status, "unavailable");
    await db.exec("reset role; set role anon");
    await assert.rejects(() => action("request", request), /permission denied/);
  } finally {
    await db.close();
  }
});
