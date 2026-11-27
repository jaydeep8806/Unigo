import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FoodPhoto from '../../components/commerce/FoodPhoto';
import { useLocation } from '../../context/LocationProvider';
import { THEME } from '../../constants/theme';
import PressableScale from '../../components/PressableScale';
import { RESTAURANTS, FOOD_CATEGORIES, CUISINE_BANNERS } from '../../data/restaurants';
import { getMergedRestaurants } from '../../services/merchant';
import { useFoodCart } from '../../context/FoodCartProvider';

// ── Helpers ────────────────────────────────────────────────────────────
const ratingColor = (r) => (r >= 4 ? '#22C55E' : r >= 3 ? '#F59E0B' : '#EF4444');

// ── Component ──────────────────────────────────────────────────────────
export default function FoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedCity, coordinates } = useLocation();
  const { totalItems } = useFoodCart();

  const [allRestaurants, setAllRestaurants] = useState(RESTAURANTS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMergedRestaurants().then((merged) => {
        if (active) setAllRestaurants(merged);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  // ── Filter restaurants ───────────────────────────────────────────────
  const filteredRestaurants = useMemo(() => {
    let list = [...allRestaurants];

    if (activeCategory !== 'all') {
      list = list.filter(
        (r) =>
          r.category === activeCategory ||
          (Array.isArray(r.categories) && r.categories.includes(activeCategory))
      );
    }
    if (vegOnly) {
      list = list.filter((r) => r.veg);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.menu.some((section) => section.items.some((dish) => dish.name.toLowerCase().includes(q)))
      );
    }
    // Promoted first, then by rating
    list.sort((a, b) => {
      if (a.promoted && !b.promoted) return -1;
      if (!a.promoted && b.promoted) return 1;
      return b.rating - a.rating;
    });
    return list;
  }, [allRestaurants, search, activeCategory, vegOnly]);

  // ── Cuisine banner ───────────────────────────────────────────────────
  const renderCuisineBanner = useCallback(
    ({ item }) => (
      <PressableScale
        style={[styles.cuisineBanner, { backgroundColor: item.color }]}
        onPress={() =>
          setActiveCategory(item.id === 'offer' ? 'all' : item.id)
        }
      >
        <Text style={styles.cuisineEmoji}>{item.emoji}</Text>
        <Text style={styles.cuisineLabel}>{item.label}</Text>
      </PressableScale>
    ),
    []
  );

  // ── Category chip ────────────────────────────────────────────────────
  const renderCategoryChip = useCallback(
    ({ item }) => {
      const active = item.id === activeCategory;
      return (
        <PressableScale
          style={[styles.categoryChip, active && styles.categoryChipActive]}
          onPress={() => setActiveCategory(item.id)}
        >
          <Ionicons
            name={item.icon}
            size={14}
            color={active ? '#fff' : THEME.colors.text}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.categoryChipText,
              active && styles.categoryChipTextActive,
            ]}
          >
            {item.label}
          </Text>
        </PressableScale>
      );
    },
    [activeCategory]
  );

  // ── Restaurant card ──────────────────────────────────────────────────
  const renderRestaurant = useCallback(
    ({ item }) => (
      <PressableScale
        style={styles.restCard}
        onPress={() =>
          router.push({
            pathname: '/(rider)/restaurant',
            params: { id: item.id },
          })
        }
      >
        {/* Image placeholder with initial */}
        <View style={styles.restImageBox}>
          <LinearGradient
            colors={['#064E3B', '#0F7A56']}
            style={styles.restImageGradient}
          >
            <Text style={styles.restImageInitial}>
              {item.name.charAt(0)}
            </Text>
          </LinearGradient>

          <FoodPhoto id={item.id} category={item.category} style={StyleSheet.absoluteFill} />

          {/* Offer badge on image */}
          {item.offer ? (
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>{item.offer}</Text>
            </View>
          ) : null}

          {/* Promoted label */}
          {item.promoted ? (
            <View style={styles.promotedBadge}>
              <Ionicons name="megaphone" size={10} color="#F59E0B" />
              <Text style={styles.promotedText}>Ad</Text>
            </View>
          ) : null}
        </View>

        {/* Info section */}
        <View style={styles.restInfo}>
          <View style={styles.restNameRow}>
            <Text style={styles.restName} numberOfLines={1}>
              {item.name}
            </Text>
            {!item.informationOnly && <View
              style={[
                styles.ratingPill,
                { backgroundColor: ratingColor(item.rating) },
              ]}
            >
              <Text style={styles.ratingText}>{item.rating}</Text>
              <Ionicons name="star" size={10} color="#fff" />
            </View>}
          </View>

          <Text style={styles.restCuisine} numberOfLines={1}>
            {item.cuisine}
          </Text>

          {item.informationOnly ? <Text style={styles.metaText}>Menu information • {item.address}</Text> : <View style={styles.restMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={13}
                color={THEME.colors.mutedText}
              />
              <Text style={styles.metaText}>{item.deliveryTime}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={13}
                color={THEME.colors.mutedText}
              />
              <Text style={styles.metaText}>{item.distance}</Text>
            </View>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>
              {item.deliveryFee === 0
                ? 'FREE delivery'
                : `₹${item.deliveryFee} delivery`}
            </Text>
          </View>}

          {item.veg ? (
            <View style={styles.vegBadge}>
              <View style={styles.vegDot} />
              <Text style={styles.vegLabel}>Vegetarian menu</Text>
            </View>
          ) : null}
        </View>
      </PressableScale>
    ),
    [router]
  );

  // ── List header ──────────────────────────────────────────────────────
  const ListHeader = useMemo(
    () => (
      <View>
        {/* ── Location & search ──────────────────────────────────────── */}
        <LinearGradient
          colors={['#064E3B', '#0F7A56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          {/* Back + location row */}
          <View style={styles.headerRow}>
            <PressableScale
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </PressableScale>

            <View style={styles.locationCol}>
              <View style={styles.locRow}>
                <Ionicons
                  name="location-sharp"
                  size={16}
                  color={THEME.colors.accent}
                />
                <Text style={styles.locCity} numberOfLines={1}>
                  {selectedCity?.name || 'Rajkot'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
              </View>
              <Text style={styles.locSub} numberOfLines={1}>
                {coordinates
                  ? `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                  : 'Detecting your location…'}
              </Text>
            </View>
          </View>

          {totalItems > 0 ? (
            <PressableScale onPress={() => router.push('/(rider)/cart')} accessibilityRole="button" accessibilityLabel={`View cart, ${totalItems} items`} style={{ alignSelf: 'flex-end', padding: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>View cart ({totalItems}) →</Text>
            </PressableScale>
          ) : null}

          {/* Search bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={18}
                color={THEME.colors.mutedText}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for restaurants or cuisines…"
                placeholderTextColor={THEME.colors.mutedText}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 ? (
                <PressableScale onPress={() => setSearch('')}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={THEME.colors.mutedText}
                  />
                </PressableScale>
              ) : null}
            </View>

            {/* Veg toggle */}
            <PressableScale
              style={[styles.vegToggle, vegOnly && styles.vegToggleActive]}
              onPress={() => setVegOnly((prev) => !prev)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: vegOnly }}
              accessibilityLabel="Filter vegetarian only"
            >
              <View
                style={[
                  styles.vegToggleDot,
                  vegOnly && styles.vegToggleDotActive,
                ]}
              />
              <Text
                style={[
                  styles.vegToggleText,
                  vegOnly && styles.vegToggleTextActive,
                ]}
              >
                VEG
              </Text>
            </PressableScale>
          </View>
        </LinearGradient>

        {/* ── Cuisine banners ────────────────────────────────────────── */}
        <FlatList
          data={CUISINE_BANNERS}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cuisineScroll}
          renderItem={renderCuisineBanner}
        />

        {/* ── Category chips ─────────────────────────────────────────── */}
        <FlatList
          data={FOOD_CATEGORIES}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          renderItem={renderCategoryChip}
        />

        {/* ── Results header ─────────────────────────────────────────── */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {filteredRestaurants.length} restaurant
            {filteredRestaurants.length !== 1 ? 's' : ''} around you
          </Text>
          <Text style={styles.resultsSubtitle}>
            Delivering to {selectedCity?.name || 'Rajkot'}
          </Text>
        </View>
      </View>
    ),
    [
      insets.top,
      totalItems,
      search,
      vegOnly,
      selectedCity,
      coordinates,
      filteredRestaurants.length,
      renderCuisineBanner,
      renderCategoryChip,
      router,
    ]
  );

  // ── Empty state ──────────────────────────────────────────────────────
  const EmptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyCircle}>
          <Ionicons
            name="search-outline"
            size={36}
            color={THEME.colors.mutedText}
          />
        </View>
        <Text style={styles.emptyTitle}>No restaurants found</Text>
        <Text style={styles.emptySub}>
          Try a different search or category
        </Text>
      </View>
    ),
    []
  );

  const ListFooter = useMemo(
    () => (
      <View style={styles.partnerBanner}>
        <View style={styles.partnerBannerLeft}>
          <View style={styles.partnerIconBox}>
            <Ionicons name="restaurant" size={20} color="#0F7A56" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.partnerTitle}>Own a Restaurant or Food Shop?</Text>
            <Text style={styles.partnerSub}>
              List your eatery on UniGo Food in 2 minutes & start receiving orders!
            </Text>
          </View>
        </View>
        <PressableScale
          style={styles.partnerBtn}
          onPress={() => router.push('/restaurant-partner')}
        >
          <Text style={styles.partnerBtnText}>Partner With Us</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </PressableScale>
      </View>
    ),
    [router]
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredRestaurants}
        keyExtractor={(item) => item.id}
        renderItem={renderRestaurant}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{
          paddingBottom: totalItems > 0 ? insets.bottom + 80 : insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating View Cart bar */}
      {totalItems > 0 && (
        <View style={[styles.floatingCartWrap, { bottom: insets.bottom + 12 }]}>
          <PressableScale
            style={styles.floatingCartBtn}
            onPress={() => router.push('/(rider)/cart')}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingCartBadge}>
                <Text style={styles.floatingCartBadgeText}>{totalItems}</Text>
              </View>
              <Text style={styles.floatingCartText}>View Cart</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...THEME.shadows.header,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationCol: { flex: 1 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locCity: {
    color: '#fff',
    fontSize: 16,
    fontWeight: THEME.fontWeights.bold,
    maxWidth: 200,
  },
  locSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 2,
  },

  // ── Search ────────────────────────────────────────────────────────────
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.text,
    paddingVertical: 0,
  },
  vegToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  vegToggleActive: { backgroundColor: '#22C55E' },
  vegToggleDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  vegToggleDotActive: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  vegToggleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
  },
  vegToggleTextActive: { color: '#fff' },

  // ── Cuisine banners ───────────────────────────────────────────────────
  cuisineScroll: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  cuisineBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 84,
    borderRadius: 16,
    ...THEME.shadows.soft,
  },
  cuisineEmoji: { fontSize: 28, marginBottom: 4 },
  cuisineLabel: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
  },

  // ── Category chips ────────────────────────────────────────────────────
  categoryScroll: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  categoryChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
  },
  categoryChipTextActive: { color: '#fff' },

  // ── Results header ────────────────────────────────────────────────────
  resultsHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  resultsTitle: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  resultsSubtitle: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },

  // ── Restaurant card ───────────────────────────────────────────────────
  restCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  restImageBox: {
    height: 140,
    position: 'relative',
  },
  restImageGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restImageInitial: {
    fontSize: 48,
    fontWeight: THEME.fontWeights.extrabold,
    color: 'rgba(255,255,255,0.25)',
  },
  offerBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: THEME.fontWeights.extrabold,
  },
  promotedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  promotedText: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: THEME.fontWeights.semibold,
  },
  restInfo: { padding: 14 },
  restNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  restName: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    flex: 1,
    marginRight: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: THEME.fontWeights.bold,
  },
  restCuisine: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginBottom: 8,
  },
  restMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.mutedText,
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    fontWeight: THEME.fontWeights.regular,
  },
  vegBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  vegDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#22C55E',
  },
  vegLabel: {
    fontSize: 11,
    color: '#22C55E',
    fontWeight: THEME.fontWeights.bold,
  },

  // ── Empty state ───────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.tile,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.mutedText,
    textAlign: 'center',
  },

  /* Floating Cart */
  floatingCartWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  floatingCartBtn: {
    flexDirection: 'row',
    backgroundColor: '#0F7A56',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingCartBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  floatingCartText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  /* Merchant Partner Banner */
  partnerBanner: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 12,
  },
  partnerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#064E3B',
  },
  partnerSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  partnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F7A56',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  partnerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});

