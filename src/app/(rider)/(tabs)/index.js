import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  FlatList,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocation } from '../../../context/LocationProvider';
import { CITIES } from '../../../constants/config';
import { THEME } from '../../../constants/theme';
import PressableScale from '../../../components/PressableScale';
import Toast from '../../../components/Toast';

// ── Service tile images ──────────────────────────────────────────────
const RIDES_IMG = require('../../../../assets/images/services/rides.png');
const FOOD_IMG = require('../../../../assets/images/services/food.png');
const SHOPS_IMG = require('../../../../assets/images/services/shops.png');
const HOMESPA_IMG = require('../../../../assets/images/services/homespa.png');
const WALLET_IMG = require('../../../../assets/images/services/wallet.png');
const BOX_IMG = require('../../../../assets/images/services/box.png');
const DONATE_IMG = require('../../../../assets/images/services/donate.png');
const CARPOOL_IMG = require('../../../../assets/images/services/carpool.png');

// ── Other images ─────────────────────────────────────────────────────
const SKYLINE_IMG = require('../../../../assets/images/city/skyline.png');
const BANNER_IMG = require('../../../../assets/images/banners/carpool-banner.png');
const FOOD_BANNER_IMG = require('../../../../assets/images/banners/food-banner.png');

// TODO: Moto, Auto, Schedule ride-type tiles → show only on the booking screen
// (not on the home screen service grid)

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_H_PAD = 16;
const GRID_GAP = 10;
const TILE_W = (SCREEN_WIDTH - GRID_H_PAD * 2 - GRID_GAP * 3) / 4;
const TILE_H = 92;

// ── Info-card width: show part of the 3rd card ───────────────────────
const INFO_CARD_W = SCREEN_WIDTH * 0.42;

export default function RiderHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedCity, setCity } = useLocation();

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message = 'Coming soon') => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ── 8 service tiles (4 × 2 grid) ────────────────────────────────────
  const services = [
    {
      id: 'rides',
      title: 'Rides',
      badge: 'Popular',
      badgeType: 'popular',
      image: RIDES_IMG,
      onPress: () => router.push('/(rider)/book'),
    },
    {
      id: 'food',
      title: 'Food',
      badge: '50% Off',
      badgeType: 'discount',
      image: FOOD_IMG,
      onPress: () => showToast('UniGo Food is coming soon!'),
    },
    {
      id: 'shops',
      title: 'Shops',
      image: SHOPS_IMG,
      onPress: () => showToast('UniGo Shops is coming soon!'),
    },
    {
      id: 'homespa',
      title: 'Home & Spa',
      image: HOMESPA_IMG,
      onPress: () => showToast('Home & Spa services are coming soon!'),
    },
    {
      id: 'wallet',
      title: 'Wallet',
      image: WALLET_IMG,
      onPress: () => showToast('UniGo Wallet is coming soon!'),
    },
    {
      id: 'box',
      title: 'Box',
      badge: 'New',
      badgeType: 'new',
      image: BOX_IMG,
      onPress: () => showToast('UniGo Box is coming soon!'),
    },
    {
      id: 'donate',
      title: 'Donate',
      image: DONATE_IMG,
      onPress: () => showToast('UniGo Donate is coming soon!'),
    },
    {
      id: 'carpool',
      title: 'Carpool',
      badge: 'New',
      badgeType: 'new',
      image: CARPOOL_IMG,
      onPress: () => showToast('UniGo Carpool is coming soon!'),
    },
  ];

  // ── Info cards (Trip Essentials) ─────────────────────────────────────
  const infoCards = [
    {
      id: 'wallet',
      label: 'Balance',
      value: '₹0.00',
      icon: 'wallet-outline',
      image: WALLET_IMG,
      onPress: () => showToast('UniGo Wallet is coming soon!'),
    },
    {
      id: 'payment',
      label: 'Payment Method',
      value: 'Cash',
      subtitle: 'Pay driver directly in ₹',
      icon: 'cash-outline',
      onPress: () => showToast('Default payment method is Cash (₹)'),
    },
    {
      id: 'safety',
      label: 'Safety',
      value: 'Share trip & SOS',
      subtitle: 'Coming soon',
      icon: 'shield-checkmark-outline',
      onPress: () => showToast('Safety & SOS feature is coming soon!'),
    },
  ];

  // ── Render a single service tile ─────────────────────────────────────
  const renderTile = (service) => (
    <PressableScale
      key={service.id}
      style={styles.tile}
      onPress={service.onPress}
    >
      {/* Badge pill */}
      {service.badge ? (
        <View
          style={[
            styles.tileBadge,
            service.badgeType === 'popular' && styles.tileBadgePopular,
            service.badgeType === 'discount' && styles.tileBadgeDiscount,
            service.badgeType === 'new' && styles.tileBadgeNew,
          ]}
        >
          <Text
            style={[
              styles.tileBadgeText,
              service.badgeType === 'new' && styles.tileBadgeTextDark,
            ]}
          >
            {service.badge}
          </Text>
        </View>
      ) : null}

      {/* Illustration */}
      <Image
        source={service.image}
        style={styles.tileImage}
        contentFit="contain"
      />

      {/* Label */}
      <Text style={styles.tileLabel} numberOfLines={1}>
        {service.title}
      </Text>
    </PressableScale>
  );

  return (
    <View style={styles.screen}>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─────────────────────────────────────────────────────────────
            a. HEADER: LinearGradient (#064E3B to #0F7A56)
        ───────────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#064E3B', '#0F7A56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
        >
          {/* Top greeting & actions row */}
          <View style={styles.headerTopRow}>
            <View style={styles.headerGreetingCol}>
              <View style={styles.brandRow}>
                <Text style={styles.brandTitle}>UniGo</Text>
                <PressableScale
                  style={styles.locationChip}
                  onPress={() => setCityModalVisible(true)}
                >
                  <Ionicons name="location-sharp" size={13} color={THEME.colors.accent} />
                  <Text style={styles.locationChipText} numberOfLines={1}>
                    {selectedCity?.name || 'Rajkot'}
                  </Text>
                  <Ionicons name="chevron-down" size={11} color="rgba(255, 255, 255, 0.7)" />
                </PressableScale>
              </View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.headerSubtitle}>Where are you heading today?</Text>
            </View>

            {/* Notification Bell Button */}
            <PressableScale
              style={styles.bellButton}
              onPress={() => showToast('No new notifications')}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={21} color="#FFFFFF" />
              <View style={styles.bellBadgeDot} />
            </PressableScale>
          </View>

          {/* "Where to?" Search Bar */}
          <PressableScale
            style={styles.searchBar}
            onPress={() => router.push('/(rider)/book')}
            accessibilityLabel="Search destination"
          >
            <View style={styles.searchIconBox}>
              <Ionicons name="search" size={20} color={THEME.colors.primary} />
            </View>
            <Text style={styles.searchPlaceholder}>Where to?</Text>
            <View style={styles.bookPill}>
              <Text style={styles.bookPillText}>Book Ride</Text>
            </View>
          </PressableScale>
        </LinearGradient>

        {/* ─────────────────────────────────────────────────────────────
            b. SERVICES GRID: 4 × 2 white sheet overlapping the header
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.servicesSheetWrapper}>
          <View style={styles.servicesSheet}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Services</Text>
              <Text style={styles.sectionSublabel}>Tap to book or explore</Text>
            </View>

            {/* Row 1 */}
            <View style={styles.tileRow}>
              {services.slice(0, 4).map(renderTile)}
            </View>

            {/* Row 2 */}
            <View style={[styles.tileRow, { marginTop: GRID_GAP }]}>
              {services.slice(4, 8).map(renderTile)}
            </View>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            c. CITY CARD: Dark green gradient card with skyline & chevron
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.sectionWrapper}>
          <PressableScale onPress={() => setCityModalVisible(true)}>
            <LinearGradient
              colors={['#064E3B', '#0F7A56']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cityCard}
            >
              <View style={styles.cityCardLeft}>
                <View style={styles.cityBadge}>
                  <Text style={styles.cityBadgeText}>YOUR CITY</Text>
                </View>
                <Text style={styles.cityCardTitle}>
                  Selected city is {selectedCity?.name || 'Rajkot'}
                </Text>
                <Text style={styles.cityCardSubtitle}>Tap to switch city</Text>
              </View>

              <View style={styles.cityCardRight}>
                <Image
                  source={SKYLINE_IMG}
                  style={styles.skylineImage}
                  contentFit="contain"
                />
                <View style={styles.chevronCircle}>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </PressableScale>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            d. TRIP ESSENTIALS: Wallet, Payment, Safety info cards
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitleHeader}>Trip Essentials</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.infoCardsScroll}
          >
            {infoCards.map((card) => (
              <PressableScale
                key={card.id}
                style={styles.infoCard}
                onPress={card.onPress}
              >
                <View style={styles.infoCardTop}>
                  <View style={styles.infoCardIconCircle}>
                    <Ionicons
                      name={card.icon}
                      size={20}
                      color={THEME.colors.primary}
                    />
                  </View>
                  {card.image ? (
                    <Image
                      source={card.image}
                      style={styles.infoCardImage}
                      contentFit="contain"
                    />
                  ) : null}
                </View>
                <Text style={styles.infoCardLabel}>{card.label}</Text>
                <Text style={styles.infoCardValue}>{card.value}</Text>
                {card.subtitle ? (
                  <Text style={styles.infoCardSubtitle} numberOfLines={1}>
                    {card.subtitle}
                  </Text>
                ) : null}
              </PressableScale>
            ))}
          </ScrollView>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            e. OFFERS: Carpool promo + Food promo
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitleHeader}>Offers for you</Text>

          {/* Carpool promo */}
          <LinearGradient
            colors={['#064E3B', '#0A5C41']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <Image
              source={BANNER_IMG}
              style={styles.promoBannerImage}
              contentFit="cover"
            />
            <View style={styles.promoContent}>
              <Text style={styles.promoHeadline}>Ride together, save more</Text>
              <Text style={styles.promoSubtext}>
                Share a ride with people going your way and split the fare.
              </Text>

              <PressableScale
                style={styles.promoButton}
                onPress={() => showToast('UniGo Carpool is coming soon!')}
              >
                <Text style={styles.promoButtonText}>Try Carpool</Text>
                <Ionicons name="arrow-forward" size={14} color="#064E3B" style={{ marginLeft: 6 }} />
              </PressableScale>
            </View>
          </LinearGradient>

          {/* Food promo */}
          <View style={styles.foodPromoCard}>
            <Image
              source={FOOD_BANNER_IMG}
              style={styles.foodPromoBannerImage}
              contentFit="cover"
            />
            <View style={styles.foodPromoContent}>
              <Text style={styles.foodPromoHeadline}>
                Hungry? Get 50% off your first order
              </Text>
              <PressableScale
                style={styles.foodPromoButton}
                onPress={() => showToast('UniGo Food is coming soon!')}
              >
                <Text style={styles.foodPromoButtonText}>Order now</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </PressableScale>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
          CITY PICKER BOTTOM SHEET
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCityModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Choose City</Text>
                <Text style={styles.modalSubtitle}>Select your current city in India</Text>
              </View>
              <PressableScale
                onPress={() => setCityModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color={THEME.colors.text} />
              </PressableScale>
            </View>

            <FlatList
              data={CITIES}
              keyExtractor={(item) => item.name}
              contentContainerStyle={styles.cityListContent}
              renderItem={({ item }) => {
                const isSelected = selectedCity?.name === item.name;
                return (
                  <PressableScale
                    style={[styles.cityRow, isSelected && styles.cityRowSelected]}
                    onPress={async () => {
                      await setCity(item);
                      setCityModalVisible(false);
                      showToast(`City switched to ${item.name}`);
                    }}
                  >
                    <View
                      style={[
                        styles.cityIconBox,
                        isSelected && styles.cityIconBoxSelected,
                      ]}
                    >
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color={isSelected ? THEME.colors.primary : THEME.colors.mutedText}
                      />
                    </View>

                    <View style={styles.cityInfoCol}>
                      <Text
                        style={[
                          styles.cityNameText,
                          isSelected && styles.cityNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.cityStateText}>{item.state}</Text>
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={THEME.colors.primary}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={THEME.colors.border}
                      />
                    )}
                  </PressableScale>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── a. Header ────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingBottom: 40, // extra bottom space so the services sheet can overlap
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...THEME.shadows.header,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerGreetingCol: {
    flex: 1,
    paddingRight: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    gap: 4,
  },
  locationChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: THEME.fontWeights.semibold,
    maxWidth: 90,
  },
  greetingText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: THEME.fontWeights.regular,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.bold,
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 2,
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.accent,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    height: 54,
    paddingHorizontal: 14,
    ...THEME.shadows.card,
  },
  searchIconBox: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
  },
  bookPill: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
  },
  bookPillText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primaryDark,
  },

  // ── Sections ─────────────────────────────────────────────────────────
  sectionWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitleHeader: {
    fontSize: 17,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    marginBottom: 12,
  },

  // ── b. Services grid (white sheet overlapping header) ────────────────
  servicesSheetWrapper: {
    paddingHorizontal: 16,
    marginTop: -14, // overlap bottom of the gradient header
  },
  servicesSheet: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: GRID_H_PAD,
    ...THEME.shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  sectionSublabel: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    fontWeight: THEME.fontWeights.regular,
  },

  // ── Tile grid ────────────────────────────────────────────────────────
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tile: {
    width: TILE_W,
    height: TILE_H,
    backgroundColor: '#F0F4F2',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 6,
    paddingBottom: 6,
  },
  tileBadge: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radius.pill,
    zIndex: 2,
  },
  tileBadgePopular: {
    backgroundColor: THEME.colors.primary,
  },
  tileBadgeDiscount: {
    backgroundColor: THEME.colors.accent,
  },
  tileBadgeNew: {
    backgroundColor: THEME.colors.accent,
  },
  tileBadgeText: {
    fontSize: 8,
    fontWeight: THEME.fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tileBadgeTextDark: {
    color: THEME.colors.primaryDark,
  },
  tileImage: {
    width: 44,
    height: 44,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    textAlign: 'center',
  },

  // ── c. City Card ─────────────────────────────────────────────────────
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.radius.card,
    padding: 16,
    ...THEME.shadows.card,
  },
  cityCardLeft: {
    flex: 1,
    paddingRight: 8,
  },
  cityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.pill,
    marginBottom: 6,
  },
  cityBadgeText: {
    fontSize: 10,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.accent,
    letterSpacing: 0.8,
  },
  cityCardTitle: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.bold,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  cityCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
  },
  cityCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skylineImage: {
    width: 66,
    height: 66,
    borderRadius: 12,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // ── d. Info cards (Trip Essentials) ──────────────────────────────────
  infoCardsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  infoCard: {
    width: INFO_CARD_W,
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  infoCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardImage: {
    width: 34,
    height: 34,
  },
  infoCardLabel: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    fontWeight: THEME.fontWeights.regular,
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  infoCardSubtitle: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },

  // ── e. Promo banners ─────────────────────────────────────────────────
  promoCard: {
    borderRadius: THEME.radius.card,
    padding: 16,
    overflow: 'hidden',
    ...THEME.shadows.card,
  },
  promoBannerImage: {
    width: '100%',
    height: 124,
    borderRadius: 14,
    marginBottom: 14,
  },
  promoContent: {
    paddingHorizontal: 4,
  },
  promoHeadline: {
    fontSize: 17,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  promoSubtext: {
    fontSize: 13,
    color: '#D1FAE5',
    lineHeight: 18,
    marginBottom: 14,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: THEME.radius.pill,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.primaryDark,
  },

  // Food promo banner
  foodPromoCard: {
    marginTop: 14,
    borderRadius: THEME.radius.card,
    overflow: 'hidden',
    backgroundColor: THEME.colors.white,
    ...THEME.shadows.card,
  },
  foodPromoBannerImage: {
    width: '100%',
    height: 120,
  },
  foodPromoContent: {
    padding: 16,
  },
  foodPromoHeadline: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    marginBottom: 10,
    lineHeight: 20,
  },
  foodPromoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: THEME.radius.pill,
    alignSelf: 'flex-start',
  },
  foodPromoButtonText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
  },

  // ── Bottom Sheet Modal ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingBottom: 28,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityListContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.tile,
  },
  cityRowSelected: {
    backgroundColor: '#E6F4EA',
    borderBottomColor: 'transparent',
  },
  cityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.tile,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cityIconBoxSelected: {
    backgroundColor: '#C6F6D5',
  },
  cityInfoCol: {
    flex: 1,
  },
  cityNameText: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.text,
  },
  cityNameSelected: {
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.primaryDark,
  },
  cityStateText: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 1,
  },
});
