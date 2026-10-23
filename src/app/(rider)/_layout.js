import React from 'react';
import { Stack } from 'expo-router';

export default function RiderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="book" options={{ headerShown: false }} />
      <Stack.Screen name="wallet" options={{ headerShown: false }} />
      <Stack.Screen name="donate" options={{ headerShown: false }} />
      <Stack.Screen name="nearby" options={{ headerShown: false }} />
      <Stack.Screen name="box" options={{ headerShown: false }} />
      <Stack.Screen name="homespa" options={{ headerShown: false }} />
    </Stack>
  );
}
