import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../../context/LocationProvider';
import { THEME } from '../../../constants/theme';
import { useSession } from '../../../context/SessionProvider';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { selectedCity } = useLocation();
  const { logout } = useSession();
  const router = useRouter();

  const handleResetLocation = async () => {
    await Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color={THEME.colors.primary} />
          </View>
          <Text style={styles.nameText}>Guest</Text>
          <Text style={styles.riderTag}>UniGo Rider</Text>
        </View>

        {/* Selected City Info */}
        <View style={styles.infoRowCard}>
          <Ionicons name="location" size={20} color={THEME.colors.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Current City</Text>
            <Text style={styles.infoValue}>
              {selectedCity?.name} ({selectedCity?.state})
            </Text>
          </View>
        </View>

        {/* Placeholder Notice */}
        <View style={styles.placeholderCard}>
          <Ionicons name="sparkles" size={24} color={THEME.colors.primary} style={{ marginBottom: 8 }} />
          <Text style={styles.placeholderTitle}>Profile coming next</Text>
          <Text style={styles.placeholderSubtitle}>
            Account preferences, trip history, and ride settings will be connected in future stages.
          </Text>
        </View>

        {/* Developer / Testing action: Reset location decision */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetLocation}
          activeOpacity={0.75}
        >
          <Ionicons name="refresh" size={18} color={THEME.colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.resetButtonText}>Manage location permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={() => router.push('/(rider)/(tabs)/activities')}><Ionicons name="receipt-outline" size={18} color={THEME.colors.primary} /><Text style={styles.infoLabel}>  Ride history</Text></TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={logout}><Ionicons name="log-out-outline" size={18} color={THEME.colors.danger} /><Text style={styles.resetButtonText}>  End guest session</Text></TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: THEME.colors.background,
  },
  profileCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameText: {
    fontSize: 20,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  riderTag: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.semibold,
    color: THEME.colors.primary,
    marginTop: 4,
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
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.text,
    marginTop: 2,
  },
  placeholderCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: THEME.radius.card,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.bold,
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
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.danger,
  },
});

