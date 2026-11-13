import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocationProvider, useLocation } from '../context/LocationProvider';
import { WalletProvider } from '../context/WalletProvider';
import { ActivityProvider } from '../context/ActivityProvider';
import { THEME } from '../constants/theme';
import { SessionProvider, useSession } from '../context/SessionProvider';

import { RoleProvider, useRole } from '../context/RoleProvider';

function RootNavigationGate() {
  const { isLoading, hasMadeDecision } = useLocation();
  const { isSessionLoading, user } = useSession();
  const { role, loading: roleLoading } = useRole();
  const router = useRouter();
  const segments = useSegments();
  const inAuth = segments[0] === 'login' || segments[0] === 'signup';
  const inPublic = inAuth || segments[0] === 'welcome';

  useEffect(() => {
    if (isLoading || isSessionLoading || roleLoading) return;
    if (inAuth && !user) return;

    const inLocationPermissionScreen = segments[0] === 'location-permission';

    if (!user && !inPublic) {
      router.replace('/welcome');
    } else if (user && !role && segments[0] !== 'role-selection') {
      router.replace('/role-selection');
    } else if (user && role && !hasMadeDecision && !inLocationPermissionScreen) {
      router.replace('/location-permission');
    } else if (user && hasMadeDecision && role && (inLocationPermissionScreen || inPublic || (role === 'driver' && segments[0] === '(rider)') || (role === 'user' && segments[0] === 'driver'))) {
      router.replace(role === 'driver' ? '/driver' : '/(rider)/(tabs)');
    }
  }, [isLoading, isSessionLoading, hasMadeDecision, role, roleLoading, segments, router, inAuth, inPublic, user]);

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {(isLoading || isSessionLoading || roleLoading || (!user && !inPublic) || (user && ((!role && segments[0] !== 'role-selection') || (role && !hasMadeDecision && segments[0] !== 'location-permission')))) && (
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
      <SessionProvider><RoleProvider>
      <LocationProvider>
        <WalletProvider>
          <ActivityProvider>
            <StatusBar barStyle="dark-content" />
            <RootNavigationGate />
          </ActivityProvider>
        </WalletProvider>
      </LocationProvider>
      </RoleProvider></SessionProvider>
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
