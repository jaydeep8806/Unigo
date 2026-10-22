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
      <Stack.Screen
        name="book"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
