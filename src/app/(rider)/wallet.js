import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  FlatList,
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
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Balance Card */}
        <LinearGradient
          colors={['#064E3B', '#0F7A56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{CURRENCY_SYMBOL}{balance.toFixed(2)}</Text>
          <Text style={styles.balanceSub}>UniGo Wallet</Text>
        </LinearGradient>

        {/* Add Money */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add money</Text>

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
            <Text style={styles.addBtnText}>Add to wallet</Text>
          </PressableScale>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions</Text>
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
    padding: 24,
    ...THEME.shadows.card,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: THEME.fontWeights.semibold },
  balanceValue: { fontSize: 36, fontWeight: THEME.fontWeights.extrabold, color: '#FFFFFF', marginTop: 4 },
  balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: THEME.fontWeights.bold, color: THEME.colors.text, marginBottom: 12 },

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
    marginBottom: 20,
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
