import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AuthForm from './AuthForm';

export default function AuthScreen({ signup = false }) {
  const { height } = useWindowDimensions();
  const short = height < 700;
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.content}>
            <View style={[styles.topbar, short && styles.shortTopbar]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" style={styles.back} onPress={() => router.replace('/welcome')}><Ionicons name="arrow-back" size={22} color="#234C38" /></Pressable>
              <View style={[styles.brand, signup && styles.centeredBrand]}><Ionicons name="navigate" size={20} color="#0F7A56" /><Text style={styles.brandText}>UniGo</Text></View>
            </View>
            <View style={[styles.intro, short && styles.shortIntro]}>
              <Text accessibilityRole="header" style={styles.title}>{signup ? 'Create your account' : 'Welcome back!'}</Text>
              {!short && <Text style={styles.description}>{signup ? 'Your city, all in one place.' : 'Your next journey starts here.'}</Text>}
            </View>
            <View style={[styles.card, short && styles.shortCard]}><AuthForm key={signup ? 'signup' : 'login'} signup={signup} compact dense={short} onSwitch={() => router.replace(signup ? '/login' : '/signup')} /></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8F5' }, flex: { flex: 1 }, scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center' }, topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  back: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, brand: { flexDirection: 'row', gap: 5, alignItems: 'center' }, brandText: { fontSize: 22, fontWeight: '800', color: '#0F7A56' },
  centeredBrand: { position: 'absolute', left: 46, right: 46, justifyContent: 'center' },
  intro: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 28, lineHeight: 34, color: '#17382A', fontWeight: '800', textAlign: 'center' }, description: { color: '#718579', fontSize: 14, lineHeight: 20, marginTop: 4, textAlign: 'center' },
  card: { paddingHorizontal: 2 },
  shortTopbar: { marginBottom: 4 }, shortIntro: { marginBottom: 8 }, shortCard: { paddingHorizontal: 2 },
});
