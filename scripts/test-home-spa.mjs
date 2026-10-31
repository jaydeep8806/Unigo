import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/services/homeSpa.js', import.meta.url), 'utf8');
const { findHomeSpaPlaces } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let queries = [];
globalThis.fetch = async (_url, options) => {
  queries.push(decodeURIComponent(options.body));
  return { ok: true, json: async () => ({ elements: [{ type: 'way', id: 7, center: { lat: 22.3, lon: 70.8 }, tags: { name: 'Example', 'contact:phone': '+91 123', shop: 'beauty' } }] }) };
};
for (const category of ['cleaning', 'salon', 'spa', 'massage']) {
  const places = await findHomeSpaPlaces(22.3, 70.8, category);
  assert.equal(places[0].name, 'Example');
  assert.equal(places[0].phone, '+91 123');
  assert.equal(places[0].lat, 22.3);
}
assert.ok(queries.every((query) => query.includes('around:10000,22.3,70.8')));
globalThis.fetch = async () => { throw new Error('offline'); };
await assert.rejects(findHomeSpaPlaces(22.3, 70.8, 'cleaning'));
await assert.rejects(findHomeSpaPlaces(22.3, 70.8, 'unknown'));
console.log('Home & Spa search checks passed');
