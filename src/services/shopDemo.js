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
const EXTRA = [
 ['Onions','Vegetables','1 kg',4500,'🧅'], ['Carrots','Vegetables','500 g',4000,'🥕'], ['Oranges','Fruits','1 kg',12000,'🍊'], ['Mangoes','Fruits','1 kg',16000,'🥭'],
 ['Paneer','Milk & Dairy','200 g',9000,'🧀'], ['Butter','Milk & Dairy','100 g',6000,'🧈'], ['Chana dal','Grocery & Staples','1 kg',11000,'🫘'], ['Salt','Grocery & Staples','1 kg',2500,'🧂'],
 ['Basmati rice','Rice & Flour','1 kg',15000,'🍚'], ['Gram flour','Rice & Flour','500 g',6500,'🌾'], ['Popcorn','Snacks','100 g',4500,'🍿'], ['Namkeen','Snacks','200 g',6500,'🥜'],
 ['Coffee','Beverages','100 g',15000,'☕'], ['Lemon drink','Beverages','1 litre',7500,'🍋'], ['Croissant','Bakery','2 pieces',8000,'🥐'], ['Cake','Bakery','250 g',12000,'🍰'],
 ['Shampoo','Personal Care','200 ml',14500,'🧴'], ['Toothbrush','Personal Care','1 piece',4000,'🪥'], ['Aluminium foil','Household Essentials','1 roll',9500,'📦'], ['Tissues','Household Essentials','1 pack',7000,'🧻'],
 ['Floor cleaner','Cleaning Products','1 litre',14000,'🧴'], ['Laundry soap','Cleaning Products','3 bars',6000,'🧼'], ['Instant noodles','Packaged Foods','280 g',6500,'🍜'], ['Oats','Packaged Foods','500 g',12000,'🥣'],
];
const MORE = [
 ['Cucumber','Vegetables','500 g',3500,'🥒'], ['Cauliflower','Vegetables','1 piece',4500,'🥬'], ['Cabbage','Vegetables','1 piece',4000,'🥬'], ['Spinach','Vegetables','1 bunch',2500,'🥬'], ['Green peas','Vegetables','500 g',6000,'🟢'], ['Capsicum','Vegetables','500 g',6500,'🫑'],
 ['Papaya','Fruits','1 piece',7000,'🍈'], ['Pomegranate','Fruits','500 g',10000,'🍎'], ['Grapes','Fruits','500 g',9000,'🍇'], ['Watermelon','Fruits','1 piece',9000,'🍉'], ['Guava','Fruits','500 g',6000,'🍐'], ['Pineapple','Fruits','1 piece',8000,'🍍'],
 ['Amul Taaza Milk','Milk & Dairy','1 litre',6800,'🥛'], ['Amul Masti Dahi','Milk & Dairy','400 g',5000,'🥣'], ['Amul Cheese Slices','Milk & Dairy','200 g',14000,'🧀'], ['Amul Fresh Cream','Milk & Dairy','250 ml',7000,'🥛'], ['Amul Buttermilk','Milk & Dairy','200 ml',1500,'🥛'], ['Amul Ghee','Milk & Dairy','500 ml',34000,'🧈'],
 ['Tata Salt','Grocery & Staples','1 kg',2800,'🧂'], ['Tata Sampann Toor Dal','Grocery & Staples','1 kg',19000,'🫘'], ['Fortune Sunflower Oil','Grocery & Staples','1 litre',15000,'🫗'], ['Fortune Besan','Grocery & Staples','500 g',7500,'🌾'], ['Tata Sampann Moong Dal','Grocery & Staples','500 g',9000,'🫘'], ['Jaggery','Grocery & Staples','500 g',6000,'🟤'],
 ['India Gate Basmati Rice','Rice & Flour','1 kg',18000,'🍚'], ['Aashirvaad Atta','Rice & Flour','1 kg',6500,'🌾'], ['Fortune Chakki Fresh Atta','Rice & Flour','1 kg',6000,'🌾'], ['Daawat Basmati Rice','Rice & Flour','1 kg',17000,'🍚'], ['Rice flour','Rice & Flour','500 g',4500,'🌾'], ['Ragi flour','Rice & Flour','500 g',7000,'🌾'],
 ['Lay’s Classic Salted','Snacks','52 g',2000,'🥔'], ['Kurkure Masala Munch','Snacks','75 g',2000,'🌽'], ['Haldiram’s Aloo Bhujia','Snacks','200 g',6500,'🥜'], ['Bingo Mad Angles','Snacks','66 g',2000,'🔺'], ['Doritos Nacho Cheese','Snacks','60 g',3000,'🌽'], ['Too Yumm! Multigrain Chips','Snacks','60 g',3000,'🥔'],
 ['Tata Tea Premium','Beverages','250 g',14000,'☕'], ['Nescafé Classic Coffee','Beverages','50 g',18000,'☕'], ['Coca-Cola','Beverages','750 ml',4000,'🥤'], ['Pepsi','Beverages','750 ml',4000,'🥤'], ['Real Mixed Fruit Juice','Beverages','1 litre',13000,'🧃'], ['Bournvita','Beverages','500 g',26000,'🥛'],
 ['Britannia Bread','Bakery','400 g',4500,'🍞'], ['Britannia Milk Rusk','Bakery','200 g',5500,'🍞'], ['Britannia Cake','Bakery','120 g',4000,'🍰'], ['Brown bread','Bakery','400 g',6000,'🍞'], ['Garlic bread','Bakery','200 g',7500,'🥖'], ['Pav','Bakery','6 pieces',4000,'🥯'],
 ['Colgate Strong Teeth','Personal Care','200 g',11000,'🪥'], ['Dove Beauty Bar','Personal Care','100 g',6500,'🧼'], ['Clinic Plus Shampoo','Personal Care','175 ml',13000,'🧴'], ['Pears Soap','Personal Care','125 g',7500,'🧼'], ['Vaseline Lotion','Personal Care','200 ml',19000,'🧴'], ['Oral-B Toothbrush','Personal Care','1 piece',6000,'🪥'],
 ['Garbage bags','Household Essentials','30 bags',10000,'🗑️'], ['Cling wrap','Household Essentials','1 roll',12000,'📦'], ['Parchment paper','Household Essentials','1 roll',14000,'📜'], ['Steel scrubber','Household Essentials','3 pieces',4500,'🧽'], ['Storage bags','Household Essentials','20 pieces',9500,'📦'], ['Kitchen sponge','Household Essentials','3 pieces',6000,'🧽'],
 ['Surf Excel Easy Wash','Cleaning Products','1 kg',15000,'🧺'], ['Vim Dishwash Bar','Cleaning Products','300 g',3500,'🧼'], ['Lizol Floor Cleaner','Cleaning Products','500 ml',11000,'🧴'], ['Harpic Toilet Cleaner','Cleaning Products','500 ml',11000,'🧴'], ['Ariel Matic','Cleaning Products','1 kg',25000,'🧺'], ['Colin Glass Cleaner','Cleaning Products','500 ml',13000,'🧴'],
 ['Maggi 2-Minute Noodles','Packaged Foods','280 g',6000,'🍜'], ['Kellogg’s Corn Flakes','Packaged Foods','250 g',13000,'🥣'], ['Quaker Oats','Packaged Foods','500 g',11000,'🥣'], ['Kissan Tomato Ketchup','Packaged Foods','500 g',13000,'🍅'], ['MTR Poha','Packaged Foods','80 g',4500,'🥣'], ['Yippee Magic Masala Noodles','Packaged Foods','280 g',6000,'🍜'],
];
const AMUL_DAIRY = [["Amul Gold Milk","500 ml",3400,"🥛"],["Amul Shakti Milk","500 ml",3000,"🥛"],["Amul Slim n Trim Milk","1 litre",7000,"🥛"],["Amul Lactose Free Milk","250 ml",2600,"🥛"],["Amul Calci+ Milk","1 litre",9800,"🥛"],["Amul Moti Long Life Milk","450 ml",3200,"🥛"],["Amul High Protein Milk","250 ml",11000,"🥛"],["Amul Pasteurised Butter","100 g",6000,"🧈"],["Amul Garlic Butter","100 g",6500,"🧈"],["Amul Cheese Cubes","200 g",14000,"🧀"],["Amul Cheese Spread","200 g",12000,"🧀"],["Amul Mozzarella Cheese","200 g",14000,"🧀"],["Amul Pizza Cheese","200 g",14000,"🧀"],["Amul Diced Cheese Blend","200 g",14000,"🧀"],["Amul Malai Paneer","200 g",9000,"🧀"],["Amul High Protein Paneer","400 g",16500,"🧀"],["Amul Masti Buttermilk","200 ml",1500,"🥛"],["Amul High Protein Buttermilk","200 ml",3000,"🥛"],["Amul High Protein Plain Lassi","200 ml",3000,"🥛"],["Amul High Protein Rose Lassi","200 ml",3000,"🥛"],["Amul Mango Lassi","1 litre",8000,"🥛"],["Amul Kool Kesar Milk","200 ml",3000,"🥛"],["Amul Kool Chocolate Milk","200 ml",3000,"🥛"],["Amul Kool Protein Chocolate Milkshake","180 ml",4000,"🥛"],["Amul Kool Protein Kesar Milkshake","180 ml",4000,"🥛"],["Amul Kool Protein Vanilla Milkshake","180 ml",4000,"🥛"],["Amul Kool Protein Arabica Coffee Milkshake","180 ml",4000,"🥛"],["Amul High Protein Blueberry Shake","200 ml",6000,"🥛"],["Amul Mithai Mate Condensed Milk","400 g",14000,"🥛"],["Amul Whole Milk Powder","500 g",27000,"🥛"],["Amul Shrikhand","500 g",13000,"🥣"]].map(([name, unit, price, icon]) => [name, 'Milk & Dairy', unit, price, icon]);
export const PRODUCTS = SHOPS.flatMap((shop, i) => [...CATALOG, ...EXTRA, ...MORE, ...AMUL_DAIRY].map(([name, category, unit, price, icon], j) => ({ id: j < CATALOG.length && j % 2 === i % 2 ? `${shop.id}-product-${Math.floor(j / 2)}` : `${shop.id}-item-${j}`, shopId:shop.id, name, category, unit, price, icon, description:`${name.toLowerCase()} · ${unit}`, initialStock: 20 })));
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
export function placeDemoOrder({ address, phone, instructions, payment, paymentLabel }) { return change((state) => {
  const shop = SHOPS.find((s) => s.id === state.cart.shopId);
  if (!shop || !address?.addressLine?.trim() || !/^[6-9]\d{9}$/.test(phone)) throw new Error('Enter a delivery address and valid 10-digit phone number.');
  if (!['cod','online'].includes(payment)) throw new Error('Select a payment method.');
  if (shopDistance(shop, address) > shop.radius) throw new Error('This shop is outside its delivery radius.');
  const lines = Object.entries(state.cart.quantities).map(([id, quantity]) => { const p = PRODUCTS.find((item) => item.id === id && item.shopId === shop.id); if (!p || !Number.isInteger(quantity) || quantity <= 0 || quantity > stock(state, p)) throw new Error('Stock changed. Please review your cart.'); return { id, name:p.name, unit:p.unit, price:p.price, quantity }; });
  if (!lines.length) throw new Error('Your cart is empty.');
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  lines.forEach((line) => { const p = PRODUCTS.find((item) => item.id === line.id); state.inventory[line.id] = stock(state, p) - line.quantity; });
  const now = new Date().toISOString();
  const order = { id:`SHOP-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, shopId:shop.id, shopName:shop.name, address, phone, instructions:instructions.trim(), payment, paymentLabel: typeof paymentLabel === 'string' ? paymentLabel.slice(0,100) : '', paymentStatus: payment === 'online' ? 'SIMULATED' : 'DEMO_COD', lines, subtotal, deliveryFee:shop.fee, total:subtotal+shop.fee, status:'PLACED', history:[{ status:'PLACED', at:now }], createdAt:now };
  state.orders.unshift(order); state.cart = { shopId:null, quantities:{} }; return { state, order };
}); }
const NEXT = { PLACED:'ACCEPTED', ACCEPTED:'PACKING', PACKING:'READY_FOR_PICKUP' };
export function advanceDemoOrder(id) { return change((state) => { const order=state.orders.find((o) => o.id===id); if (!order || !NEXT[order.status]) throw new Error('This order cannot advance without an assigned delivery partner.'); order.status=NEXT[order.status]; order.history.push({status:order.status,at:new Date().toISOString()}); return state; }); }
export function cancelDemoOrder(id) { return change((state) => { const order=state.orders.find((o) => o.id===id); if (!order || !['PLACED','ACCEPTED','PACKING'].includes(order.status)) throw new Error('This order can no longer be canceled.'); order.lines.forEach((line) => { const p=PRODUCTS.find((item) => item.id===line.id); if (p) state.inventory[line.id]=stock(state,p)+line.quantity; }); order.status='CANCELED'; order.history.push({status:'CANCELED',at:new Date().toISOString()}); return state; }); }
