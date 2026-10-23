import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';

export default function ActivitiesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activities</Text>
      </View>

      <View style={styles.emptyContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="receipt-outline" size={44} color={THEME.colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No rides yet</Text>
        <Text style={styles.emptySubtitle}>
          Your trips will appear here
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
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
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.mutedText,
    textAlign: 'center',
  },
});

