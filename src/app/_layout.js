import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocationProvider, useLocation } from '../context/LocationProvider';
import { WalletProvider } from '../context/WalletProvider';
import { ActivityProvider } from '../context/ActivityProvider';
import { THEME } from '../constants/theme';
import { SessionProvider, useSession } from '../context/SessionProvider';

function RootNavigationGate() {
  const { isLoading, hasMadeDecision } = useLocation();
  const { isSessionLoading, hasSession } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading || isSessionLoading) return;

    const inLocationPermissionScreen = segments[0] === 'location-permission';
    const inWelcome = segments[0] === 'welcome';

    if (!hasSession && !inWelcome) {
      router.replace('/welcome');
    } else if (hasSession && !hasMadeDecision && !inLocationPermissionScreen) {
      router.replace('/location-permission');
    } else if (hasSession && hasMadeDecision && (inLocationPermissionScreen || inWelcome)) {
      router.replace('/(rider)/(tabs)');
    }
  }, [isLoading, isSessionLoading, hasSession, hasMadeDecision, segments, router]);

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {(isLoading || isSessionLoading || (!hasSession && segments[0] !== 'welcome') || (hasSession && !hasMadeDecision && segments[0] !== 'location-permission')) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
      <LocationProvider>
        <WalletProvider>
          <ActivityProvider>
            <StatusBar barStyle="dark-content" />
            <RootNavigationGate />
          </ActivityProvider>
        </WalletProvider>
      </LocationProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
});
