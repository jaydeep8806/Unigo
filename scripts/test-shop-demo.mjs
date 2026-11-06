import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const data = new Map();
globalThis.__shopTestStorage = { async getItem(k) { return data.get(k) ?? null; }, async setItem(k,v) { data.set(k,v); } };
const source = (await readFile(new URL('../src/services/shopDemo.js',import.meta.url),'utf8'))
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.__shopTestStorage;')
  .replace("import { distanceKm } from './commerceLocations';", 'const distanceKm = (a,b) => Math.hypot(a.latitude-b.latitude,a.longitude-b.longitude)*111;');
const demo = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('persistent demo checkout validates stock, cart conflicts and restores canceled stock once', async () => {
  assert.equal(demo.SHOPS.length,12); assert.equal(demo.PRODUCTS.length,144);
  const shop=demo.SHOPS[0], p=demo.PRODUCTS.find(x=>x.shopId===shop.id), other=demo.PRODUCTS.find(x=>x.shopId!==shop.id);
  await demo.updateCart(shop.id,p.id,2);
  await assert.rejects(demo.updateCart(other.shopId,other.id,1), {code:'CART_CONFLICT'});
  await assert.rejects(demo.updateCart(shop.id,p.id,100), /stock/);
  await assert.rejects(demo.placeDemoOrder({address:{...shop,addressLine:'Home'},phone:'123',payment:'cod',instructions:''}),/phone/);
  const {order}=await demo.placeDemoOrder({address:{...shop,addressLine:'Home'},phone:'9876543210',payment:'online',instructions:''});
  let state=await demo.loadDemo(); assert.equal(state.inventory[p.id],18); assert.equal(order.total,p.price*2+shop.fee); assert.equal(order.paymentStatus,'SIMULATED'); assert.equal(state.orders.length,1);
  await demo.cancelDemoOrder(order.id); state=await demo.loadDemo(); assert.equal(state.inventory[p.id],20); assert.equal(state.orders[0].status,'CANCELED');
  await assert.rejects(demo.cancelDemoOrder(order.id)); assert.equal((await demo.loadDemo()).inventory[p.id],20);
});
test('progression is guarded and stops for a driver', async () => {
  const shop=demo.SHOPS[0], p=demo.PRODUCTS.find(x=>x.shopId===shop.id);
  await demo.updateCart(shop.id,p.id,1); const {order}=await demo.placeDemoOrder({address:{...shop,addressLine:'Home'},phone:'9876543210',payment:'cod',instructions:''});
  await demo.advanceDemoOrder(order.id); await demo.advanceDemoOrder(order.id); await demo.advanceDemoOrder(order.id);
  await assert.rejects(demo.advanceDemoOrder(order.id),/delivery partner/); await assert.rejects(demo.cancelDemoOrder(order.id));
  assert.equal((await demo.loadDemo()).orders.find(o=>o.id===order.id).status,'READY_FOR_PICKUP');
});
