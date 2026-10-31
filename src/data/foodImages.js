import { generatedRestaurantImages, generatedItemImages } from './generatedFoodImages';
// Restaurant and dish photography from Unsplash image CDN.
const photo = (id, width) => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=' + width + '&q=82';
const restaurantPhotos = {
 r1:'photo-1546833999-b9f581a1996d', r2:'photo-1513104890138-7c749659a591',
 r3:'photo-1563379091339-03246963d51a', r4:'photo-1589301760014-d929f3979dbc',
 r5:'photo-1568901346375-23c9450c58cd', r6:'photo-1512621776951-a57141f2eefd',
 r7:'photo-1569718212165-3a8278d5f624', r8:'photo-1528735602780-2552fd46c7af',
 r9:'photo-1601050690597-df0568f70950', r10:'photo-1563805042-7684c019e1cb',
 r11:'photo-1571407970349-bc81e7e96d47', r12:'photo-1567188040759-fb8a883dc6d8',
 r13:'photo-1547592180-85f173990554', r14:'photo-1567188040759-fb8a883dc6d8',
 r15:'photo-1633945274405-b6c8069047b0', r16:'photo-1571407970349-bc81e7e96d47',
 r17:'photo-1571091718767-18b5b1457add', r18:'photo-1512058564366-18510be2db19',
 r19:'photo-1626777552726-4a6b54c97e46', r20:'photo-1488477181946-6428a0291777',
 r21:'photo-1528735602780-2552fd46c7af',
 rajkot_grand_thakar:'photo-1546833999-b9f581a1996d',
 rajkot_kasumbo:'photo-1512621776951-a57141f2eefd',
 rajkot_imperial:'photo-1547592180-85f173990554',
};
const categories={thali:'photo-1546833999-b9f581a1996d',biryani:'photo-1563379091339-03246963d51a',pizza:'photo-1513104890138-7c749659a591',burger:'photo-1568901346375-23c9450c58cd',chinese:'photo-1569718212165-3a8278d5f624',south_indian:'photo-1589301760014-d929f3979dbc',dessert:'photo-1563805042-7684c019e1cb',sandwich:'photo-1528735602780-2552fd46c7af',street_food:'photo-1601050690597-df0568f70950'};
const dishPhotos = [
 [/pani puri|sev puri|bhel puri|chaat/i,'photo-1601050690597-df0568f70950'],
 [/samosa|kachori|dabeli|vada pav/i,'photo-1601050690597-df0568f70950'],
 [/dosa|idli|medu vada|uttapam|pongal/i,'photo-1589301760014-d929f3979dbc'],
 [/paneer|butter masala|dal makhani|chole|curry|undhiyu|khichdi|thali/i,'photo-1546833999-b9f581a1996d'],
 [/pizza|garlic bread/i,'photo-1513104890138-7c749659a591'],
 [/burger/i,'photo-1568901346375-23c9450c58cd'],
 [/noodle|manchurian|fried rice|spring roll/i,'photo-1569718212165-3a8278d5f624'],
 [/sandwich|wrap|frankie/i,'photo-1528735602780-2552fd46c7af'],
 [/cake|brownie|ice cream|sundae|gulab jamun|dessert/i,'photo-1563805042-7684c019e1cb'],
 [/coffee|lassi|shake|milk|mojito|juice|soda|chaas/i,'photo-1509042239860-f550ce710b93'],
 [/fries/i,'photo-1573080496219-bb080dd4f877'],
];
const restaurantOverrides = { ...generatedRestaurantImages, r3: require('../../assets/images/food/veg-biryani-cover.png'), r6: require('../../assets/images/food/gordhan-cover.png') };
const itemOverrides = {
 ...generatedItemImages,
 r6_1: require('../../assets/images/food/gordhan-special.png'),
 r6_2: require('../../assets/images/food/kathiyawadi-thali.png'),
 r6_3: require('../../assets/images/food/mini-thali.png'),
};
export function restaurantImage(id, width=800) { return restaurantOverrides[id] || (restaurantPhotos[id] ? photo(restaurantPhotos[id],width) : null); }
export function foodImage(category,name='',itemId='',width=400) {
 if (itemOverrides[itemId]) return itemOverrides[itemId];
 const match=dishPhotos.find(([pattern])=>pattern.test(name));
 const id=match?.[1] || categories[category];
 return id ? photo(id,width) : null;
}

