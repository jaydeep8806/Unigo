import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../context/LocationProvider';
import { CITIES } from '../constants/config';
import { THEME } from '../constants/theme';

export default function LocationPermissionScreen() {
  const router = useRouter();
  const { requestLocation, setCity, selectedCity } = useLocation();
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasDenied, setHasDenied] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const handleAllowLocation = async () => {
    setIsRequesting(true);
    setHasDenied(false);

    try {
      const result = await requestLocation();
      if (result && result.granted) {
        router.replace('/(rider)/(tabs)');
      } else {
        setHasDenied(true);
      }
    } catch {
      setHasDenied(true);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSelectCity = async (city) => {
    await setCity(city);
    setCityModalVisible(false);
    router.replace('/(rider)/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top Header Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={14} color={THEME.colors.primary} />
            <Text style={styles.badgeText}>Safe Rides</Text>
          </View>
        </View>

        {/* Hero Visual Icon */}
        <View style={styles.heroContainer}>
          <View style={styles.heroOuterCircle}>
            <View style={styles.heroInnerCircle}>
              <Ionicons name="location" size={48} color={THEME.colors.white} />
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Enable Location</Text>
          <Text style={styles.description}>
            UniGo needs your location to find nearby drivers, estimate pickup times, and calculate accurate fares.
          </Text>
        </View>

        {/* Denied Warning Card */}
        {hasDenied && (
          <View style={styles.deniedCard}>
            <Ionicons name="alert-circle" size={22} color={THEME.colors.warning} style={styles.deniedIcon} />
            <View style={styles.deniedTextCol}>
              <Text style={styles.deniedTitle}>Location Access Denied</Text>
              <Text style={styles.deniedSubtitle}>
                Please choose your city manually below to explore rides and services.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Action Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.primaryButton, isRequesting && styles.primaryButtonDisabled]}
          onPress={handleAllowLocation}
          disabled={isRequesting}
          activeOpacity={0.88}
        >
          {isRequesting ? (
            <ActivityIndicator size="small" color={THEME.colors.white} />
          ) : (
            <View style={styles.btnContentRow}>
              <Ionicons name="navigate" size={18} color={THEME.colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Allow location</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCityModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Choose city manually</Text>
        </TouchableOpacity>
      </View>

      {/* City Selector Modal */}
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
                <Text style={styles.modalTitle}>Select Your City</Text>
                <TouchableOpacity
                  onPress={() => setCityModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                UniGo rides are currently available in these cities across India.
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
                    onPress={() => handleSelectCity(item)}
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
  container: {
    flex: 1,
    backgroundColor: THEME.colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 122, 86, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
    gap: 6,
  },
  badgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 0.3,
  },
  heroContainer: {
    marginBottom: 32,
  },
  heroOuterCircle: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#D1FAE5',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroInnerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  deniedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: THEME.radius.md,
    padding: 14,
    marginTop: 8,
    width: '100%',
  },
  deniedIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  deniedTextCol: {
    flex: 1,
  },
  deniedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  deniedSubtitle: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: THEME.colors.white,
  },
  primaryButton: {
    backgroundColor: THEME.colors.primary,
    height: 54,
    borderRadius: THEME.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: THEME.colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: THEME.radius.full,
  },
  secondaryButtonText: {
    color: THEME.colors.primary,
    fontSize: 14.5,
    fontWeight: '600',
  },
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
