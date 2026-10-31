/**
 * Hardcoded restaurant data for Rajkot – Swiggy / Zomato style
 * Each restaurant has a menu organised by category.
 */

// ── Food categories shown as filter chips ──────────────────────────────
export const FOOD_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'biryani', label: 'Biryani', icon: 'flame-outline' },
  { id: 'pizza', label: 'Pizza', icon: 'pizza-outline' },
  { id: 'burger', label: 'Burger', icon: 'fast-food-outline' },
  { id: 'thali', label: 'Thali', icon: 'restaurant-outline' },
  { id: 'chinese', label: 'Chinese', icon: 'nutrition-outline' },
  { id: 'south_indian', label: 'South Indian', icon: 'cafe-outline' },
  { id: 'dessert', label: 'Desserts', icon: 'ice-cream-outline' },
  { id: 'sandwich', label: 'Sandwich', icon: 'layers-outline' },
  { id: 'street_food', label: 'Street Food', icon: 'bonfire-outline' },
];

// ── Quick-access cuisine banners at top ────────────────────────────────
export const CUISINE_BANNERS = [
  { id: 'offer', label: 'Offers', emoji: '🏷️', color: '#FEF3C7' },
  { id: 'biryani', label: 'Biryani', emoji: '🍛', color: '#FDE68A' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕', color: '#FECACA' },
  { id: 'burger', label: 'Burger', emoji: '🍔', color: '#FED7AA' },
  { id: 'thali', label: 'Thali', emoji: '🍽️', color: '#D1FAE5' },
  { id: 'chinese', label: 'Chinese', emoji: '🥡', color: '#E0E7FF' },
  { id: 'dessert', label: 'Desserts', emoji: '🍰', color: '#FCE7F3' },
  { id: 'south_indian', label: 'Dosa', emoji: '🫓', color: '#CFFAFE' },
];

// ── Restaurants ────────────────────────────────────────────────────────
export const RESTAURANTS = [
  {
    id: 'r1',
    name: 'Jalaram Khichdi',
    image: null,
    cuisine: 'Gujarati, Kathiyawadi',
    category: 'thali',
    rating: 4.5,
    reviewCount: 1240,
    deliveryTime: '25-30 min',
    deliveryFee: 20,
    distance: '1.8 km',
    offer: '₹125 OFF above ₹249',
    offerType: 'flat',
    veg: true,
    promoted: true,
    address: 'Kalawad Road, Rajkot',
    lat: 22.2987,
    lng: 70.7834,
    menu: [
      {
        category: 'Khichdi Specials',
        items: [
          { id: 'r1_1', name: 'Jalaram Special Khichdi', price: 120, description: 'Moong dal khichdi with ghee, papad, chutney & pickle', veg: true, bestseller: true },
          { id: 'r1_2', name: 'Masala Khichdi', price: 100, description: 'Spiced khichdi with veggies and ghee tadka', veg: true },
          { id: 'r1_3', name: 'Dal Khichdi Combo', price: 150, description: 'Khichdi + dal + kadhi + papad + sweet', veg: true, bestseller: true },
        ],
      },
      {
        category: 'Thali',
        items: [
          { id: 'r1_4', name: 'Gujarati Thali', price: 220, description: 'Full thali with dal, sabzi, roti, rice, kadhi, sweet & papad', veg: true, bestseller: true },
          { id: 'r1_5', name: 'Kathiyawadi Thali', price: 250, description: 'Spicy kathiyawadi thali with sev tameta, ringna bateta', veg: true },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'r1_6', name: 'Masala Chaas', price: 30, description: 'Spiced buttermilk', veg: true },
          { id: 'r1_7', name: 'Sweet Lassi', price: 50, description: 'Thick creamy sweet lassi', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r2',
    name: 'Pizza Planet',
    image: null,
    cuisine: 'Italian, Pizza, Fast Food',
    category: 'pizza',
    rating: 4.2,
    reviewCount: 876,
    deliveryTime: '30-35 min',
    deliveryFee: 30,
    distance: '3.2 km',
    offer: '50% OFF up to ₹100',
    offerType: 'percent',
    veg: false,
    promoted: false,
    address: 'Race Course Ring Road, Rajkot',
    lat: 22.3102,
    lng: 70.7920,
    menu: [
      {
        category: 'Bestseller Pizzas',
        items: [
          { id: 'r2_1', name: 'Margherita Pizza', price: 149, description: 'Classic pizza with mozzarella and fresh basil', veg: true, bestseller: true },
          { id: 'r2_2', name: 'Farmhouse Pizza', price: 249, description: 'Capsicum, mushroom, onion, tomato with cheese', veg: true },
          { id: 'r2_3', name: 'Pepperoni Pizza', price: 299, description: 'Loaded pepperoni with extra cheese', veg: false, bestseller: true },
          { id: 'r2_4', name: 'Paneer Tikka Pizza', price: 279, description: 'Tandoori paneer chunks with mint mayo', veg: true },
        ],
      },
      {
        category: 'Sides & Garlic Bread',
        items: [
          { id: 'r2_5', name: 'Cheese Garlic Bread', price: 129, description: '4 pcs loaded with cheese & herbs', veg: true },
          { id: 'r2_6', name: 'French Fries', price: 99, description: 'Crispy salted fries with ketchup', veg: true },
          { id: 'r2_7', name: 'Chicken Wings (6 pcs)', price: 199, description: 'Spicy BBQ glazed wings', veg: false },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'r2_8', name: 'Coca-Cola (300ml)', price: 40, description: 'Chilled', veg: true },
          { id: 'r2_9', name: 'Mojito', price: 89, description: 'Virgin lime mint cooler', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r3',
    name: 'Bhabha Biryani House',
    image: null,
    cuisine: 'Biryani, Mughlai, North Indian',
    category: 'biryani',
    rating: 4.4,
    reviewCount: 2130,
    deliveryTime: '35-40 min',
    deliveryFee: 25,
    distance: '2.5 km',
    offer: 'FREE delivery above ₹199',
    offerType: 'delivery',
    veg: false,
    promoted: true,
    address: 'Yagnik Road, Rajkot',
    lat: 22.2963,
    lng: 70.7951,
    menu: [
      {
        category: 'Biryani',
        items: [
          { id: 'r3_1', name: 'Chicken Dum Biryani', price: 199, description: 'Slow-cooked hyderabadi style with raita & salan', veg: false, bestseller: true },
          { id: 'r3_2', name: 'Mutton Biryani', price: 279, description: 'Tender mutton pieces with aromatic basmati rice', veg: false, bestseller: true },
          { id: 'r3_3', name: 'Veg Biryani', price: 149, description: 'Mixed veggies dum biryani with raita', veg: true },
          { id: 'r3_4', name: 'Egg Biryani', price: 169, description: 'Boiled eggs in spiced rice', veg: false },
          { id: 'r3_5', name: 'Paneer Biryani', price: 179, description: 'Paneer cubes in fragrant rice', veg: true },
        ],
      },
      {
        category: 'Kebabs & Starters',
        items: [
          { id: 'r3_6', name: 'Chicken Seekh Kebab', price: 159, description: 'Minced chicken kebab (4 pcs)', veg: false },
          { id: 'r3_7', name: 'Paneer Tikka', price: 149, description: 'Marinated paneer grilled in tandoor', veg: true },
        ],
      },
      {
        category: 'Breads',
        items: [
          { id: 'r3_8', name: 'Butter Naan', price: 40, description: 'Soft naan with butter', veg: true },
          { id: 'r3_9', name: 'Garlic Naan', price: 50, description: 'Naan with garlic & coriander', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r4',
    name: 'Honest Restaurant',
    image: null,
    cuisine: 'Gujarati, South Indian, Chinese',
    category: 'thali',
    rating: 4.3,
    reviewCount: 3456,
    deliveryTime: '20-25 min',
    deliveryFee: 15,
    distance: '1.2 km',
    offer: '20% OFF above ₹350',
    offerType: 'percent',
    veg: true,
    promoted: false,
    address: '150 Feet Ring Road, Rajkot',
    lat: 22.3110,
    lng: 70.8030,
    menu: [
      {
        category: 'South Indian',
        items: [
          { id: 'r4_1', name: 'Masala Dosa', price: 99, description: 'Crispy dosa with potato masala, sambar & chutney', veg: true, bestseller: true },
          { id: 'r4_2', name: 'Cheese Dosa', price: 129, description: 'Dosa loaded with cheese', veg: true },
          { id: 'r4_3', name: 'Idli Sambar (4 pcs)', price: 79, description: 'Soft idlis with sambar & coconut chutney', veg: true },
          { id: 'r4_4', name: 'Uttapam', price: 89, description: 'Thick rice pancake with onion & tomato', veg: true },
        ],
      },
      {
        category: 'Chinese',
        items: [
          { id: 'r4_5', name: 'Veg Hakka Noodles', price: 129, description: 'Stir-fried noodles with veggies', veg: true, bestseller: true },
          { id: 'r4_6', name: 'Manchurian Dry', price: 139, description: 'Crispy veg manchurian balls', veg: true },
          { id: 'r4_7', name: 'Schezwan Fried Rice', price: 139, description: 'Spicy schezwan rice with vegetables', veg: true },
        ],
      },
      {
        category: 'Thali & Combos',
        items: [
          { id: 'r4_8', name: 'Mini Gujarati Thali', price: 169, description: 'Dal, sabzi, roti, rice, sweet', veg: true },
          { id: 'r4_9', name: 'South Indian Combo', price: 159, description: '1 Dosa + 2 Idli + Sambar + Chutney', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r5',
    name: 'Burger Singh',
    image: null,
    cuisine: 'Burgers, Fast Food, American',
    category: 'burger',
    rating: 4.1,
    reviewCount: 645,
    deliveryTime: '20-25 min',
    deliveryFee: 20,
    distance: '2.1 km',
    offer: 'Buy 1 Get 1 FREE',
    offerType: 'bogo',
    veg: false,
    promoted: true,
    address: 'Crystal Mall, Rajkot',
    lat: 22.3067,
    lng: 70.8001,
    menu: [
      {
        category: 'Veg Burgers',
        items: [
          { id: 'r5_1', name: 'Classic Aloo Tikki Burger', price: 89, description: 'Crispy aloo tikki with mayo & lettuce', veg: true, bestseller: true },
          { id: 'r5_2', name: 'Paneer Royale Burger', price: 149, description: 'Grilled paneer patty with chipotle sauce', veg: true },
          { id: 'r5_3', name: 'Veg Cheese Supreme', price: 129, description: 'Double cheese veg patty burger', veg: true },
        ],
      },
      {
        category: 'Non-Veg Burgers',
        items: [
          { id: 'r5_4', name: 'Chicken Zinger Burger', price: 159, description: 'Crispy chicken fillet with spicy mayo', veg: false, bestseller: true },
          { id: 'r5_5', name: 'Double Chicken Smash', price: 219, description: 'Two smashed chicken patties with cheese', veg: false },
          { id: 'r5_6', name: 'BBQ Chicken Burger', price: 179, description: 'Grilled chicken with BBQ sauce & onion rings', veg: false },
        ],
      },
      {
        category: 'Sides & Combos',
        items: [
          { id: 'r5_7', name: 'Cheesy Fries', price: 109, description: 'Fries loaded with cheese sauce', veg: true },
          { id: 'r5_8', name: 'Chicken Nuggets (6 pcs)', price: 139, description: 'Golden fried chicken nuggets', veg: false },
          { id: 'r5_9', name: 'Combo Meal (Burger + Fries + Coke)', price: 199, description: 'Any classic burger with fries & 300ml coke', veg: true, bestseller: true },
        ],
      },
    ],
  },
  {
    id: 'r6',
    name: 'Gordhan Thal',
    image: null,
    cuisine: 'Gujarati Thali, Kathiyawadi',
    category: 'thali',
    rating: 4.6,
    reviewCount: 4521,
    deliveryTime: '30-35 min',
    deliveryFee: 30,
    distance: '3.8 km',
    offer: null,
    offerType: null,
    veg: true,
    promoted: false,
    address: 'University Road, Rajkot',
    lat: 22.3145,
    lng: 70.7765,
    menu: [
      {
        category: 'Unlimited Thali',
        items: [
          { id: 'r6_1', name: 'Gordhan Special Thali', price: 350, description: '14-item unlimited thali with 3 sweets, farsan, dal, rice, sabzi, roti, papad, chutney', veg: true, bestseller: true },
          { id: 'r6_2', name: 'Kathiyawadi Thali', price: 320, description: '12-item spicy kathiyawadi unlimited thali', veg: true, bestseller: true },
          { id: 'r6_3', name: 'Mini Thali', price: 199, description: 'Limited portion thali – ideal for light meals', veg: true },
        ],
      },
      {
        category: 'Sweets',
        items: [
          { id: 'r6_4', name: 'Gulab Jamun (2 pcs)', price: 60, description: 'Soft syrup-soaked gulab jamuns', veg: true },
          { id: 'r6_5', name: 'Jalebi (100g)', price: 50, description: 'Crispy hot jalebi', veg: true },
          { id: 'r6_6', name: 'Ras Malai (2 pcs)', price: 80, description: 'Creamy saffron-flavoured ras malai', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r7',
    name: 'Dragon House',
    image: null,
    cuisine: 'Chinese, Thai, Asian',
    category: 'chinese',
    rating: 4.0,
    reviewCount: 512,
    deliveryTime: '35-40 min',
    deliveryFee: 35,
    distance: '4.1 km',
    offer: '30% OFF above ₹500',
    offerType: 'percent',
    veg: false,
    promoted: false,
    address: 'Amin Marg, Rajkot',
    lat: 22.2914,
    lng: 70.7893,
    menu: [
      {
        category: 'Starters',
        items: [
          { id: 'r7_1', name: 'Spring Roll (4 pcs)', price: 109, description: 'Crispy veg spring rolls with sweet chilli sauce', veg: true },
          { id: 'r7_2', name: 'Chicken Lollipop (6 pcs)', price: 179, description: 'Spicy chicken lollipops', veg: false, bestseller: true },
          { id: 'r7_3', name: 'Crispy Corn', price: 119, description: 'Golden fried corn with salt & pepper', veg: true },
        ],
      },
      {
        category: 'Noodles & Rice',
        items: [
          { id: 'r7_4', name: 'Chicken Chow Mein', price: 179, description: 'Stir-fried noodles with chicken & veggies', veg: false, bestseller: true },
          { id: 'r7_5', name: 'Veg Fried Rice', price: 129, description: 'Classic fried rice with mixed vegetables', veg: true },
          { id: 'r7_6', name: 'Egg Fried Rice', price: 139, description: 'Fried rice with scrambled eggs', veg: false },
          { id: 'r7_7', name: 'Singapore Noodles', price: 159, description: 'Spicy curried noodles with vegetables', veg: true },
        ],
      },
      {
        category: 'Main Course',
        items: [
          { id: 'r7_8', name: 'Chilli Paneer Gravy', price: 169, description: 'Paneer in spicy indo-chinese gravy', veg: true },
          { id: 'r7_9', name: 'Chicken Manchurian Gravy', price: 189, description: 'Chicken balls in manchurian sauce', veg: false },
        ],
      },
    ],
  },
  {
    id: 'r8',
    name: 'Sandwich Factory',
    image: null,
    cuisine: 'Sandwiches, Wraps, Fast Food',
    category: 'sandwich',
    rating: 4.3,
    reviewCount: 923,
    deliveryTime: '15-20 min',
    deliveryFee: 10,
    distance: '0.8 km',
    offer: '₹50 OFF above ₹149',
    offerType: 'flat',
    veg: true,
    promoted: true,
    address: 'Jagnath Plot, Rajkot',
    lat: 22.3001,
    lng: 70.8055,
    menu: [
      {
        category: 'Grilled Sandwiches',
        items: [
          { id: 'r8_1', name: 'Cheese Grilled Sandwich', price: 79, description: 'Classic grilled sandwich with cheese & veggies', veg: true, bestseller: true },
          { id: 'r8_2', name: 'Paneer Tikka Sandwich', price: 109, description: 'Spiced paneer with mint chutney', veg: true, bestseller: true },
          { id: 'r8_3', name: 'Chocolate Grilled Sandwich', price: 89, description: 'Sweet chocolate spread grilled sandwich', veg: true },
          { id: 'r8_4', name: 'Club Sandwich', price: 129, description: 'Triple decker with veggies, cheese & sauces', veg: true },
        ],
      },
      {
        category: 'Wraps & Rolls',
        items: [
          { id: 'r8_5', name: 'Paneer Wrap', price: 99, description: 'Paneer tikka wrapped in rumali roti', veg: true },
          { id: 'r8_6', name: 'Veg Frankie', price: 79, description: 'Mixed veg roll with green chutney', veg: true },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'r8_7', name: 'Cold Coffee', price: 69, description: 'Iced coffee with chocolate drizzle', veg: true },
          { id: 'r8_8', name: 'Oreo Shake', price: 89, description: 'Thick oreo milkshake', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r9',
    name: 'Rajkot Chaat Corner',
    image: null,
    cuisine: 'Street Food, Chaat, Snacks',
    category: 'street_food',
    rating: 4.4,
    reviewCount: 1876,
    deliveryTime: '15-20 min',
    deliveryFee: 10,
    distance: '1.5 km',
    offer: '₹30 OFF on first order',
    offerType: 'flat',
    veg: true,
    promoted: false,
    address: 'Dhebar Road, Rajkot',
    lat: 22.2952,
    lng: 70.7985,
    menu: [
      {
        category: 'Chaat',
        items: [
          { id: 'r9_1', name: 'Pani Puri (6 pcs)', price: 40, description: 'Crispy puris with tangy pani & masala', veg: true, bestseller: true },
          { id: 'r9_2', name: 'Sev Puri (6 pcs)', price: 50, description: 'Crispy puris topped with chutneys & sev', veg: true },
          { id: 'r9_3', name: 'Dahi Puri (6 pcs)', price: 60, description: 'Puris filled with curd, chutney & pomegranate', veg: true },
          { id: 'r9_4', name: 'Bhel Puri', price: 50, description: 'Puffed rice mix with tangy tamarind chutney', veg: true, bestseller: true },
        ],
      },
      {
        category: 'Snacks',
        items: [
          { id: 'r9_5', name: 'Samosa (2 pcs)', price: 30, description: 'Crispy samosa with potato filling', veg: true },
          { id: 'r9_6', name: 'Kachori (2 pcs)', price: 40, description: 'Flaky kachori with spiced dal filling', veg: true },
          { id: 'r9_7', name: 'Dabeli', price: 30, description: 'Rajkot special spiced potato burger', veg: true, bestseller: true },
          { id: 'r9_8', name: 'Vada Pav', price: 25, description: 'Mumbai style potato fritter in bun', veg: true },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'r9_9', name: 'Masala Soda', price: 25, description: 'Fizzy soda with masala & lime', veg: true },
          { id: 'r9_10', name: 'Sugarcane Juice', price: 30, description: 'Fresh sugarcane juice with ginger & lime', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r10',
    name: 'Sweet Tooth Desserts',
    image: null,
    cuisine: 'Desserts, Ice Cream, Cakes',
    category: 'dessert',
    rating: 4.5,
    reviewCount: 1102,
    deliveryTime: '20-25 min',
    deliveryFee: 15,
    distance: '2.0 km',
    offer: '40% OFF on ice creams',
    offerType: 'percent',
    veg: true,
    promoted: false,
    address: 'Astron Chowk, Rajkot',
    lat: 22.3085,
    lng: 70.7908,
    menu: [
      {
        category: 'Ice Cream',
        items: [
          { id: 'r10_1', name: 'Butterscotch Sundae', price: 99, description: 'Butterscotch ice cream with nuts & caramel', veg: true, bestseller: true },
          { id: 'r10_2', name: 'Chocolate Brownie Sundae', price: 149, description: 'Warm brownie with chocolate ice cream & fudge', veg: true, bestseller: true },
          { id: 'r10_3', name: 'Mango Delight', price: 119, description: 'Fresh mango ice cream with mango chunks', veg: true },
          { id: 'r10_4', name: 'Classic Vanilla Scoop', price: 49, description: 'Single scoop of premium vanilla', veg: true },
        ],
      },
      {
        category: 'Cakes & Pastries',
        items: [
          { id: 'r10_5', name: 'Red Velvet Pastry', price: 89, description: 'Rich red velvet with cream cheese frosting', veg: true },
          { id: 'r10_6', name: 'Chocolate Truffle Pastry', price: 79, description: 'Dense chocolate truffle', veg: true },
          { id: 'r10_7', name: 'Blueberry Cheesecake', price: 109, description: 'New York style blueberry cheesecake', veg: true },
        ],
      },
      {
        category: 'Indian Sweets',
        items: [
          { id: 'r10_8', name: 'Kesar Kulfi', price: 59, description: 'Traditional saffron kulfi on stick', veg: true },
          { id: 'r10_9', name: 'Rabri Falooda', price: 89, description: 'Rabri with falooda sev, rose syrup & ice cream', veg: true, bestseller: true },
        ],
      },
    ],
  },
  {
    id: 'r11',
    name: 'Domino\'s Style Pizza Hub',
    image: null,
    cuisine: 'Pizza, Italian, Pasta',
    category: 'pizza',
    rating: 3.9,
    reviewCount: 1567,
    deliveryTime: '25-30 min',
    deliveryFee: 0,
    distance: '1.6 km',
    offer: 'FREE delivery',
    offerType: 'delivery',
    veg: false,
    promoted: false,
    address: 'Kalavad Road, Rajkot',
    lat: 22.2998,
    lng: 70.7863,
    menu: [
      {
        category: 'Veg Pizzas',
        items: [
          { id: 'r11_1', name: 'Onion Pizza', price: 119, description: 'Onion rings with mozzarella', veg: true },
          { id: 'r11_2', name: 'Veggie Paradise', price: 199, description: 'Capsicum, onion, tomato, sweet corn, mushroom', veg: true, bestseller: true },
          { id: 'r11_3', name: 'Corn & Cheese Pizza', price: 179, description: 'Sweet corn with extra cheese', veg: true },
        ],
      },
      {
        category: 'Non-Veg Pizzas',
        items: [
          { id: 'r11_4', name: 'Chicken Sausage Pizza', price: 229, description: 'Chicken sausage with jalapeño', veg: false },
          { id: 'r11_5', name: 'Keema Do Pyaaza', price: 259, description: 'Spiced chicken keema with onion', veg: false, bestseller: true },
        ],
      },
      {
        category: 'Pasta & Sides',
        items: [
          { id: 'r11_6', name: 'Penne Arrabbiata', price: 149, description: 'Penne in spicy tomato sauce', veg: true },
          { id: 'r11_7', name: 'Stuffed Garlic Bread', price: 109, description: 'Cheesy stuffed garlic bread (4 pcs)', veg: true },
        ],
      },
    ],
  },
  {
    id: 'r12',
    name: 'Madras Café',
    image: null,
    cuisine: 'South Indian, Filter Coffee, Dosa',
    category: 'south_indian',
    rating: 4.4,
    reviewCount: 789,
    deliveryTime: '20-25 min',
    deliveryFee: 15,
    distance: '2.3 km',
    offer: null,
    offerType: null,
    veg: true,
    promoted: false,
    address: 'Pedak Road, Rajkot',
    lat: 22.3025,
    lng: 70.7975,
    menu: [
      {
        category: 'Dosas',
        items: [
          { id: 'r12_1', name: 'Plain Dosa', price: 69, description: 'Thin crispy dosa with sambar & chutney', veg: true },
          { id: 'r12_2', name: 'Masala Dosa', price: 89, description: 'Dosa stuffed with spiced potato', veg: true, bestseller: true },
          { id: 'r12_3', name: 'Mysore Masala Dosa', price: 109, description: 'Spicy chutney spread dosa with potato masala', veg: true },
          { id: 'r12_4', name: 'Rava Dosa', price: 99, description: 'Crispy semolina dosa', veg: true },
          { id: 'r12_5', name: 'Paper Dosa', price: 89, description: 'Extra thin and crispy large dosa', veg: true, bestseller: true },
        ],
      },
      {
        category: 'Other Items',
        items: [
          { id: 'r12_6', name: 'Medu Vada (2 pcs)', price: 59, description: 'Crispy lentil donuts with sambar & chutney', veg: true },
          { id: 'r12_7', name: 'Pongal', price: 79, description: 'Rice and lentil savory porridge', veg: true },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'r12_8', name: 'Filter Coffee', price: 39, description: 'Authentic South Indian filter coffee', veg: true, bestseller: true },
          { id: 'r12_9', name: 'Badam Milk', price: 49, description: 'Warm almond-flavored milk', veg: true },
        ],
      },
    ],
  },
];


// Additional sample restaurants and menus.
const EXTRA_MENUS = [
 ['r13','The Curry Table','thali','North Indian, Curries, Breads',[['Paneer Butter Masala',199],['Dal Makhani',169],['Butter Naan',45],['Jeera Rice',99],['Chole Masala',159]]],
 ['r14','Dosa House','south_indian','South Indian, Dosa, Breakfast',[['Masala Dosa',109],['Plain Dosa',79],['Idli Sambar',89],['Medu Vada',79],['Filter Coffee',49]]],
 ['r15','Biryani Kitchen','biryani','Biryani, Rice, Indian',[['Veg Biryani',169],['Paneer Biryani',199],['Chicken Biryani',229],['Egg Biryani',189],['Paneer Tikka',179]]],
 ['r16','Pizza Garden','pizza','Pizza, Italian, Pasta',[['Margherita Pizza',169],['Farmhouse Pizza',249],['Paneer Pizza',259],['Garlic Bread',119],['Pasta Arrabbiata',169]]],
 ['r17','Burger Junction','burger','Burgers, Fries, Fast Food',[['Veg Burger',99],['Paneer Burger',149],['Chicken Burger',179],['French Fries',99],['Chocolate Shake',109]]],
 ['r18','Wok & Bowl','chinese','Chinese, Noodles, Rice',[['Veg Hakka Noodles',149],['Veg Fried Rice',139],['Chilli Paneer',189],['Spring Rolls',129],['Chicken Noodles',189]]],
 ['r19','Chaat Bazaar','street_food','Street Food, Chaat, Snacks',[['Pani Puri',60],['Sev Puri',70],['Bhel Puri',70],['Samosa',40],['Dabeli',45]]],
 ['r20','The Dessert Room','dessert','Desserts, Cakes, Ice Cream',[['Chocolate Brownie',129],['Chocolate Cake',149],['Ice Cream Sundae',119],['Gulab Jamun',69],['Cold Coffee',79]]],
 ['r21','The Sandwich Stop','sandwich','Sandwiches, Wraps, Snacks',[['Veg Grilled Sandwich',99],['Paneer Sandwich',129],['Club Sandwich',149],['Paneer Wrap',119],['Cold Coffee',79]]],
];
EXTRA_MENUS.forEach(([id, name, category, cuisine, dishes]) => {
 RESTAURANTS.push({ id, name, category, cuisine, image: null, rating: 4.2, reviewCount: 100,
  deliveryTime: '25-35 min', deliveryFee: 25, distance: '2.5 km', offer: null, offerType: null,
  veg: dishes.every(([dish]) => !/chicken|egg/i.test(dish)), promoted: false, address: 'Rajkot',
  menu: [{ category: 'Popular dishes', items: dishes.map(([dish, price], index) => ({
   id: id + '_' + (index + 1), name: dish, price, veg: !/chicken|egg/i.test(dish), bestseller: index === 0,
  })) }],
 });
});

// Show vegetarian dishes only, even at restaurants with mixed menus.
RESTAURANTS.forEach((restaurant) => {
 restaurant.menu = restaurant.menu.map((section) => ({...section, items: section.items.filter((item) => item.veg && !/\b(?:chicken|mutton|eggs?|pepperoni)\b/i.test(item.name + ' ' + (item.description || '')))})).filter((section) => section.items.length);
});
// Public menu highlights. Availability and prices must be confirmed with the venue.
const PUBLIC_MENUS = [
 ['rajkot_grand_thakar','The Grand Thakar - TGT','Gujarati, Punjabi, Thali','Jawahar Road, opposite Jubilee Garden, Rajkot','https://www.swiggy.com/city/rajkot/the-grand-thakar-tgt-jhulelal-nagar-jubeli-chowk-rest85692',[['Gujarati Mini Thali',420],['Gujarati Thali Parcel 1',650],['Undhiyu Gujarati',105],['Paneer Lababdar',443.44],['Dal Makhani',304.63]]],
 ['rajkot_kasumbo','Kasumbo at Motel The Village','Kathiyawadi, Punjabi, Gujarati','Motel The Village, Rajkot','https://motelthevillage.com/dining/',[['Rajwadi Undhiyu',350],['Lasaniya Bateka',350],['Palak Paneer',450],['Dal Makhani',310],['Bajra No Rotla',90],['Paneer Tikka',470],['Hot Gulab Jamun',180],['Vegetable Manchurian',400]]],
 ['rajkot_imperial','The Imperial Palace','Punjabi, Chinese, Continental','Dr Yagnik Road, Rajkot','https://www.swiggy.com/city/rajkot/the-imperial-palace-race-course-dr-yagnik-road-rest423688',[['Paneer Angara',null],['Paneer Tikka Masala',null]]],
];
PUBLIC_MENUS.forEach(([id,name,cuisine,address,sourceUrl,dishes]) => RESTAURANTS.push({id,name,cuisine,address,sourceUrl,informationOnly:true,category:'thali',veg:false,promoted:false,offer:null,rating:null,menu:[{category:'Menu highlights',items:dishes.map(([dish,price],index)=>({id:id+'_'+index,name:dish,price,veg:true}))}]}));
