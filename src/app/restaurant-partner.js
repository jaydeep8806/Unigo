import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  approveMerchantRestaurant,
  rejectMerchantRestaurant,
  addDishToMerchantRestaurant,
  deleteDishFromMerchantRestaurant,
  toggleDishStock,
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

const DISH_PHOTO_PRESETS = [
  { id: 'thali', label: 'Thali & Meals', emoji: '🍽️' },
  { id: 'gujarati', label: 'Sabzi & Dal', emoji: '🍛' },
  { id: 'punjabi', label: 'Paneer & Gravy', emoji: '🥘' },
  { id: 'biryani', label: 'Biryani & Pulao', emoji: '🍲' },
  { id: 'dosa', label: 'Dosa & Idli', emoji: '🫓' },
  { id: 'pizza', label: 'Pizza & Pasta', emoji: '🍕' },
  { id: 'burger', label: 'Burgers & Fries', emoji: '🍔' },
  { id: 'chinese', label: 'Noodles & Asian', emoji: '🥡' },
  { id: 'street_food', label: 'Chaat & Snacks', emoji: '🍟' },
  { id: 'sandwich', label: 'Sandwich & Wraps', emoji: '🥪' },
  { id: 'cafe', label: 'Coffee & Drinks', emoji: '☕' },
  { id: 'dessert', label: 'Sweets & Desserts', emoji: '🍰' },
  { id: 'icecream', label: 'Ice Cream & Shakes', emoji: '🍨' },
];

const DISH_SECTION_OPTIONS = [
  'House Specials',
  'Main Course',
  'Starters & Appetizers',
  'Breads & Roti',
  'Beverages & Shakes',
  'Desserts & Sweets',
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
  const [adminBusy, setAdminBusy] = useState(false);

  // Form State for Registration
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

  // Starter Menu items
  const [dish1Name, setDish1Name] = useState('');
  const [dish1Price, setDish1Price] = useState('140');
  const [dish2Name, setDish2Name] = useState('');
  const [dish2Price, setDish2Price] = useState('220');

  // Add Dish Modal State
  const [dishModalVisible, setDishModalVisible] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('House Specials');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishVeg, setNewDishVeg] = useState(true);
  const [newDishBestseller, setNewDishBestseller] = useState(false);
  const [newDishPhotoPreset, setNewDishPhotoPreset] = useState('thali');

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
          inStock: true,
          photoCategory: primaryCategory,
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
          inStock: true,
          photoCategory: primaryCategory,
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
                    inStock: true,
                    photoCategory: 'thali',
                  },
                ],
        },
      ];

      // New registrations are put UNDER ADMIN REVIEW
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
        status: 'under_review',
        verified: false,
        menu,
      });

      await chooseRole('merchant');
      setProfile(saved);

      Alert.alert(
        '📝 Application Under Admin Review',
        `"${saved.name}" has been registered and submitted with FSSAI verification details.\n\nTo ensure food safety & catalog quality, all listings are reviewed by UniGo Admin before becoming visible to public customers. You can manage your menu and test the approval workflow right in your Merchant Dashboard!`,
        [
          {
            text: 'Go to Dashboard',
            style: 'default',
          },
          {
            text: 'Preview Menu',
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

  // Admin Simulation Handlers
  const handleAdminApprove = async () => {
    if (!profile?.id) return;
    setAdminBusy(true);
    try {
      const updated = await approveMerchantRestaurant(profile.id);
      setProfile(updated);
      Alert.alert(
        '🎉 Restaurant Approved!',
        `"${updated.name}" is now officially verified by UniGo Admin and LIVE on the public food catalog!`
      );
    } catch {
      Alert.alert('Error', 'Failed to approve restaurant.');
    } finally {
      setAdminBusy(false);
    }
  };

  const handleAdminRevoke = async () => {
    if (!profile?.id) return;
    setAdminBusy(true);
    try {
      const updated = await rejectMerchantRestaurant(profile.id, 'Moved back to review by admin');
      setProfile(updated);
      Alert.alert(
        '⏳ Verification Revoked',
        `"${updated.name}" has been placed back under review and is now hidden from public customer searches.`
      );
    } catch {
      Alert.alert('Error', 'Failed to update review status.');
    } finally {
      setAdminBusy(false);
    }
  };

  // Dish Management Handlers
  const handleAddDish = async () => {
    if (!newDishName.trim()) {
      Alert.alert('Required', 'Please enter a dish name.');
      return;
    }
    const priceNum = parseFloat(newDishPrice);
    if (!priceNum || priceNum <= 0) {
      Alert.alert('Required', 'Please enter a valid price in ₹ (e.g. 150).');
      return;
    }

    try {
      const updated = await addDishToMerchantRestaurant(profile.id, {
        name: newDishName.trim(),
        price: priceNum,
        description: newDishDesc.trim() || 'Freshly prepared specialty of the house',
        category: newDishCategory,
        veg: newDishVeg,
        bestseller: newDishBestseller,
        photoCategory: newDishPhotoPreset,
      });
      setProfile(updated);
      setDishModalVisible(false);
      setNewDishName('');
      setNewDishPrice('');
      setNewDishDesc('');
      setNewDishVeg(true);
      setNewDishBestseller(false);
      setNewDishPhotoPreset('thali');
      Alert.alert('Dish Added', `"${newDishName.trim()}" has been added to your menu!`);
    } catch {
      Alert.alert('Error', 'Failed to add dish to menu.');
    }
  };

  const handleDeleteDish = (dishId, dishName) => {
    Alert.alert(
      'Delete Dish',
      `Are you sure you want to remove "${dishName}" from your menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deleteDishFromMerchantRestaurant(profile.id, dishId);
              setProfile(updated);
            } catch {
              Alert.alert('Error', 'Failed to delete dish.');
            }
          },
        },
      ]
    );
  };

  const handleToggleStock = async (dishId) => {
    try {
      const updated = await toggleDishStock(profile.id, dishId);
      setProfile(updated);
    } catch {
      Alert.alert('Error', 'Failed to update item availability.');
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

  const isApproved = profile?.status === 'approved';

  // Aggregate all dishes across sections for easy management
  const allDishes = (profile?.menu || []).flatMap((section) =>
    (section.items || []).map((item) => ({ ...item, sectionName: section.category }))
  );

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
        {/* ─── CASE A: RESTAURANT ALREADY REGISTERED (DASHBOARD) ──── */}
        {profile ? (
          <>
            {/* 1. Admin Verification Status Card */}
            {isApproved ? (
              <View style={styles.verifiedAdminCard}>
                <View style={styles.statusRow}>
                  <View style={styles.statusIconVerified}>
                    <Ionicons name="shield-checkmark" size={20} color="#047857" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.statusHeaderRow}>
                      <Text style={styles.statusTitleVerified}>Verified & Live on UniGo Food</Text>
                      <View style={styles.approvedPill}>
                        <Text style={styles.approvedPillText}>PUBLIC</Text>
                      </View>
                    </View>
                    <Text style={styles.statusDescVerified}>
                      FSSAI license verified ({profile.fssai || 'Active'}). Customers across {profile.city} can find your restaurant and place orders.
                    </Text>
                  </View>
                </View>

                {/* Admin Sandbox Action */}
                <TouchableOpacity
                  style={styles.adminActionOutlineBtn}
                  onPress={handleAdminRevoke}
                  disabled={adminBusy}
                  activeOpacity={0.7}
                >
                  <Ionicons name="settings-outline" size={14} color="#64748B" />
                  <Text style={styles.adminActionOutlineText}>
                    {adminBusy ? 'Updating…' : 'Admin Control: Revoke Verification (Return to Review)'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pendingAdminCard}>
                <View style={styles.statusRow}>
                  <View style={styles.statusIconPending}>
                    <Ionicons name="hourglass-outline" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.statusHeaderRow}>
                      <Text style={styles.statusTitlePending}>Application Under Admin Review</Text>
                      <View style={styles.pendingPill}>
                        <Text style={styles.pendingPillText}>PENDING</Text>
                      </View>
                    </View>
                    <Text style={styles.statusDescPending}>
                      To protect customers and ensure food safety, UniGo Admin verifies FSSAI registration ({profile.fssai || 'In Progress'}). Your listing remains <Text style={{ fontWeight: '800' }}>hidden from public customers</Text> until verified.
                    </Text>
                  </View>
                </View>

                {/* Admin Sandbox Action */}
                <View style={styles.adminBox}>
                  <View style={styles.adminBoxHeader}>
                    <Ionicons name="shield-outline" size={14} color="#92400E" />
                    <Text style={styles.adminBoxTitle}>ADMIN VERIFICATION DESK</Text>
                  </View>
                  <Text style={styles.adminBoxSub}>
                    Complete verification to publish this restaurant live to all public customers.
                  </Text>
                  <TouchableOpacity
                    style={styles.adminApproveBtn}
                    onPress={handleAdminApprove}
                    disabled={adminBusy}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.adminApproveBtnText}>
                      {adminBusy ? 'Approving…' : '✓ Approve & Publish Live on UniGo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 2. Restaurant Profile Card */}
            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="restaurant" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.restaurantName}>{profile.name}</Text>
                  <Text style={styles.restaurantCuisine}>{profile.cuisine} · {profile.city}</Text>
                  <View style={styles.badgeRow}>
                    <View style={isApproved ? styles.activePill : styles.reviewPill}>
                      <Text style={isApproved ? styles.activePillText : styles.reviewPillText}>
                        {isApproved ? 'LIVE ON UNIGO' : 'UNDER REVIEW'}
                      </Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#047857" style={{ marginRight: 3 }} />
                      <Text style={styles.verifiedBadgeText}>FSSAI</Text>
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

            {/* 3. Quick Metrics */}
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

            {/* 4. Dishes & Menu Management */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Your Menu & Dishes</Text>
                  <Text style={styles.countText}>{allDishes.length} items listed</Text>
                </View>
                <TouchableOpacity
                  style={styles.addDishHeaderBtn}
                  onPress={() => setDishModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={16} color="#fff" />
                  <Text style={styles.addDishHeaderBtnText}>Add New Dish</Text>
                </TouchableOpacity>
              </View>

              {allDishes.length === 0 ? (
                <View style={styles.emptyMenuBox}>
                  <Text style={styles.emptyMenuEmoji}>🍲</Text>
                  <Text style={styles.emptyMenuTitle}>No dishes added yet</Text>
                  <Text style={styles.emptyMenuSub}>Tap &quot;Add New Dish&quot; above to list your specialties and photos.</Text>
                </View>
              ) : (
                allDishes.map((item) => {
                  const preset = DISH_PHOTO_PRESETS.find((p) => p.id === item.photoCategory) || DISH_PHOTO_PRESETS[0];
                  const isInStock = item.inStock !== false;

                  return (
                    <View key={item.id} style={styles.dishCard}>
                      <View style={styles.dishLeftCol}>
                        <View style={styles.dishTitleRow}>
                          {/* Veg/Non-veg Dot */}
                          <View
                            style={[
                              styles.vegIndicator,
                              { borderColor: item.veg ? '#166534' : '#DC2626' },
                            ]}
                          >
                            <View
                              style={[
                                styles.vegDot,
                                { backgroundColor: item.veg ? '#166534' : '#DC2626' },
                              ]}
                            />
                          </View>
                          <Text style={styles.dishName}>{item.name}</Text>
                          {item.bestseller && (
                            <View style={styles.bestsellerPill}>
                              <Text style={styles.bestsellerText}>Bestseller</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.dishCategoryTag}>{item.sectionName || 'Special'}</Text>
                        {item.description ? (
                          <Text style={styles.dishDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                        <Text style={styles.dishPrice}>₹{item.price}</Text>
                      </View>

                      {/* Right Column: Visual Photo Preset, Stock Toggle & Delete */}
                      <View style={styles.dishRightCol}>
                        <View style={styles.dishPhotoBox}>
                          <Text style={styles.dishPhotoEmoji}>{preset.emoji}</Text>
                          <Text style={styles.dishPhotoLabel} numberOfLines={1}>{preset.label.split('&')[0]}</Text>
                        </View>

                        <View style={styles.dishActionRow}>
                          <TouchableOpacity
                            style={[
                              styles.stockBtn,
                              isInStock ? styles.stockBtnIn : styles.stockBtnOut,
                            ]}
                            onPress={() => handleToggleStock(item.id)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.stockBtnText,
                                isInStock ? styles.stockBtnTextIn : styles.stockBtnTextOut,
                              ]}
                            >
                              {isInStock ? 'In Stock' : 'Out of Stock'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteDish(item.id, item.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* 5. Navigation Actions */}
            <PressableScale
              style={styles.primaryBtn}
              onPress={() => handleOpenCustomerView('restaurant')}
            >
              <Ionicons name="eye-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Preview Restaurant Menu</Text>
            </PressableScale>

            <PressableScale
              style={[styles.outlineBtn, { marginTop: 10 }]}
              onPress={() => handleOpenCustomerView('food')}
            >
              <Ionicons name="fast-food-outline" size={18} color="#0F7A56" style={{ marginRight: 8 }} />
              <Text style={styles.outlineBtnText}>Browse Public UniGo Food</Text>
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
              <Text style={styles.muted}>Add your top dishes now. You can add more with photos in your dashboard anytime.</Text>

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
                  <Text style={styles.muted}>Required by UniGo Admin to approve and publish your listing.</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>FSSAI License / Registration No. *</Text>
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
                {submitting ? 'Registering Restaurant…' : 'Submit for Admin Review'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </PressableScale>
          </>
        )}
      </ScrollView>

      {/* ─── ADD NEW DISH MODAL ────────────────────────────────────── */}
      <Modal
        visible={dishModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDishModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Dish</Text>
                <Text style={styles.modalSub}>Add item details, pricing & photo style</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDishModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>Dish Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Paneer Butter Masala, Special Dosa"
                value={newDishName}
                onChangeText={setNewDishName}
              />

              <Text style={styles.fieldLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 180"
                keyboardType="numeric"
                value={newDishPrice}
                onChangeText={setNewDishPrice}
              />

              <Text style={styles.fieldLabel}>Menu Section / Category</Text>
              <View style={styles.presetGrid}>
                {DISH_SECTION_OPTIONS.map((sec) => {
                  const isSelected = newDishCategory === sec;
                  return (
                    <TouchableOpacity
                      key={sec}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => setNewDishCategory(sec)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextActive,
                        ]}
                      >
                        {sec}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Dish Photo & Visual Preset *</Text>
              <Text style={styles.fieldSubHint}>
                Select the food style that best represents this dish in customer menus:
              </Text>
              <View style={styles.photoPresetGrid}>
                {DISH_PHOTO_PRESETS.map((preset) => {
                  const isSelected = newDishPhotoPreset === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.photoPresetChip,
                        isSelected && styles.photoPresetChipActive,
                      ]}
                      onPress={() => setNewDishPhotoPreset(preset.id)}
                    >
                      <Text style={styles.photoPresetEmoji}>{preset.emoji}</Text>
                      <Text
                        style={[
                          styles.photoPresetLabel,
                          isSelected && styles.photoPresetLabelActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="Fresh ingredients, spices, accompaniments..."
                value={newDishDesc}
                onChangeText={setNewDishDesc}
                multiline
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>100% Pure Vegetarian</Text>
                  <Text style={styles.switchSub}>Shows green veg icon on food card</Text>
                </View>
                <Switch
                  value={newDishVeg}
                  onValueChange={setNewDishVeg}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={newDishVeg ? '#0F7A56' : '#94A3B8'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Chef&#39;s Bestseller</Text>
                  <Text style={styles.switchSub}>Displays golden Bestseller badge</Text>
                </View>
                <Switch
                  value={newDishBestseller}
                  onValueChange={setNewDishBestseller}
                  trackColor={{ false: '#CBD5E1', true: '#FEF08A' }}
                  thumbColor={newDishBestseller ? '#D97706' : '#94A3B8'}
                />
              </View>

              <PressableScale style={styles.primaryBtn} onPress={handleAddDish}>
                <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Add Dish to Menu</Text>
              </PressableScale>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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

  /* Admin Review / Verified Cards */
  verifiedAdminCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 12,
  },
  pendingAdminCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  statusRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  statusIconVerified: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconPending: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusTitleVerified: { fontSize: 15, fontWeight: '800', color: '#166534' },
  statusTitlePending: { fontSize: 15, fontWeight: '800', color: '#92400E' },
  statusDescVerified: { fontSize: 12, color: '#15803D', lineHeight: 18, marginTop: 4 },
  statusDescPending: { fontSize: 12, color: '#B45309', lineHeight: 18, marginTop: 4 },
  approvedPill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  approvedPillText: { fontSize: 10, fontWeight: '800', color: '#166534' },
  pendingPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pendingPillText: { fontSize: 10, fontWeight: '800', color: '#B45309' },

  adminActionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  adminActionOutlineText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  adminBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  adminBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminBoxTitle: { fontSize: 11, fontWeight: '800', color: '#92400E', letterSpacing: 0.5 },
  adminBoxSub: { fontSize: 12, color: '#78350F', lineHeight: 16 },
  adminApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F7A56',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  adminApproveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

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
  countText: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 1 },
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
  reviewPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reviewPillText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
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

  /* Add Dish Header Btn */
  addDishHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F7A56',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  addDishHeaderBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  /* Empty Menu */
  emptyMenuBox: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyMenuEmoji: { fontSize: 32 },
  emptyMenuTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  emptyMenuSub: { fontSize: 12, color: '#64748B', textAlign: 'center' },

  /* Dish Card in Merchant Dashboard */
  dishCard: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  dishLeftCol: { flex: 1, gap: 3 },
  dishTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  vegIndicator: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  dishName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  bestsellerPill: { backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 },
  bestsellerText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  dishCategoryTag: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  dishDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  dishPrice: { fontSize: 14, fontWeight: '900', color: '#0F7A56', marginTop: 2 },

  dishRightCol: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  dishPhotoBox: {
    width: 70,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dishPhotoEmoji: { fontSize: 22 },
  dishPhotoLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', marginTop: 1 },
  dishActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stockBtnIn: { backgroundColor: '#ECFDF5' },
  stockBtnOut: { backgroundColor: '#FEE2E2' },
  stockBtnText: { fontSize: 10, fontWeight: '800' },
  stockBtnTextIn: { color: '#047857' },
  stockBtnTextOut: { color: '#DC2626' },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  /* Add Dish Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 20, paddingTop: 14 },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: { backgroundColor: '#E6F4EA', borderColor: '#0F7A56' },
  presetChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  presetChipTextActive: { color: '#0F7A56' },

  photoPresetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  photoPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoPresetChipActive: { backgroundColor: '#E6F4EA', borderColor: '#0F7A56' },
  photoPresetEmoji: { fontSize: 16 },
  photoPresetLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  photoPresetLabelActive: { color: '#0F7A56' },
});
