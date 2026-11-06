import AsyncStorage from '@react-native-async-storage/async-storage';
import { distanceKm } from './commerceLocations';

const KEY = '@unigo_shop_demo_v2';
export const AREAS = [
  ['Kalawad Road',22.288,70.773], ['150 Feet Ring Road',22.293,70.778], ['University Road',22.295,70.786], ['Raiya Road',22.307,70.777],
  ['Yagnik Road',22.298,70.796], ['Mavdi',22.267,70.790], ['Nana Mava',22.278,70.770], ['Kotecha Chowk',22.291,70.798],
  ['Amin Marg',22.290,70.790], ['Race Course',22.310,70.793], ['Gondal Road',22.276,70.810], ['Dhebar Road',22.294,70.810],
];
const CATALOG = [
  ['Tomatoes','Vegetables','1 kg',4000,'🍅'], ['Potatoes','Vegetables','1 kg',3500,'🥔'], ['Apples','Fruits','1 kg',18000,'🍎'], ['Bananas','Fruits','6 pieces',4500,'🍌'],
  ['Milk','Milk & Dairy','1 litre',6400,'🥛'], ['Curd','Milk & Dairy','400 g',5500,'🥣'], ['Toor dal','Grocery & Staples','1 kg',15000,'🫘'], ['Sugar','Grocery & Staples','1 kg',5000,'🍚'],
  ['Rice','Rice & Flour','1 kg',8500,'🍚'], ['Wheat flour','Rice & Flour','1 kg',5500,'🌾'], ['Potato chips','Snacks','100 g',3000,'🍿'], ['Biscuits','Snacks','200 g',3500,'🍪'],
  ['Fruit juice','Beverages','1 litre',11000,'🧃'], ['Tea','Beverages','250 g',12500,'☕'], ['Bread','Bakery','1 loaf',4000,'🍞'], ['Buns','Bakery','4 pieces',4500,'🥯'],
  ['Bath soap','Personal Care','3 pieces',10500,'🧼'], ['Toothpaste','Personal Care','150 g',8500,'🪥'], ['Paper towels','Household Essentials','1 roll',7500,'🧻'], ['Food containers','Household Essentials','2 pieces',14000,'📦'],
  ['Detergent','Cleaning Products','1 kg',12000,'🧺'], ['Dishwashing liquid','Cleaning Products','500 ml',9500,'🧴'], ['Pasta','Packaged Foods','500 g',8000,'🍝'], ['Tomato sauce','Packaged Foods','500 g',9000,'🍅'],
];
export const SHOPS = AREAS.map(([area, latitude, longitude], i) => ({ id:`demo-shop-${i+1}`, name:`${['Green Basket','Daily Pantry','Fresh Corner','Neighbourhood Mart','Sunrise Market','City Basket','Harvest Mart','Everyday Store','Green Lane','Family Pantry','Market Square','Home Basket'][i]}`, area, latitude, longitude, category: i % 3 === 0 ? 'Supermarket' : 'Grocery', fee: 3000, radius: 8, hours:'8:00 AM – 10:00 PM' }));
export const PRODUCTS = SHOPS.flatMap((shop, i) => CATALOG.filter((_, j) => j % 2 === i % 2).map(([name, category, unit, price, icon], j) => ({ id:`${shop.id}-product-${j}`, shopId:shop.id, name, category, unit, price, icon, description:`${name.toLowerCase()} · ${unit}`, initialStock: 20 })));
export const money = (paise) => `₹${(paise / 100).toFixed(2)}`;
export const shopDistance = (shop, location) => distanceKm(location, shop);
const empty = () => ({ cart: { shopId:null, quantities:{} }, inventory:{}, orders:[] });
let queue = Promise.resolve();
async function read() { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : empty(); }
function change(fn) { const next = queue.then(async () => { const state = await read(); const result = fn(state); await AsyncStorage.setItem(KEY, JSON.stringify(state)); return result; }); queue = next.catch(() => {}); return next; }
export async function loadDemo() { await queue; return read(); }
export function saveDemoLocation(location) { return change((state) => { state.location = location; return state; }); }
export const stock = (state, product) => state.inventory[product.id] ?? product.initialStock;
export function updateCart(shopId, productId, delta, replace = false) { return change((state) => {
  const product = PRODUCTS.find((p) => p.id === productId && p.shopId === shopId);
  if (!product) throw new Error('Product is unavailable.');
  if (state.cart.shopId && state.cart.shopId !== shopId && Object.keys(state.cart.quantities).length && !replace) { const e = new Error('Your cart contains items from another shop. Replace them?'); e.code = 'CART_CONFLICT'; throw e; }
  if (replace || state.cart.shopId !== shopId) state.cart = { shopId, quantities:{} };
  const amount = (state.cart.quantities[productId] || 0) + delta;
  if (amount > stock(state, product)) throw new Error('Not enough stock available.');
  if (amount > 0) state.cart.quantities[productId] = amount; else delete state.cart.quantities[productId];
  if (!Object.keys(state.cart.quantities).length) state.cart.shopId = null;
  return state;
}); }
export function placeDemoOrder({ address, phone, instructions, payment }) { return change((state) => {
  const shop = SHOPS.find((s) => s.id === state.cart.shopId);
  if (!shop || !address?.addressLine?.trim() || !/^[6-9]\d{9}$/.test(phone)) throw new Error('Enter a delivery address and valid 10-digit phone number.');
  if (!['cod','online'].includes(payment)) throw new Error('Select a payment method.');
  if (shopDistance(shop, address) > shop.radius) throw new Error('This shop is outside its delivery radius.');
  const lines = Object.entries(state.cart.quantities).map(([id, quantity]) => { const p = PRODUCTS.find((item) => item.id === id && item.shopId === shop.id); if (!p || !Number.isInteger(quantity) || quantity <= 0 || quantity > stock(state, p)) throw new Error('Stock changed. Please review your cart.'); return { id, name:p.name, unit:p.unit, price:p.price, quantity }; });
  if (!lines.length) throw new Error('Your cart is empty.');
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  lines.forEach((line) => { const p = PRODUCTS.find((item) => item.id === line.id); state.inventory[line.id] = stock(state, p) - line.quantity; });
  const now = new Date().toISOString();
  const order = { id:`SHOP-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, shopId:shop.id, shopName:shop.name, address, phone, instructions:instructions.trim(), payment, paymentStatus: payment === 'online' ? 'SIMULATED' : 'DEMO_COD', lines, subtotal, deliveryFee:shop.fee, total:subtotal+shop.fee, status:'PLACED', history:[{ status:'PLACED', at:now }], createdAt:now };
  state.orders.unshift(order); state.cart = { shopId:null, quantities:{} }; return { state, order };
}); }
const NEXT = { PLACED:'ACCEPTED', ACCEPTED:'PACKING', PACKING:'READY_FOR_PICKUP' };
export function advanceDemoOrder(id) { return change((state) => { const order=state.orders.find((o) => o.id===id); if (!order || !NEXT[order.status]) throw new Error('This order cannot advance without an assigned delivery partner.'); order.status=NEXT[order.status]; order.history.push({status:order.status,at:new Date().toISOString()}); return state; }); }
export function cancelDemoOrder(id) { return change((state) => { const order=state.orders.find((o) => o.id===id); if (!order || !['PLACED','ACCEPTED','PACKING'].includes(order.status)) throw new Error('This order can no longer be canceled.'); order.lines.forEach((line) => { const p=PRODUCTS.find((item) => item.id===line.id); if (p) state.inventory[line.id]=stock(state,p)+line.quantity; }); order.status='CANCELED'; order.history.push({status:'CANCELED',at:new Date().toISOString()}); return state; }); }
