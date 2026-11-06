import React, { useEffect, useState } from "react";
import { Animated, ScrollView, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRole } from "../context/RoleProvider";
import { s } from "../components/DriverUI";
export default function RoleSelection() {
  const { chooseRole } = useRole();
  const [fade] = useState(() => new Animated.Value(0));
  const [error, setError] = useState("");
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fade]);
  async function choose(role) {
    try {
      await chooseRole(role);
      router.replace(role === "driver" ? "/driver" : "/(rider)/(tabs)");
    } catch {
      setError("Could not save your choice. Try again.");
    }
  }
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>UNIGO · YOUR CITY, CONNECTED</Text>
        <Text style={s.title}>Welcome to UNIGO</Text>
        <Text style={s.text}>
          Choose how you want to continue. You can switch anytime in your
          profile.
        </Text>
        <Animated.View style={{ opacity: fade, gap: 18, marginTop: 24 }}>
          {[
            [
              "user",
              "person-outline",
              "Continue as User",
              "Rides, food, shopping and more. Your everyday essentials, together.",
            ],
            [
              "driver",
              "car-sport-outline",
              "Continue as Driver",
              "Your vehicle. Your schedule. Connect with riders around you.",
            ],
          ].map(([role, icon, title, description]) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={role}
              style={s.card}
              onPress={() => choose(role)}
            >
              <Ionicons name={icon} size={40} color="#0f7a56" />
              <Text style={s.label}>{title}</Text>
              <Text style={s.text}>{description}</Text>
              <Ionicons name="arrow-forward-circle" size={30} color="#0f7a56" />
            </TouchableOpacity>
          ))}
        </Animated.View>
        {!!error && <Text style={s.error}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
