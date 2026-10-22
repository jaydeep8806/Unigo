import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../../context/LocationProvider';
import { CITIES } from '../../../constants/config';
import { THEME } from '../../../constants/theme';

export default function RiderHomeScreen() {
  const router = useRouter();
  const { selectedCity, setCity } = useLocation();
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastAnim] = useState(new Animated.Value(0));

  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2600),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const services = [
    {
      id: 'rides',
      title: 'Rides',
      icon: 'car-sport',
      active: true,
      onPress: () => router.push('/(rider)/book'),
    },
    {
      id: 'carpool',
      title: 'Carpool',
      icon: 'people',
      active: false,
      onPress: () => showToast('UniGo Carpool is coming soon for student ride sharing!'),
    },
    {
      id: 'schedule',
      title: 'Schedule',
      icon: 'calendar',
      active: false,
      onPress: () => showToast('Scheduled campus rides are coming soon!'),
    },
    {
      id: 'moto',
      title: 'Moto',
      icon: 'bicycle',
      active: false,
      onPress: () => showToast('UniGo Moto is coming soon for quick campus runs!'),
    },
    {
      id: 'auto',
      title: 'Auto',
      icon: 'navigate-circle',
      active: false,
      onPress: () => showToast('UniGo Auto is coming soon for economical commuting!'),
    },
  ];

  const infoCards = [
    {
      id: 'payment',
      icon: 'cash-outline',
      label: 'Payment Method',
      value: 'Cash',
      hint: 'Pay driver directly in INR',
    },
    {
      id: 'student_status',
      icon: 'school-outline',
      label: 'Student Status',
      value: 'Not verified',
      hint: 'Verify university email soon',
    },
    {
      id: 'safety',
      icon: 'shield-checkmark-outline',
      label: 'Safety',
      value: 'Share trip / SOS',
      hint: 'Campus emergency features',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Toast Notification */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="information-circle" size={18} color={THEME.colors.primaryDark} style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─────────────────────────────────────────────────────────────
            a. GREEN HEADER WITH "WHERE TO?" SEARCH BAR
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerBrand}>UniGo</Text>
              <Text style={styles.headerGreeting}>Where are you heading today?</Text>
            </View>
            <View style={styles.headerAvatarBadge}>
              <Ionicons name="school" size={20} color={THEME.colors.primary} />
            </View>
          </View>

          {/* Search Bar Button */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/(rider)/book')}
            activeOpacity={0.88}
          >
            <Ionicons name="search" size={20} color={THEME.colors.primary} style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>Where to?</Text>
            <View style={styles.searchActionPill}>
              <Text style={styles.searchActionText}>Book Ride</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            b. CITY CARD ("Selected city is {city}")
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.cityCard}
            onPress={() => setCityModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cityCardIconContainer}>
              <Ionicons name="business" size={22} color={THEME.colors.primary} />
            </View>
            <View style={styles.cityCardTextContainer}>
              <Text style={styles.cityCardLabel}>CAMPUS LOCATION</Text>
              <Text style={styles.cityCardTitle}>
                Selected city is {selectedCity?.name || 'Rajkot'}
              </Text>
              <Text style={styles.cityCardSubtitle}>Tap to switch city</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            c. WHITE ROUNDED SHEET WITH SERVICE TILES (4 per row)
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.servicesSheet}>
            <Text style={styles.sectionHeaderTitle}>Services</Text>
            <View style={styles.servicesGrid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceTile,
                    service.active && styles.serviceTileActive,
                  ]}
                  onPress={service.onPress}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.serviceTileIconContainer,
                      service.active && styles.serviceTileIconContainerActive,
                    ]}
                  >
                    <Ionicons
                      name={service.icon}
                      size={22}
                      color={service.active ? THEME.colors.primaryDark : THEME.colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.serviceTileLabel,
                      service.active && styles.serviceTileLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {service.title}
                  </Text>
                  {service.active && (
                    <View style={styles.serviceDot} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            d. HORIZONTALLY SCROLLABLE INFO CARDS
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Trip Essentials</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.infoCardsScroll}
          >
            {infoCards.map((card) => (
              <View key={card.id} style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <View style={styles.infoCardIconBox}>
                    <Ionicons name={card.icon} size={18} color={THEME.colors.primary} />
                  </View>
                  <Text style={styles.infoCardLabel}>{card.label}</Text>
                </View>
                <Text style={styles.infoCardValue}>{card.value}</Text>
                <Text style={styles.infoCardHint}>{card.hint}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            e. PROMO BANNER CARD
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.promoCard}>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>STUDENT COMMUNITY</Text>
            </View>
            <Text style={styles.promoTitle}>
              Ride with fellow students and split the fare
            </Text>
            <Text style={styles.promoSubtitle}>
              Affordable, reliable campus commutes across university hostels and transit spots.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* City Switcher Modal */}
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCityModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Choose City</Text>
                <TouchableOpacity
                  onPress={() => setCityModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Select the city where you are hailing or commuting:
              </Text>
            </View>

            <FlatList
              data={CITIES}
              keyExtractor={(item) => item.name}
              contentContainerStyle={styles.cityListContent}
              renderItem={({ item }) => {
                const isSelected = selectedCity?.name === item.name;
                return (
                  <TouchableOpacity
                    style={[styles.cityItem, isSelected && styles.cityItemActive]}
                    onPress={async () => {
                      await setCity(item);
                      setCityModalVisible(false);
                      showToast(`Switched city to ${item.name}`);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.cityIconCircle}>
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color={isSelected ? THEME.colors.primary : THEME.colors.textSecondary}
                      />
                    </View>
                    <View style={styles.cityTextCol}>
                      <Text style={[styles.cityName, isSelected && styles.cityNameActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.cityState}>{item.state}</Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={THEME.colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  toastContainer: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    ...THEME.shadows.floating,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.primaryDark,
  },

  // a. Green Header
  header: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.white,
    letterSpacing: 0.5,
  },
  headerGreeting: {
    fontSize: 13,
    color: '#D1FAE5',
    fontWeight: '500',
    marginTop: 2,
  },
  headerAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    height: 52,
    ...THEME.shadows.floating,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  searchActionPill: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
  },
  searchActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },

  // Section Container
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 10,
  },

  // b. City Card
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  cityCardIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cityCardTextContainer: {
    flex: 1,
  },
  cityCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.6,
  },
  cityCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  cityCardSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },

  // c. Services Sheet & Grid (4 per row)
  servicesSheet: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTile: {
    width: '23%',
    aspectRatio: 0.9,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  serviceTileActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: '#A7F3D0',
  },
  serviceTileIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTileIconContainerActive: {
    backgroundColor: '#DCFCE7',
  },
  serviceTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  serviceTileLabelActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  serviceDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
    marginTop: 3,
  },

  // d. Info Cards
  infoCardsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  infoCard: {
    width: 175,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  infoCardHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },

  // e. Promo Banner
  promoCard: {
    backgroundColor: '#064E3B',
    borderRadius: THEME.radius.xl,
    padding: 18,
    ...THEME.shadows.card,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    marginBottom: 10,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D1FAE5',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.white,
    marginBottom: 6,
    lineHeight: 22,
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    maxHeight: '75%',
    paddingBottom: 30,
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  cityListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceSubtle,
  },
  cityItemActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderBottomColor: 'transparent',
  },
  cityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cityTextCol: {
    flex: 1,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  cityNameActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  cityState: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
});
