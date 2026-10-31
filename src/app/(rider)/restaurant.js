import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { foodImage } from '../../data/foodImages';
import { THEME } from '../../constants/theme';
import PressableScale from '../../components/PressableScale';
import { RESTAURANTS } from '../../data/restaurants';

const { width: SW } = Dimensions.get('window');
const ratingColor = (r) => (r >= 4 ? '#22C55E' : r >= 3 ? '#F59E0B' : '#EF4444');

export default function RestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  const restaurant = useMemo(
    () => RESTAURANTS.find((r) => r.id === id),
    [id]
  );

  const [cart, setCart] = useState({}); // { itemId: qty }
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Cart helpers ─────────────────────────────────────────────────────
  const addToCart = (itemId) =>
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  const removeFromCart = (itemId) =>
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) next[itemId]--;
      else delete next[itemId];
      return next;
    });

  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);

  // Get all menu items flat for cart total
  const allItems = useMemo(() => {
    const map = {};
    restaurant?.menu.forEach((cat) =>
      cat.items.forEach((item) => {
        map[item.id] = item;
      })
    );
    return map;
  }, [restaurant]);

  const cartTotal = Object.entries(cart).reduce(
    (sum, [itemId, qty]) => sum + (allItems[itemId]?.price || 0) * qty,
    0
  );

  // ── Filter menu by search ───────────────────────────────────────────
  const sections = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (restaurant?.menu || [])
      .map((cat) => ({
        title: cat.category,
        data: q
          ? cat.items.filter(
              (i) =>
                i.name.toLowerCase().includes(q) ||
                (i.description && i.description.toLowerCase().includes(q))
            )
          : cat.items,
      }))
      .filter((s) => s.data.length > 0);
  }, [restaurant, searchQuery]);

  // ── Menu item ────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }) => {
      const qty = cart[item.id] || 0;
      return (
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            {/* Veg / non-veg indicator */}
            <View
              style={[
                styles.vegIcon,
                { borderColor: item.veg ? '#22C55E' : '#EF4444' },
              ]}
            >
              <View
                style={[
                  styles.vegIconDot,
                  { backgroundColor: item.veg ? '#22C55E' : '#EF4444' },
                ]}
              />
            </View>

            {item.bestseller ? (
              <View style={styles.bestsellerBadge}>
                <Ionicons name="ribbon" size={10} color="#F59E0B" />
                <Text style={styles.bestsellerText}>Bestseller</Text>
              </View>
            ) : null}

            <Text style={styles.menuItemName}>{item.name}</Text>
            <Text style={styles.menuItemPrice}>{item.price == null ? "Contact restaurant for price" : `₹${item.price}`}</Text>
            {item.description ? (
              <Text style={styles.menuItemDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>

          {/* Add button / qty control */}
          <View style={styles.menuItemRight}>
            {/* Item image placeholder */}
            <View style={styles.menuItemImage}>
              <LinearGradient
                colors={['#E6F4EA', '#D1FAE5']}
                style={styles.menuItemImageInner}
              >
                <Ionicons name="restaurant" size={20} color={THEME.colors.primary} />
              </LinearGradient>
              {foodImage(restaurant.category, item.name, item.id) ? <Image source={foodImage(restaurant.category, item.name, item.id)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
            </View>

            {restaurant.informationOnly ? null : qty === 0 ? (
              <PressableScale
                style={styles.addBtn}
                onPress={() => addToCart(item.id)}
              >
                <Text style={styles.addBtnText}>ADD</Text>
                <Ionicons name="add" size={14} color={THEME.colors.primary} />
              </PressableScale>
            ) : (
              <View style={styles.qtyControl}>
                <PressableScale
                  style={styles.qtyBtn}
                  accessibilityRole="button" accessibilityLabel={`Remove one ${item.name}`} onPress={() => removeFromCart(item.id)}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </PressableScale>
                <Text style={styles.qtyText}>{qty}</Text>
                <PressableScale
                  style={styles.qtyBtn}
                  accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`} onPress={() => addToCart(item.id)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </PressableScale>
              </View>
            )}
          </View>
        </View>
      );
    },
    [cart, restaurant?.category, restaurant?.informationOnly]
  );

  // ── Section header ──────────────────────────────────────────────────
  const renderSectionHeader = useCallback(
    ({ section: { title, data } }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>
          {data.length} item{data.length !== 1 ? 's' : ''}
        </Text>
      </View>
    ),
    []
  );

  if (!restaurant) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.errorText}>Restaurant not found</Text>
        <PressableScale style={styles.backBtnFloat} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </PressableScale>
      </View>
    );
  }

  // ── Restaurant header ───────────────────────────────────────────────
  const ListHeader = (
    <View>
      {/* Hero */}
      <LinearGradient
        colors={['#064E3B', '#0F7A56']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 10 }]}
      >
        {/* Top bar */}
        <View style={styles.heroTopBar}>
          <PressableScale style={styles.backBtnHero} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </PressableScale>
          <PressableScale
            style={styles.searchBtnHero}
            onPress={() => setSearchVisible(true)}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </PressableScale>
        </View>

        {/* Restaurant info */}
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{restaurant.name}</Text>
          <Text style={styles.heroCuisine}>{restaurant.cuisine}</Text>

          {restaurant.informationOnly ? <Text style={styles.heroMetaText}>Menu information • Contact restaurant to order</Text> : <View style={styles.heroMeta}>
            <View
              style={[
                styles.heroRating,
                { backgroundColor: ratingColor(restaurant.rating) },
              ]}
            >
              <Text style={styles.heroRatingText}>{restaurant.rating}</Text>
              <Ionicons name="star" size={11} color="#fff" />
            </View>
            <Text style={styles.heroMetaText}>
              {restaurant.reviewCount}+ ratings
            </Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroMetaText}>{restaurant.deliveryTime}</Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroMetaText}>{restaurant.distance}</Text>
          </View>}

          {restaurant.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.addressText}>{restaurant.address}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      {/* Offer strip */}
      {restaurant.offer ? (
        <View style={styles.offerStrip}>
          <View style={styles.offerStripLeft}>
            <Ionicons name="pricetag" size={16} color="#1E3A5F" />
            <Text style={styles.offerStripText}>{restaurant.offer}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.mutedText} />
        </View>
      ) : null}

      {/* Delivery info bar */}
      {restaurant.informationOnly ? <Text style={{ marginHorizontal: 16, marginTop: 12, color: THEME.colors.mutedText }}>Menu highlights and prices may change. Contact the restaurant to confirm.</Text> : <View style={styles.deliveryBar}>
        <View style={styles.deliveryItem}>
          <Ionicons name="bicycle-outline" size={16} color={THEME.colors.primary} />
          <Text style={styles.deliveryLabel}>
            {restaurant.deliveryFee === 0
              ? 'FREE delivery'
              : `₹${restaurant.deliveryFee} delivery`}
          </Text>
        </View>
        <View style={styles.deliverySep} />
        <View style={styles.deliveryItem}>
          <Ionicons name="time-outline" size={16} color={THEME.colors.primary} />
          <Text style={styles.deliveryLabel}>{restaurant.deliveryTime}</Text>
        </View>
        {restaurant.veg ? (
          <>
            <View style={styles.deliverySep} />
            <View style={styles.deliveryItem}>
              <View style={styles.vegDotSmall} />
              <Text style={styles.deliveryLabel}>Vegetarian menu</Text>
            </View>
          </>
        ) : null}
      </View>}

      {/* Menu title */}
      <View style={styles.menuTitleRow}>
        <View>
          <Text style={styles.menuTitle}>MENU</Text>
          <View style={styles.menuTitleUnderline} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: totalItems > 0 ? 100 : insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Cart bar ──────────────────────────────────────────────────── */}
      {totalItems > 0 ? (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.cartBarInner}>
            <View>
              <Text style={styles.cartItems}>
                {totalItems} item{totalItems !== 1 ? 's' : ''} added
              </Text>
              <Text style={styles.cartTotal}>₹{cartTotal}</Text>
            </View>
            <PressableScale
              style={styles.cartBtn}
              onPress={() =>
                router.push({
                  pathname: '/(rider)/cart',
                  params: {
                    restaurantId: restaurant.id,
                    cart: JSON.stringify(cart),
                  },
                })
              }
            >
              <Text style={styles.cartBtnText}>View Cart</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </PressableScale>
          </View>
        </View>
      ) : null}

      {/* ── Search modal ──────────────────────────────────────────────── */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSearchVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.searchModal}>
          <View style={[styles.searchModalBar, { paddingTop: insets.top + 8 }]}>
            <PressableScale
              onPress={() => {
                setSearchVisible(false);
                setSearchQuery('');
              }}
            >
              <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
            </PressableScale>
            <View style={styles.searchModalInput}>
              <Ionicons name="search" size={18} color={THEME.colors.mutedText} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Pressable>
                  <View pointerEvents="box-none">
                    <View style={{ height: 40, justifyContent: 'center' }}>
                      <Text
                        style={{
                          fontSize: 14,
                          color: searchQuery
                            ? THEME.colors.text
                            : THEME.colors.mutedText,
                        }}
                      >
                        {searchQuery || `Search in ${restaurant.name}`}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  errorText: {
    fontSize: 16,
    color: THEME.colors.mutedText,
    textAlign: 'center',
    marginTop: 40,
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...THEME.shadows.header,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtnHero: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnFloat: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnHero: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: { paddingHorizontal: 4 },
  heroName: {
    fontSize: 24,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#fff',
    marginBottom: 4,
  },
  heroCuisine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  heroRatingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: THEME.fontWeights.semibold,
  },
  heroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  addressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },

  // ── Offer strip ───────────────────────────────────────────────────────
  offerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  offerStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerStripText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: '#1E3A5F',
  },

  // ── Delivery bar ──────────────────────────────────────────────────────
  deliveryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  deliverySep: {
    width: 1,
    height: 20,
    backgroundColor: THEME.colors.border,
  },
  deliveryLabel: {
    fontSize: 12,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeights.semibold,
  },
  vegDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#22C55E',
  },

  // ── Menu title ────────────────────────────────────────────────────────
  menuTitleRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
    letterSpacing: 2,
  },
  menuTitleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
    marginTop: 4,
  },

  // ── Section header ────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
  },
  sectionCount: {
    fontSize: 12,
    color: THEME.colors.mutedText,
  },

  // ── Menu item ─────────────────────────────────────────────────────────
  menuItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  menuItemLeft: { flex: 1, paddingRight: 12 },
  vegIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  vegIconDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  bestsellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  bestsellerText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: THEME.fontWeights.bold,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    marginBottom: 6,
  },
  menuItemDesc: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    lineHeight: 17,
  },
  menuItemRight: { alignItems: 'center', width: 100 },
  menuItemImage: {
    width: 90,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  menuItemImageInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
    gap: 2,
    ...THEME.shadows.soft,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.primary,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#fff',
    minWidth: 20,
    textAlign: 'center',
  },

  // ── Cart bar ──────────────────────────────────────────────────────────
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    ...THEME.shadows.floating,
  },
  cartBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItems: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    fontWeight: THEME.fontWeights.semibold,
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  cartBtnText: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: '#fff',
  },

  // ── Search modal ──────────────────────────────────────────────────────
  searchModal: { flex: 1, backgroundColor: '#fff' },
  searchModalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 12,
  },
  searchModalInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.tile,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
});

