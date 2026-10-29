import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { CURRENCY_SYMBOL } from '../../../constants/config';
import { useActivity } from '../../../context/ActivityProvider';

export default function ActivitiesScreen() {
  const { rides, cancelRide, clearRides } = useActivity();

  const handleCancel = (rideId) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelRide(rideId),
        },
      ]
    );
  };

  const renderRideItem = ({ item }) => {
    const isCancelled = item.status === 'cancelled';
    const isConfirmed = item.status === 'confirmed';

    return (
      <View style={styles.rideCard}>
        {/* Card Header */}
        <View style={styles.rideHeader}>
          <View style={styles.vehiclePill}>
            <Ionicons
              name={item.isCarpool ? 'people' : 'car'}
              size={15}
              color={THEME.colors.primary}
            />
            <Text style={styles.vehicleTitle}>
              {item.vehicleName || 'UniGo Ride'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isConfirmed && styles.statusConfirmed,
              isCancelled && styles.statusCancelled,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isConfirmed && styles.statusTextConfirmed,
                isCancelled && styles.statusTextCancelled,
              ]}
            >
              {isConfirmed ? 'Confirmed' : 'Cancelled'}
            </Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeContainer}>
          <View style={styles.timelineIndicators}>
            <View style={styles.dotGreen} />
            <View style={styles.timelineDashed} />
            <View style={styles.dotRed} />
          </View>

          <View style={styles.locationsCol}>
            <Text style={styles.locationTitle} numberOfLines={1}>
              {item.origin || 'Current Location'}
            </Text>
            <Text style={styles.locationSubtitle}>Pickup</Text>

            <View style={{ height: 14 }} />

            <Text style={styles.locationTitle} numberOfLines={1}>
              {item.destination || 'Destination'}
            </Text>
            <Text style={styles.locationSubtitle}>Drop-off</Text>
          </View>
        </View>

        {/* Driver & OTP Details if Confirmed */}
        {isConfirmed && item.driver && (
          <View style={styles.driverSection}>
            <View style={styles.driverInfoLeft}>
              <Text style={styles.driverName}>Driver: {item.driver.name}</Text>
              <Text style={styles.driverPlate}>{item.driver.vehicleNumber}</Text>
            </View>
            {item.otp && (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>OTP</Text>
                <Text style={styles.otpNumber}>{item.otp}</Text>
              </View>
            )}
          </View>
        )}

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.fareAmount}>
              {CURRENCY_SYMBOL}{item.fare}
            </Text>
            <Text style={styles.paymentMethod}>
              Paid via {item.paymentType || 'Cash'}
            </Text>
          </View>

          {isConfirmed && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activities</Text>
        {rides.length > 0 && (
          <TouchableOpacity onPress={clearRides} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="receipt-outline" size={44} color={THEME.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySubtitle}>
            Your active bookings and trip history will appear here with live OTP and driver info.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={renderRideItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.text,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.danger,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  rideCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    gap: 6,
  },
  vehicleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
  },
  statusConfirmed: {
    backgroundColor: '#DEF7EC',
  },
  statusCancelled: {
    backgroundColor: '#FDE8E8',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextConfirmed: {
    color: '#03543F',
  },
  statusTextCancelled: {
    color: '#9B1C1C',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  timelineIndicators: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  timelineDashed: {
    width: 2,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginVertical: 3,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  locationsCol: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  locationSubtitle: {
    fontSize: 11,
    color: THEME.colors.mutedText,
    marginTop: 1,
  },
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  driverInfoLeft: {
    flex: 1,
  },
  driverName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  driverPlate: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginTop: 1,
  },
  otpBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.mutedText,
  },
  otpNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.primaryDark,
    letterSpacing: 1.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  paymentMethod: {
    fontSize: 11,
    color: THEME.colors.mutedText,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
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
    lineHeight: 20,
  },
});
