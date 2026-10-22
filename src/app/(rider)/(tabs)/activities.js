import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';

export default function ActivitiesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Activities</Text>
      </View>

      <View style={styles.emptyContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="receipt-outline" size={44} color={THEME.colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No rides yet</Text>
        <Text style={styles.emptySubtitle}>
          When you book campus commutes, rides, or split fares, your ride history and receipts will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    backgroundColor: THEME.colors.background,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
});
