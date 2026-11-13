import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '../../../context/LocationProvider';
import { useSession } from '../../../context/SessionProvider';
import { useWallet } from '../../../context/WalletProvider';

const PROFILE_KEY = '@unigo_rider_profile';

function MenuRow({ icon, title, subtitle, onPress, last, danger }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}><Ionicons name={icon} size={21} color={danger ? '#BD4C4C' : '#147653'} /></View>
      <View style={styles.rowCopy}><Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>{subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}</View>
      <Ionicons name="chevron-forward" size={18} color="#A5B3AA" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { selectedCity } = useLocation();
  const { logout, user } = useSession();
  const { balance } = useWallet();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [savedProfile, setProfile] = useState({ key: null, name: '', phone: '' });
  const [draft, setDraft] = useState({ name: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const profileKey = user ? `${PROFILE_KEY}:${user.id}` : PROFILE_KEY;
  const profile = savedProfile.key === profileKey ? savedProfile : { name: '', phone: '' };

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(profileKey).then(value => {
      if (active && value) {
        const saved = JSON.parse(value);
        setProfile({ key: profileKey, name: typeof saved.name === 'string' ? saved.name : '', phone: typeof saved.phone === 'string' ? saved.phone : '' });
      }
    }).catch(() => { if (active) setError('Could not load your profile details.'); });
    return () => { active = false; };
  }, [profileKey]);

  const editProfile = () => { setDraft({ phone: profile.phone, name: profile.name || user?.user_metadata?.full_name || '' }); setError(''); setEditing(true); };
  const saveProfile = async () => {
    const next = { name: draft.name.trim(), phone: draft.phone.trim() };
    if (!next.name) { setError('Please enter your name.'); return; }
    setSaving(true);
    try {
      await AsyncStorage.setItem(profileKey, JSON.stringify(next));
      setProfile({ ...next, key: profileKey }); setEditing(false); setError('');
    } catch { setError('Could not save your details. Please try again.'); }
    finally { setSaving(false); }
  };
  const openSettings = async () => {
    try { await Linking.openSettings(); } catch { Alert.alert('Unable to open settings', 'Please open your device settings to manage location permissions.'); }
  };
  const performLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await logout(); }
    catch { setError('Could not sign out. Please try again.'); }
    finally { setSigningOut(false); }
  };
  const endSession = () => {
    if (Platform.OS === 'web') { performLogout(); return; }
    Alert.alert(user ? 'Log out?' : 'End guest session?', 'You can return to UNIGO whenever you are ready.', [
      { text: 'Cancel', style: 'cancel' },
      { text: user ? 'Log out' : 'End session', style: 'destructive', onPress: performLogout },
    ]);
  };
  const city = [selectedCity?.name, selectedCity?.state].filter(Boolean).join(', ') || 'Not selected';
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR ACCOUNT</Text><Text style={styles.heading}>Profile</Text></View><View style={styles.headerMark}><Ionicons name="person-outline" size={21} color="#147653" /></View></View>
        <View style={styles.hero}>
          <View style={styles.heroTop}><View style={styles.avatar}>{initials ? <Text style={styles.initials}>{initials}</Text> : <Ionicons name="person" size={30} color="#167855" />}</View><Pressable accessibilityRole="button" onPress={editProfile} style={styles.editButton}><Ionicons name="pencil-outline" size={15} color="#fff" /><Text style={styles.editText}>Edit</Text></Pressable></View>
          <Text style={styles.name}>{profile.name || user?.user_metadata?.full_name || 'Hello, rider'}</Text>
          <Text style={styles.heroSubtitle}>{user?.email || profile.phone || 'Make your UNIGO profile your own'}</Text>
          <View style={styles.badge}><View style={styles.badgeDot} /><Text style={styles.badgeText}>RIDER PROFILE</Text></View>
        </View>
        {error && !editing ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.sectionLabel}>YOUR UNIGO</Text>
        <View style={styles.card}>
          <MenuRow icon="receipt-outline" title="Your activity" subtitle="View your ride history" onPress={() => router.push('/(rider)/(tabs)/activities')} />
          <MenuRow icon="wallet-outline" title="UNIGO wallet" subtitle={`Balance: ₹${Number(balance || 0).toFixed(2)}`} onPress={() => router.push('/(rider)/wallet')} />
          <MenuRow icon="location-outline" title="Current city" subtitle={city} onPress={() => router.push('/(rider)/(tabs)')} last />
        </View>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <MenuRow icon="person-outline" title="Personal details" subtitle="Update your name and phone number" onPress={editProfile} />
          <MenuRow icon="navigate-outline" title="Location permission" subtitle="Manage access in device settings" onPress={openSettings} />
          <MenuRow icon="swap-horizontal-outline" title="Switch to driver" subtitle="Choose how you use UNIGO" onPress={() => router.push('/role-selection')} last />
        </View>
        <Text style={styles.sectionLabel}>SESSION</Text>
        <View style={styles.card}>
          {!user && <MenuRow icon="log-in-outline" title="Log in or sign up" subtitle="Access your account across devices" onPress={() => router.push('/login')} />}
          <MenuRow icon="log-out-outline" title={signingOut ? 'Signing out…' : user ? 'Log out' : 'End guest session'} subtitle="Return to the welcome screen" onPress={endSession} danger last />
        </View>
        <Text style={styles.footer}>Your profile details are saved on this device.</Text>
      </ScrollView>
      <Modal visible={editing} animationType="slide" onRequestClose={() => !saving && setEditing(false)}>
        <SafeAreaView style={styles.screen}>
          <View style={styles.modalHeader}><Pressable accessibilityRole="button" accessibilityLabel="Close edit profile" onPress={() => setEditing(false)} disabled={saving} style={styles.close}><Ionicons name="close" size={24} color="#18362A" /></Pressable><Text style={styles.modalTitle}>Personal details</Text><View style={styles.close} /></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={styles.formIntro}>Tell us a little about yourself</Text><Text style={styles.formHint}>Your details are stored on this device.</Text>
            <Text style={styles.label}>Full name</Text><TextInput accessibilityLabel="Full name" style={styles.input} value={draft.name} onChangeText={name => setDraft({ ...draft, name })} placeholder="Enter your name" placeholderTextColor="#9CAAA2" autoCapitalize="words" maxLength={80} />
            <Text style={styles.label}>Phone number <Text style={styles.optional}>(optional)</Text></Text><TextInput accessibilityLabel="Phone number" style={styles.input} value={draft.phone} onChangeText={phone => setDraft({ ...draft, phone })} placeholder="Enter your phone number" placeholderTextColor="#9CAAA2" keyboardType="phone-pad" maxLength={25} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" disabled={saving} onPress={saveProfile} style={[styles.saveButton, saving && { opacity: 0.6 }]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save details'}</Text></Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F6' }, content: { paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, eyebrow: { fontSize: 10, letterSpacing: 1.6, fontWeight: '800', color: '#7C9285', marginBottom: 4 }, heading: { fontSize: 29, fontWeight: '800', color: '#17382A' }, headerMark: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#E3F1E8', alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: '#124A37', borderRadius: 24, padding: 21, marginBottom: 10 }, heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 15 }, avatar: { width: 65, height: 65, borderRadius: 22, backgroundColor: '#DDF2E2', alignItems: 'center', justifyContent: 'center' }, initials: { color: '#167855', fontSize: 23, fontWeight: '800' }, editButton: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: '#28644E' }, editText: { color: '#fff', fontWeight: '700', fontSize: 12 }, name: { color: '#fff', fontSize: 23, fontWeight: '800' }, heroSubtitle: { color: '#C1D9CA', marginTop: 5, fontSize: 13 }, badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 18, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#28644E' }, badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A8E9AA' }, badgeText: { color: '#DDF4E2', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  sectionLabel: { color: '#809187', fontSize: 10, letterSpacing: 1.3, fontWeight: '800', marginTop: 23, marginBottom: 10, marginLeft: 3 }, card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E7EFE9', overflow: 'hidden' }, row: { minHeight: 72, paddingHorizontal: 15, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 13 }, rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F4F1' }, pressed: { backgroundColor: '#F4F9F5' }, rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EAF5ED', alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1 }, rowTitle: { fontSize: 14, fontWeight: '700', color: '#203C2E' }, rowSubtitle: { fontSize: 12, color: '#899A90', marginTop: 4 }, dangerIcon: { backgroundColor: '#FFF0EE' }, dangerText: { color: '#BD4C4C' }, footer: { textAlign: 'center', fontSize: 12, color: '#9AABA0', marginTop: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }, close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, modalTitle: { fontSize: 18, fontWeight: '800', color: '#17382A' }, form: { padding: 24 }, formIntro: { fontSize: 23, fontWeight: '800', color: '#17382A', marginTop: 18 }, formHint: { color: '#82958A', fontSize: 13, marginTop: 8, marginBottom: 24 }, label: { color: '#294638', fontWeight: '700', fontSize: 13, marginBottom: 8, marginTop: 16 }, optional: { color: '#9AABA0', fontWeight: '400' }, input: { backgroundColor: '#fff', borderColor: '#DFEAE2', borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, height: 54, color: '#17382A', fontSize: 15 }, error: { color: '#BD4C4C', fontSize: 13, marginTop: 12 }, saveButton: { backgroundColor: '#147653', borderRadius: 15, alignItems: 'center', padding: 17, marginTop: 30 }, saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
