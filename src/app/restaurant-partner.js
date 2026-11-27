import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/SessionProvider';
import { useRole } from '../context/RoleProvider';
import {
  getActiveMerchantProfile,
  saveMerchantRestaurant,
} from '../services/merchant';
import PressableScale from '../components/PressableScale';

const CUISINE_OPTIONS = [
  { id: 'thali', label: 'Thali & Kathiyawadi', emoji: '🍽️' },
  { id: 'gujarati', label: 'Gujarati & Farsan', emoji: '🍛' },
  { id: 'punjabi', label: 'North Indian & Punjabi', emoji: '🥘' },
  { id: 'biryani', label: 'Biryani & Mughlai', emoji: '🍲' },
  { id: 'south_indian', label: 'South Indian & Dosa', emoji: '🫓' },
  { id: 'pizza', label: 'Pizza & Italian', emoji: '🍕' },
  { id: 'burger', label: 'Burgers & Fast Food', emoji: '🍔' },
  { id: 'chinese', label: 'Chinese & Pan-Asian', emoji: '🥡' },
  { id: 'street_food', label: 'Street Food & Chaat', emoji: '🍟' },
  { id: 'sandwich', label: 'Sandwiches & Wraps', emoji: '🥪' },
  { id: 'cafe', label: 'Tea, Coffee & Cafe', emoji: '☕' },
  { id: 'bakery', label: 'Bakery & Cakes', emoji: '🥐' },
  { id: 'dessert', label: 'Desserts & Sweets', emoji: '🍰' },
  { id: 'icecream', label: 'Ice Cream & Shakes', emoji: '🍨' },
  { id: 'healthy', label: 'Juices & Healthy Bowls', emoji: '🥗' },
  { id: 'continental', label: 'Continental & Mexican', emoji: '🌮' },
];

export default function RestaurantPartnerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { chooseRole } = useRole();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState(['thali']);
  const [veg, setVeg] = useState(true);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Rajkot');
  const [deliveryTime, setDeliveryTime] = useState('20-25 min');

  // Business & Safety Verification State
  const [fssai, setFssai] = useState('');
  const [gstin, setGstin] = useState('');
  const [upi, setUpi] = useState('');

  // Menu items
  const [dish1Name, setDish1Name] = useState('');
  const [dish1Price, setDish1Price] = useState('140');
  const [dish2Name, setDish2Name] = useState('');
  const [dish2Price, setDish2Price] = useState('220');

  useEffect(() => {
    let mounted = true;
    getActiveMerchantProfile().then((data) => {
      if (mounted) {
        setProfile(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleCuisine = (id) => {
    setSelectedCuisines((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  };

  const selectAllCuisines = () => {
    if (selectedCuisines.length === CUISINE_OPTIONS.length) {
      setSelectedCuisines(['thali']);
    } else {
      setSelectedCuisines(CUISINE_OPTIONS.map((c) => c.id));
    }
  };

  const handleOpenCustomerView = async (target) => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to view and place orders in customer view.',
        [
          { text: 'Sign In / Sign Up', onPress: () => router.push('/login') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    if (target === 'restaurant') {
      router.push(profile?.id ? { pathname: '/(rider)/restaurant', params: { id: profile.id } } : '/(rider)/food');
    } else if (target === 'food') {
      router.push('/(rider)/food');
    } else {
      await chooseRole('user');
      router.push('/(rider)/(tabs)');
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your restaurant or shop name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter your restaurant address.');
      return;
    }
    if (selectedCuisines.length === 0) {
      Alert.alert('Required', 'Please select at least one cuisine category.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedLabels = selectedCuisines
        .map((id) => CUISINE_OPTIONS.find((c) => c.id === id)?.label?.split('&')[0]?.trim())
        .filter(Boolean);
      const formattedCuisine = selectedLabels.join(', ') || 'Multi-Cuisine';
      const primaryCategory = selectedCuisines[0] || 'thali';

      const menuItems = [];
      if (dish1Name.trim()) {
        menuItems.push({
          id: `dish_${Date.now()}_1`,
          name: dish1Name.trim(),
          price: Number(dish1Price) || 120,
          description: 'House specialty prepared fresh with authentic ingredients',
          veg,
          bestseller: true,
        });
      }
      if (dish2Name.trim()) {
        menuItems.push({
          id: `dish_${Date.now()}_2`,
          name: dish2Name.trim(),
          price: Number(dish2Price) || 180,
          description: 'Popular combo served with traditional sides',
          veg,
          bestseller: true,
        });
      }

      const menu = [
        {
          category: 'House Specials',
          items:
            menuItems.length > 0
              ? menuItems
              : [
                  {
                    id: `dish_${Date.now()}_default1`,
                    name: `${name.trim()} Special Thali`,
                    price: 180,
                    description: 'Complete freshly prepared meal with sides',
                    veg,
                    bestseller: true,
                  },
                ],
        },
      ];

      const saved = await saveMerchantRestaurant({
        name,
        ownerName,
        phone,
        category: primaryCategory,
        categories: selectedCuisines,
        cuisine: formattedCuisine,
        veg,
        address,
        city,
        deliveryTime,
        deliveryFee: 20,
        fssai: fssai.trim() || 'FSSAI License Active',
        gstin: gstin.trim(),
        upi: upi.trim(),
        verified: true,
        menu,
      });

      await chooseRole('merchant');
      setProfile(saved);

      Alert.alert(
        '🎉 Restaurant Listed Successfully!',
        `"${saved.name}" is now live on UniGo Food! Customers can now see your menu and place food orders.`,
        [
          {
            text: 'Go to Dashboard',
            style: 'default',
          },
          {
            text: 'View in Food App',
            onPress: () => handleOpenCustomerView('restaurant'),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Could not save restaurant profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#0F7A56" />
        <Text style={styles.muted}>Loading restaurant partner details…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace(user ? '/(rider)/(tabs)' : '/welcome'))}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {profile ? 'Merchant Partner Dashboard' : 'List Your Restaurant'}
          </Text>
          <Text style={styles.headerSub}>UniGo Food & Merchant Partner</Text>
        </View>
        <TouchableOpacity
          style={styles.switchRoleBtn}
          onPress={() => router.push(user ? '/role-selection' : '/welcome')}
        >
          <Ionicons name="swap-horizontal" size={16} color="#0F7A56" />
          <Text style={styles.switchRoleText}>Switch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!user && (
          <View style={styles.guestBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#B45309" />
            <Text style={styles.guestText}>
              Listing in demo mode.{' '}
              <Text style={styles.guestLink} onPress={() => router.push('/login')}>
                Log in or sign up
              </Text>{' '}
              to sync your eatery to your UniGo account.
            </Text>
          </View>
        )}
        {/* ─── CASE A: RESTAURANT ALREADY REGISTERED (DASHBOARD) ──── */}
        {profile ? (
          <>
            {/* Restaurant Profile Card */}
            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="restaurant" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.restaurantName}>{profile.name}</Text>
                  <Text style={styles.restaurantCuisine}>{profile.cuisine} · {profile.city}</Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>LIVE ON UNIGO</Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#047857" style={{ marginRight: 3 }} />
                      <Text style={styles.verifiedBadgeText}>FSSAI VERIFIED</Text>
                    </View>
                    {profile.veg && (
                      <View style={styles.vegBadge}>
                        <Text style={styles.vegBadgeText}>PURE VEG</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Toggle Live Orders */}
              <View style={styles.onlineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onlineTitle}>
                    {isOnline ? '🟢 Accepting Food Orders' : '🔴 Kitchen Closed'}
                  </Text>
                  <Text style={styles.onlineSub}>
                    {isOnline ? 'Customers can place orders from your menu' : 'Your store is marked closed'}
                  </Text>
                </View>
                <Switch
                  value={isOnline}
                  onValueChange={setIsOnline}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={isOnline ? '#0F7A56' : '#94A3B8'}
                />
              </View>
            </View>

            {/* Quick Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TODAY&#39;S ORDERS</Text>
                <Text style={styles.metricVal}>12</Text>
                <Text style={styles.metricSub}>All delivered</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TODAY&#39;S REVENUE</Text>
                <Text style={styles.metricVal}>₹2,840</Text>
                <Text style={styles.metricSub}>Direct to bank</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>RATING</Text>
                <Text style={styles.metricVal}>⭐ 5.0</Text>
                <Text style={styles.metricSub}>New Partner</Text>
              </View>
            </View>

            {/* Live Menu Items */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>Your Active Menu</Text>
                <Text style={styles.countText}>
                  {(profile.menu?.[0]?.items || []).length} items
                </Text>
              </View>

              {(profile.menu?.[0]?.items || []).map((item) => (
                <View key={item.id} style={styles.menuItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <Text style={styles.menuItemDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                  </View>
                  <View style={styles.inStockBadge}>
                    <Text style={styles.inStockText}>In Stock</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Actions */}
            <PressableScale
              style={styles.primaryBtn}
              onPress={() => handleOpenCustomerView('restaurant')}
            >
              <Ionicons name="eye-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>View My Live Restaurant</Text>
            </PressableScale>

            <PressableScale
              style={[styles.outlineBtn, { marginTop: 10 }]}
              onPress={() => handleOpenCustomerView('food')}
            >
              <Ionicons name="fast-food-outline" size={18} color="#0F7A56" style={{ marginRight: 8 }} />
              <Text style={styles.outlineBtnText}>Browse All UniGo Food</Text>
            </PressableScale>

            <PressableScale
              style={styles.outlineBtn}
              onPress={() => handleOpenCustomerView('customer')}
            >
              <Text style={styles.outlineBtnText}>Switch to Customer View</Text>
            </PressableScale>
          </>
        ) : (
          /* ─── CASE B: NEW RESTAURANT REGISTRATION ──────────────── */
          <>
            <View style={styles.bannerCard}>
              <Ionicons name="sparkles" size={24} color="#0F7A56" />
              <Text style={styles.bannerTitle}>Partner with UniGo Food</Text>
              <Text style={styles.bannerSub}>
                List your restaurant in 2 minutes. Receive orders directly from local customers across your city.
              </Text>
            </View>

            {/* Step 1: Restaurant Basic Info */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>1. Restaurant Details</Text>

              <Text style={styles.fieldLabel}>Restaurant / Shop Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Shree Ganesh Kathiyawadi"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.fieldLabel}>Owner / Manager Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Patel"
                value={ownerName}
                onChangeText={setOwnerName}
              />

              <Text style={styles.fieldLabel}>Contact Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98251 00000"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <View style={styles.cuisineHeaderRow}>
                <Text style={styles.fieldLabel}>
                  Cuisine Categories * ({selectedCuisines.length} selected)
                </Text>
                <TouchableOpacity onPress={selectAllCuisines}>
                  <Text style={styles.selectAllText}>
                    {selectedCuisines.length === CUISINE_OPTIONS.length ? 'Clear Selection' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldSubHint}>
                Select all cuisines that your restaurant serves. Customers can discover your food when filtering by any of these!
              </Text>
              <View style={styles.cuisineGrid}>
                {CUISINE_OPTIONS.map((c) => {
                  const selected = selectedCuisines.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.cuisineChip, selected && styles.cuisineChipActive]}
                      onPress={() => toggleCuisine(c.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={15}
                        color={selected ? '#0F7A56' : '#94A3B8'}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.cuisineEmoji}>{c.emoji}</Text>
                      <Text style={[styles.cuisineText, selected && styles.cuisineTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>100% Pure Vegetarian</Text>
                  <Text style={styles.switchSub}>Displays pure-veg leaf badge on UniGo</Text>
                </View>
                <Switch
                  value={veg}
                  onValueChange={setVeg}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={veg ? '#0F7A56' : '#94A3B8'}
                />
              </View>
            </View>

            {/* Step 2: Location & Delivery */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>2. Location & Delivery</Text>

              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Rajkot"
              />

              <Text style={styles.fieldLabel}>Address / Area *</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street address, landmark, area (e.g. Kalawad Road, Rajkot)"
                multiline
              />

              <Text style={styles.fieldLabel}>Avg. Preparation & Delivery Time</Text>
              <TextInput
                style={styles.input}
                value={deliveryTime}
                onChangeText={setDeliveryTime}
                placeholder="e.g. 20-25 min"
              />
            </View>

            {/* Step 3: Starter Menu */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>3. Signature Dishes (Menu)</Text>
              <Text style={styles.muted}>Add your top 2 popular dishes to get started.</Text>

              <Text style={styles.fieldLabel}>Dish 1 Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Special Kathiyawadi Thali"
                value={dish1Name}
                onChangeText={setDish1Name}
              />
              <Text style={styles.fieldLabel}>Dish 1 Price (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="150"
                keyboardType="numeric"
                value={dish1Price}
                onChangeText={setDish1Price}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Dish 2 Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Masala Chaas / Starter"
                value={dish2Name}
                onChangeText={setDish2Name}
              />
              <Text style={styles.fieldLabel}>Dish 2 Price (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="40"
                keyboardType="numeric"
                value={dish2Price}
                onChangeText={setDish2Price}
              />
            </View>

            {/* Step 4: Business & Safety Verification */}
            <View style={styles.card}>
              <View style={styles.verificationCardHeader}>
                <View style={styles.shieldIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#0F7A56" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>4. Business & Safety Verification</Text>
                  <Text style={styles.muted}>Builds trust with food buyers and enables daily payouts.</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>FSSAI License / Registration No.</Text>
              <TextInput
                style={styles.input}
                placeholder="14-digit FSSAI number (e.g. 10020021000123)"
                keyboardType="numeric"
                maxLength={14}
                value={fssai}
                onChangeText={setFssai}
              />
              <Text style={styles.fieldSubHint}>
                Food Safety and Standards Authority of India 14-digit registration number.
              </Text>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>GSTIN (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="15-character GST number (e.g. 24AAAAA0000A1Z5)"
                autoCapitalize="characters"
                maxLength={15}
                value={gstin}
                onChangeText={setGstin}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Bank Settlement UPI ID / Account</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. restaurant@upi or 9825100000@okaxis"
                autoCapitalize="none"
                value={upi}
                onChangeText={setUpi}
              />
              <Text style={styles.fieldSubHint}>
                Daily order revenue is settled directly to this account every evening.
              </Text>
            </View>

            {/* Submit Button */}
            <PressableScale
              style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? 'Registering Restaurant…' : 'Submit & List Restaurant Live'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </PressableScale>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  switchRoleText: { color: '#0F7A56', fontWeight: '800', fontSize: 12 },
  content: { padding: 16, gap: 14 },

  /* Banner */
  bannerCard: {
    backgroundColor: '#E6F4EA',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#065F46' },
  bannerSub: { fontSize: 13, color: '#047857', textAlign: 'center', lineHeight: 19 },

  /* Card */
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  countText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  muted: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 14,
  },

  /* Cuisine Grid */
  cuisineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cuisineChipActive: { backgroundColor: '#E6F4EA', borderColor: '#0F7A56' },
  cuisineEmoji: { fontSize: 16 },
  cuisineText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  cuisineTextActive: { color: '#0F7A56' },

  /* Switches */
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  switchSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  /* Dashboard View */
  profileHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0F7A56', alignItems: 'center', justifyContent: 'center' },
  restaurantName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  restaurantCuisine: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  activePill: { backgroundColor: '#E6F4EA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activePillText: { fontSize: 10, fontWeight: '800', color: '#0F7A56' },
  vegBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  vegBadgeText: { fontSize: 10, fontWeight: '800', color: '#166534' },

  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  onlineTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  onlineSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  /* Metrics */
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  metricVal: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginVertical: 4 },
  metricSub: { fontSize: 10, color: '#0F7A56', fontWeight: '700' },

  /* Menu Item Row */
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  menuItemName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  menuItemDesc: { fontSize: 12, color: '#64748B', marginTop: 1 },
  menuItemPrice: { fontSize: 13, fontWeight: '800', color: '#0F7A56', marginTop: 3 },
  inStockBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  inStockText: { fontSize: 11, fontWeight: '700', color: '#047857' },

  /* Buttons */
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#0F7A56',
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#0F7A56',
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  outlineBtnText: { color: '#0F7A56', fontSize: 14, fontWeight: '800' },

  /* Guest Banner */
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  guestText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  guestLink: {
    color: '#0F7A56',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  /* Multi-Select Cuisine Header */
  cuisineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F7A56',
  },
  fieldSubHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 4,
    lineHeight: 16,
  },

  /* Verification Badges */
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  verificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
