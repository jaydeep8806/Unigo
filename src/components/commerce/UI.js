import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Button({ title, onPress, disabled, secondary, style }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: "#0F7A56" }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
export function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={s.muted}>{label}</Text>}
      <TextInput
        placeholderTextColor="#64748B"
        {...props}
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Sheet({ title, onClose, children, visible = true }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.page}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.header}>
            <TouchableOpacity
              accessibilityLabel="Go back"
              onPress={onClose}
              style={{ padding: 10 }}
            >
              <Text style={s.title}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.title, { flex: 1 }]}>{title}</Text>
          </View>
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F7F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    backgroundColor: "white",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#101827" },
  text: { fontSize: 15, color: "#101827", lineHeight: 22 },
  muted: { color: "#64748B", fontSize: 13, lineHeight: 20 },
  card: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E3EBE6",
    gap: 6,
  },
  button: {
    backgroundColor: "#0F7A56",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondary: { backgroundColor: "#E6F4EA" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 14 },
  input: {
    backgroundColor: "white",
    borderColor: "#CCDCD3",
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: "#101827",
    minHeight: 48,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  error: {
    color: "#A32929",
    backgroundColor: "#FFF1F1",
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  footer: {
    backgroundColor: "white",
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderColor: "#E3EBE6",
  },
  chip: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#E6F4EA",
    marginRight: 6,
  },
});
