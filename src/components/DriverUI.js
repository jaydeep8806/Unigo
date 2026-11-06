import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  View,
} from "react-native";
export function Button({ title, onPress, disabled, secondary }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.buttonText, secondary && { color: "#0f7a56" }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
export function Field({ label, ...props }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={s.input} {...props} />
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f8f5" },
  content: {
    padding: 24,
    gap: 18,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingBottom: 48,
  },
  eyebrow: {
    color: "#0f7a56",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: { fontSize: 32, fontWeight: "800", color: "#123d2c" },
  text: { color: "#63766c", fontSize: 15, lineHeight: 23 },
  label: { color: "#183d2e", fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: "#dce8df",
  },
  button: {
    backgroundColor: "#0f7a56",
    borderRadius: 18,
    padding: 17,
    alignItems: "center",
    minHeight: 52,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondary: { backgroundColor: "#e4f2e9" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d3e2d8",
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
  },
  error: { color: "#b42318", lineHeight: 22 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
