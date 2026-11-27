import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/SessionProvider';
import { useRole } from '../context/RoleProvider';
import PressableScale from '../components/PressableScale';

export default function PartnerHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { chooseRole } = useRole();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.topbar}>
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace(user ? '/(rider)/(tabs)' : '/welcome'))}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#17382A" />
        </PressableScale>
        <View style={styles.brandRow}>
          <Ionicons name="navigate" size={18} color="#0F7A56" />
          <Text style={styles.brandText}>UniGo Partner Hub</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#0F7A56" />
            <Text style={styles.heroBadgeText}>GROW WITH UNIGO</Text>
          </View>
          <Text style={styles.title}>How would you like to partner?</Text>
          <Text style={styles.subtitle}>
            Join thousands of local partners making daily earnings on UniGo across rides and food delivery.
          </Text>
        </View>

        {/* Card 1: Driver Partner */}
        <View style={styles.partnerCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="car-sport" size={26} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={[styles.tag, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={[styles.tagText, { color: '#B45309' }]}>DAILY PAYOUTS · FLEXIBLE</Text>
              </View>
              <Text style={styles.cardTitle}>Driver & Delivery Partner</Text>
              <Text style={styles.cardSub}>Drive your Bike, Auto, or Cab</Text>
            </View>
          </View>

          <Text style={styles.cardDesc}>
            Take ride requests and parcel delivery orders around your city. Be your own boss with zero fixed shifts and instant fare calculation.
          </Text>

          <View style={styles.perksList}>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F7A56" />
              <Text style={styles.perkText}>100% daily earnings directly to bank</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F7A56" />
              <Text style={styles.perkText}>Drive two-wheelers, auto rickshaws, or cars</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F7A56" />
              <Text style={styles.perkText}>Quick license & vehicle verification</Text>
            </View>
          </View>

          <PressableScale
            style={styles.primaryBtn}
            onPress={async () => {
              if (user) {
                await chooseRole('driver');
              }
              router.push('/driver');
            }}
          >
            <Text style={styles.primaryBtnText}>Register as Driver Partner</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </PressableScale>
        </View>

        {/* Card 2: Restaurant & Shop Partner */}
        <View style={styles.partnerCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="restaurant" size={26} color="#0F7A56" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={[styles.tag, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.tagText, { color: '#047857' }]}>LOCAL FOOD & RETAIL</Text>
              </View>
              <Text style={styles.cardTitle}>Restaurant & Shop Partner</Text>
              <Text style={styles.cardSub}>List your eatery, cafe, or store</Text>
            </View>
          </View>

          <Text style={styles.cardDesc}>
            Put your menu in front of thousands of daily foodies in your area. Accept delivery orders, manage your kitchen in real time, and boost orders.
          </Text>

          <View style={styles.perksList}>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F7A56" />
              <Text style={styles.perkText}>Multi-cuisine menus & custom dishes</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F7A56" />
              <Text style={styles.perkText}>FSSAI & business safety verification</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#0F7A56" />
              <Text style={styles.perkText}>Live order alerts & merchant dashboard</Text>
            </View>
          </View>

          <PressableScale
            style={[styles.primaryBtn, { backgroundColor: '#0F7A56' }]}
            onPress={async () => {
              if (user) {
                await chooseRole('merchant');
              }
              router.push('/restaurant-partner');
            }}
          >
            <Text style={styles.primaryBtnText}>List Your Restaurant or Shop</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </PressableScale>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAF9' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontSize: 16, fontWeight: '800', color: '#17382A' },

  content: { padding: 18, gap: 16 },

  heroSection: { marginBottom: 6 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E4F4EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '800', color: '#0F7A56', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', lineHeight: 30 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 19, marginTop: 6 },

  partnerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  tagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 1 },

  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 14 },

  perksList: { gap: 8, marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  perkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkText: { fontSize: 12, color: '#334155', fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    minHeight: 48,
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
