import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '../../../context/LocationProvider';
import { THEME } from '../../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { selectedCity, resetLocationDecision } = useLocation();

  const handleResetLocation = async () => {
    Alert.alert(
      'Reset Location Permission',
      'This will reset your location choice and show the Location Permission screen on next launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetLocationDecision();
            router.replace('/location-permission');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color={THEME.colors.primary} />
          </View>
          <Text style={styles.nameText}>Campus Student</Text>
          <Text style={styles.emailText}>student@university.edu.in</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>UniGo Rider</Text>
          </View>
        </View>

        {/* Selected City Info */}
        <View style={styles.infoRowCard}>
          <Ionicons name="location" size={20} color={THEME.colors.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Current Campus City</Text>
            <Text style={styles.infoValue}>{selectedCity?.name} ({selectedCity?.state})</Text>
          </View>
        </View>

        {/* Placeholder Notice */}
        <View style={styles.placeholderCard}>
          <Ionicons name="sparkles" size={24} color={THEME.colors.primary} style={{ marginBottom: 8 }} />
          <Text style={styles.placeholderTitle}>Profile coming next</Text>
          <Text style={styles.placeholderSubtitle}>
            Full Supabase authentication, student ID verification, and ride settings will be connected in future stages.
          </Text>
        </View>

        {/* Developer / Testing action: Reset location decision */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetLocation}
          activeOpacity={0.75}
        >
          <Ionicons name="refresh" size={18} color={THEME.colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.resetButtonText}>Test Location Permission Screen</Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: THEME.colors.background,
  },
  profileCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  emailText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    marginTop: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  infoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  placeholderCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: THEME.radius.lg,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
    marginBottom: 4,
  },
  placeholderSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.colors.primaryDark,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
});
