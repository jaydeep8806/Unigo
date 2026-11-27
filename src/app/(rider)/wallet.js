import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../constants/theme';
import { CURRENCY_SYMBOL } from '../../constants/config';
import { useWallet } from '../../context/WalletProvider';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';

const QUICK_AMOUNTS = [100, 200, 500, 1000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50000;

export default function WalletScreen() {
  const router = useRouter();
  const { balance, transactions, addMoney } = useWallet();

  const [customAmount, setCustomAmount] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const [error, setError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const handleChipPress = (amount) => {
    setSelectedChip(amount);
    setCustomAmount(String(amount));
    setError('');
  };

  const handleAddMoney = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || customAmount.trim() === '') {
      setError('Enter a valid amount');
      return;
    }
    if (amount < MIN_AMOUNT) {
      setError(`Minimum amount is ${CURRENCY_SYMBOL}${MIN_AMOUNT}`);
      return;
    }
    if (amount > MAX_AMOUNT) {
      setError(`Maximum amount is ${CURRENCY_SYMBOL}${MAX_AMOUNT.toLocaleString('en-IN')}`);
      return;
    }
    setError('');
    await addMoney(amount);
    setCustomAmount('');
    setSelectedChip(null);
    showToast(`${CURRENCY_SYMBOL}${amount.toFixed(2)} added to wallet`);
  };

  const handleComingSoon = (feature, detail) => {
    Alert.alert(
      `${feature} · Coming Soon`,
      `${detail}\n\nBank API integration and regulatory certifications are in progress. This feature will be available in the upcoming app update.`,
      [{ text: 'Got It', style: 'default' }]
    );
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${date} • ${time}`;
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.txnRow}>
      <View style={[styles.txnIcon, item.type === 'credit' ? styles.txnIconCredit : styles.txnIconDebit]}>
        <Ionicons
          name={item.type === 'credit' ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={item.type === 'credit' ? '#16A34A' : '#EF4444'}
        />
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnTitle}>{item.title}</Text>
        <Text style={styles.txnDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={[styles.txnAmount, item.type === 'credit' ? styles.txnAmountCredit : styles.txnAmountDebit]}>
        {item.type === 'credit' ? '+' : '-'}{CURRENCY_SYMBOL}{item.amount.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Toast visible={toastVisible} message={toastMessage} onDismiss={() => setToastVisible(false)} />

      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={THEME.colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>Wallet & Banking</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Balance Card with Quick Actions */}
        <LinearGradient
          colors={['#064E3B', '#0F7A56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceCardTop}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{CURRENCY_SYMBOL}{balance.toFixed(2)}</Text>
              <Text style={styles.balanceSub}>UniGo Digital Wallet</Text>
            </View>
            <View style={styles.balanceShieldBox}>
              <Ionicons name="shield-checkmark" size={24} color="#A7F3D0" />
            </View>
          </View>

          {/* Quick Action Buttons inside Card */}
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => handleChipPress(500)}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIconBox}>
                <Ionicons name="add" size={18} color="#0F7A56" />
              </View>
              <Text style={styles.quickActionText}>+ Add Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() =>
                handleComingSoon(
                  'Bank Withdrawal',
                  'Direct withdrawals to your bank account via IMPS/NEFT are coming in the next update.'
                )
              }
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIconBox}>
                <Ionicons name="business-outline" size={17} color="#0F7A56" />
              </View>
              <Text style={styles.quickActionText}>To Bank</Text>
              <View style={styles.soonPill}>
                <Text style={styles.soonPillText}>SOON</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() =>
                handleComingSoon(
                  'UPI Transfer',
                  'Sending wallet balance directly to a mobile number or UPI ID is launching in the next update.'
                )
              }
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIconBox}>
                <Ionicons name="send-outline" size={16} color="#0F7A56" />
              </View>
              <Text style={styles.quickActionText}>Send UPI</Text>
              <View style={styles.soonPill}>
                <Text style={styles.soonPillText}>SOON</Text>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Banking & Transfers (Coming Soon Features) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banking & Transfers</Text>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() =>
              handleComingSoon(
                'Transfer to Bank Account',
                'Withdraw your wallet balance directly to your savings/current bank account via instant IMPS or NEFT with zero transaction charges.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.serviceIconBox}>
              <Ionicons name="business-outline" size={22} color="#0F7A56" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.serviceHeaderRow}>
                <Text style={styles.serviceTitle}>Transfer to Bank Account</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={styles.serviceSubtitle}>
                Withdraw wallet balance directly to your bank account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() =>
              handleComingSoon(
                'Send to Contact or UPI',
                'Instantly send money to any UniGo user, friend, or UPI ID with 1-tap verification.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.serviceIconBox}>
              <Ionicons name="paper-plane-outline" size={20} color="#0F7A56" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.serviceHeaderRow}>
                <Text style={styles.serviceTitle}>Send to Contact / UPI</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={styles.serviceSubtitle}>
                Peer-to-peer balance transfer using phone number or UPI
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() =>
              handleComingSoon(
                'Auto Top-Up & Standing Instructions',
                'Set up UPI Autopay so your wallet automatically reloads whenever balance falls below ₹100.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.serviceIconBox}>
              <Ionicons name="repeat-outline" size={22} color="#0F7A56" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.serviceHeaderRow}>
                <Text style={styles.serviceTitle}>Auto Top-Up & UPI Autopay</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={styles.serviceSubtitle}>
                Keep rides & food orders uninterrupted with automatic reload
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Add Money Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Money to Wallet</Text>

          {/* Quick chips */}
          <View style={styles.chipsRow}>
            {QUICK_AMOUNTS.map((amt) => (
              <PressableScale
                key={amt}
                style={[styles.chip, selectedChip === amt && styles.chipActive]}
                onPress={() => handleChipPress(amt)}
              >
                <Text style={[styles.chipText, selectedChip === amt && styles.chipTextActive]}>
                  {CURRENCY_SYMBOL}{amt}
                </Text>
              </PressableScale>
            ))}
          </View>

          {/* Custom input */}
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>{CURRENCY_SYMBOL}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor={THEME.colors.mutedText}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={(t) => {
                setCustomAmount(t);
                setSelectedChip(null);
                setError('');
              }}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PressableScale style={styles.addBtn} onPress={handleAddMoney}>
            <Text style={styles.addBtnText}>Add to Wallet</Text>
          </PressableScale>
        </View>

        {/* Transactions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={44} color={THEME.colors.border} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Add money to get started</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransaction}
              scrollEnabled={false}
            />
          )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.white,
  },
  backBtn: { padding: 6, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: THEME.fontWeights.extrabold, color: THEME.colors.text },
  scroll: { paddingBottom: 40 },

  // Balance card
  balanceCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    ...THEME.shadows.card,
  },
  balanceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: THEME.fontWeights.semibold },
  balanceValue: { fontSize: 36, fontWeight: THEME.fontWeights.extrabold, color: '#FFFFFF', marginTop: 4 },
  balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  balanceShieldBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick action buttons in balance card
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  quickActionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  soonPill: {
    position: 'absolute',
    top: -6,
    right: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  soonPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Section
  section: { paddingHorizontal: 16, marginTop: 14 },
  sectionTitle: { fontSize: 16, fontWeight: THEME.fontWeights.bold, color: THEME.colors.text, marginBottom: 12 },

  // Service Card (Coming Soon)
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  comingSoonBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.4,
  },

  // Chips
  chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.tile,
    backgroundColor: THEME.colors.tile,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: THEME.colors.primary, backgroundColor: '#E6F4EA' },
  chipText: { fontSize: 14, fontWeight: THEME.fontWeights.bold, color: THEME.colors.text },
  chipTextActive: { color: THEME.colors.primary },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    height: 52,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  inputPrefix: { fontSize: 18, fontWeight: THEME.fontWeights.bold, color: THEME.colors.text, marginRight: 6 },
  input: { flex: 1, fontSize: 16, color: THEME.colors.text, fontWeight: THEME.fontWeights.semibold },
  errorText: { fontSize: 12, color: THEME.colors.danger, marginBottom: 6, marginLeft: 2 },

  // Add button
  addBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
    ...THEME.shadows.soft,
  },
  addBtnText: { fontSize: 15, fontWeight: THEME.fontWeights.extrabold, color: '#FFFFFF' },

  // Transactions
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  txnIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnIconCredit: { backgroundColor: '#DCFCE7' },
  txnIconDebit: { backgroundColor: '#FEE2E2' },
  txnInfo: { flex: 1 },
  txnTitle: { fontSize: 14, fontWeight: THEME.fontWeights.semibold, color: THEME.colors.text },
  txnDate: { fontSize: 11, color: THEME.colors.mutedText, marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: THEME.fontWeights.bold },
  txnAmountCredit: { color: '#16A34A' },
  txnAmountDebit: { color: '#EF4444' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, fontWeight: THEME.fontWeights.semibold, color: THEME.colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: THEME.colors.mutedText, marginTop: 4 },
});
