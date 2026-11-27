import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BookingSuccess({ title, message, onContinue }) {
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.card}>
        <Ionicons name="checkmark-circle" size={54} color="#0f7a56" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={onContinue} accessibilityRole="button">
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  title: { color: '#173a2c', fontSize: 22, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  message: { color: '#526a5e', fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  button: { alignSelf: 'stretch', backgroundColor: '#0f7a56', borderRadius: 24, padding: 14, marginTop: 22, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
