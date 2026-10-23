import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { THEME } from '../../constants/theme';
import { DONATE_UPI_ID, DONATE_NAME, CURRENCY_SYMBOL } from '../../constants/config';
import PressableScale from '../../components/PressableScale';

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function DonateScreen() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState(null); // null = "Any amount"

  const upiLink = useMemo(() => {
    let link = `upi://pay?pa=${DONATE_UPI_ID}&pn=${encodeURIComponent(DONATE_NAME)}&cu=INR`;
    if (selectedAmount !== null) {
      link += `&am=${selectedAmount}`;
    }
    return link;
  }, [selectedAmount]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#064E3B', '#0F7A56']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </PressableScale>
        <Ionicons name="heart" size={22} color={THEME.colors.accent} style={{ marginRight: 8 }} />
        <Text style={styles.headerTitle}>Donate</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* QR Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={upiLink}
              size={220}
              backgroundColor="#FFFFFF"
              color="#0F172A"
            />
          </View>
          <Text style={styles.scanLabel}>Scan to donate</Text>
          <Text style={styles.nameLabel}>{DONATE_NAME}</Text>

          {selectedAmount !== null && (
            <View style={styles.amountPill}>
              <Text style={styles.amountPillText}>{CURRENCY_SYMBOL}{selectedAmount}</Text>
            </View>
          )}
        </View>

        {/* Quick amount chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose amount</Text>
          <View style={styles.chipsRow}>
            {QUICK_AMOUNTS.map((amt) => (
              <PressableScale
                key={amt}
                style={[styles.chip, selectedAmount === amt && styles.chipActive]}
                onPress={() => setSelectedAmount(amt)}
              >
                <Text style={[styles.chipText, selectedAmount === amt && styles.chipTextActive]}>
                  {CURRENCY_SYMBOL}{amt}
                </Text>
              </PressableScale>
            ))}
            <PressableScale
              style={[styles.chip, styles.chipAny, selectedAmount === null && styles.chipActive]}
              onPress={() => setSelectedAmount(null)}
            >
              <Text style={[styles.chipText, selectedAmount === null && styles.chipTextActive]}>
                Any amount
              </Text>
            </PressableScale>
          </View>
        </View>

        {/* Thank-you */}
        <View style={styles.thankYou}>
          <Ionicons name="heart" size={18} color={THEME.colors.accent} />
          <Text style={styles.thankYouText}>Every rupee helps. Thank you!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 6, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: THEME.fontWeights.extrabold, color: '#FFFFFF' },
  scroll: { paddingBottom: 40 },

  // QR Card
  qrCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    margin: 16,
    padding: 28,
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  scanLabel: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.mutedText,
    marginTop: 16,
  },
  nameLabel: {
    fontSize: 20,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
    marginTop: 4,
  },
  amountPill: {
    marginTop: 12,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  amountPillText: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primary,
  },

  // Section
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: THEME.fontWeights.bold, color: THEME.colors.text, marginBottom: 12 },

  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: THEME.radius.tile,
    backgroundColor: THEME.colors.tile,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipAny: { paddingHorizontal: 14 },
  chipActive: { borderColor: THEME.colors.primary, backgroundColor: '#E6F4EA' },
  chipText: { fontSize: 14, fontWeight: THEME.fontWeights.bold, color: THEME.colors.text },
  chipTextActive: { color: THEME.colors.primary },

  // Thank-you
  thankYou: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 8,
  },
  thankYouText: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.mutedText,
  },
});
