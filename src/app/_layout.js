import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocationProvider, useLocation } from '../context/LocationProvider';
import { WalletProvider } from '../context/WalletProvider';
import { ActivityProvider } from '../context/ActivityProvider';
import { THEME } from '../constants/theme';

function RootNavigationGate() {
  const { isLoading, hasMadeDecision } = useLocation();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inLocationPermissionScreen = segments[0] === 'location-permission';

    if (!hasMadeDecision && !inLocationPermissionScreen) {
      router.replace('/location-permission');
    } else if (hasMadeDecision && inLocationPermissionScreen) {
      router.replace('/(rider)/(tabs)');
    }
  }, [isLoading, hasMadeDecision, segments, router]);

  if (isLoading || (!hasMadeDecision && segments[0] !== 'location-permission')) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <WalletProvider>
          <ActivityProvider>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <RootNavigationGate />
          </ActivityProvider>
        </WalletProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
});
