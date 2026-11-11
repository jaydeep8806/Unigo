import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['All', 'Rides', 'Food', 'Shops'];
const OFFERS = [
  { id: 'ride', category: 'Rides', icon: 'car-outline', color: '#E4F5EC', accent: '#08734F', eyebrow: 'RIDE OFFER', title: 'Save on your next ride', description: 'A little more value on your everyday trips.', detail: 'Ride discounts could be available on eligible bookings. Check back when offers go live for the discount amount, booking requirements and expiry date.' },
  { id: 'food', category: 'Food', icon: 'restaurant-outline', color: '#FFF0E5', accent: '#B85A23', eyebrow: 'FOOD OFFER', title: 'More to love at mealtime', description: 'Discover deals from your favourite restaurants.', detail: 'Food offers could be available at participating restaurants. Check back when offers go live for minimum order values, eligible restaurants and expiry dates.' },
  { id: 'shops', category: 'Shops', icon: 'basket-outline', color: '#F0EBFF', accent: '#7352B1', eyebrow: 'SHOPPING OFFER', title: 'Savings on daily essentials', description: 'Make your next essentials run go further.', detail: 'Shopping offers could be available on eligible orders. Check back when offers go live for participating stores, minimum order values and expiry dates.' },
  { id: 'welcome', category: 'Rides', icon: 'gift-outline', color: '#E8F2FF', accent: '#356BB1', eyebrow: 'WELCOME OFFER', title: 'A little something for new riders', description: 'An introduction to getting around with UniGo.', detail: 'Welcome offers may be limited to new users and eligible rides. Check back when offers go live for eligibility and complete terms.' },
];

export default function Offers() {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const visibleOffers = category === 'All' ? OFFERS : OFFERS.filter((offer) => offer.category === category);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>A LITTLE EXTRA FOR YOU</Text>
            <Text style={styles.title}>Offers & rewards</Text>
            <Text style={styles.subtitle}>Discover more ways to get value with UniGo.</Text>
          </View>
          <View style={styles.headerIcon}><Ionicons name="pricetags-outline" size={25} color="#0F7A56" /></View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCircle}><Ionicons name="sparkles" size={36} color="#B8F1D4" /></View>
          <Text style={styles.heroLabel}>GOOD THINGS AHEAD</Text>
          <Text style={styles.heroTitle}>More reasons to{ '\n' }go with UniGo.</Text>
          <Text style={styles.heroCopy}>Explore a preview of the offers we’re bringing your way.</Text>
          <View style={styles.heroBadge}><View style={styles.heroDot} /><Text style={styles.heroBadgeText}>OFFERS PREVIEW</Text></View>
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionTitle}>Explore offers</Text><Text style={styles.sectionSubtitle}>Find something for your everyday</Text></View>
          <Ionicons name="options-outline" size={21} color="#789087" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {CATEGORIES.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} accessibilityRole="button" accessibilityState={{ selected: category === item }} style={[styles.filter, category === item && styles.filterActive]}>
              <Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {visibleOffers.map((offer) => (
          <Pressable key={offer.id} accessibilityRole="button" accessibilityLabel={`View ${offer.title} details`} onPress={() => setSelected(offer)} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.offerIcon, { backgroundColor: offer.color }]}><Ionicons name={offer.icon} size={25} color={offer.accent} /></View>
              <View style={styles.cardBody}>
                <Text style={[styles.eyebrow, { color: offer.accent }]}>{offer.eyebrow}</Text>
                <Text style={styles.cardTitle}>{offer.title}</Text>
                <Text style={styles.cardDescription}>{offer.description}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.previewTag}><Text style={styles.previewText}>PREVIEW</Text></View>
              <View style={styles.detailsLink}><Text style={styles.detailsText}>View details</Text><Ionicons name="arrow-forward" size={15} color="#0F7A56" /></View>
            </View>
          </Pressable>
        ))}
        <View style={styles.notice}><Ionicons name="information-circle-outline" size={18} color="#70877C" /><Text style={styles.noticeText}>These are examples, not active or redeemable offers. Check back for updates.</Text></View>
      </ScrollView>
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropDismiss} onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Close offer details" />
          {selected && <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTop}><View style={[styles.offerIcon, { backgroundColor: selected.color }]}><Ionicons name={selected.icon} size={26} color={selected.accent} /></View><Pressable onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Close offer details" style={styles.close}><Ionicons name="close" size={22} color="#314C40" /></Pressable></View>
            <Text style={[styles.eyebrow, { color: selected.accent, marginTop: 20 }]}>{selected.eyebrow}</Text>
            <Text style={styles.sheetTitle}>{selected.title}</Text>
            <Text style={styles.sheetCopy}>{selected.detail}</Text>
            <View style={styles.sheetNotice}><Ionicons name="information-circle-outline" size={20} color="#0F7A56" /><Text style={styles.sheetNoticeText}>Preview only. This offer is not currently redeemable.</Text></View>
            <Pressable onPress={() => setSelected(null)} accessibilityRole="button" style={styles.doneButton}><Text style={styles.doneText}>Got it</Text></Pressable>
          </View>}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F6' }, content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, headerText: { flex: 1 }, kicker: { color: '#0F7A56', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 }, title: { color: '#142F24', fontSize: 27, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: '#71837B', fontSize: 13, lineHeight: 19, marginTop: 5 }, headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E4F3EA', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  hero: { overflow: 'hidden', borderRadius: 22, backgroundColor: '#0B6248', padding: 22, minHeight: 190 }, heroCircle: { position: 'absolute', right: -12, top: -12, width: 130, height: 130, borderRadius: 65, backgroundColor: '#177C5C', alignItems: 'center', justifyContent: 'center' }, heroLabel: { color: '#A8E3C4', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }, heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', lineHeight: 30, marginTop: 11, maxWidth: '80%' }, heroCopy: { color: '#D0EAE0', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: '80%' }, heroBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#287B61', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, marginTop: 16, gap: 6 }, heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A5E9C4' }, heroBadgeText: { color: '#E1F8EB', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sectionHeader: { marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: '#183629', fontSize: 19, fontWeight: '800' }, sectionSubtitle: { color: '#82938B', fontSize: 12, marginTop: 4 }, filters: { gap: 8, paddingVertical: 17, paddingRight: 20 }, filter: { paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2EBE5', borderRadius: 24 }, filterActive: { backgroundColor: '#0F7A56', borderColor: '#0F7A56' }, filterText: { color: '#526A5E', fontSize: 13, fontWeight: '700' }, filterTextActive: { color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E8EFEB', marginBottom: 12, padding: 16 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 }, offerIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, cardBody: { flex: 1 }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }, cardTitle: { fontSize: 16, color: '#17372A', fontWeight: '800', marginTop: 5 }, cardDescription: { fontSize: 13, color: '#788B81', lineHeight: 19, marginTop: 5 }, cardFooter: { marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#EEF3F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, previewTag: { backgroundColor: '#F0F5F2', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 }, previewText: { fontSize: 10, color: '#71867A', fontWeight: '800', letterSpacing: 0.5 }, detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 5 }, detailsText: { color: '#0F7A56', fontSize: 12, fontWeight: '800' }, notice: { flexDirection: 'row', gap: 8, paddingHorizontal: 3, marginTop: 9, alignItems: 'flex-start' }, noticeText: { flex: 1, color: '#82948A', fontSize: 12, lineHeight: 18 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 30, 22, 0.5)' }, backdropDismiss: { flex: 1 }, sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 36 }, sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D8E2DC', alignSelf: 'center', marginBottom: 20 }, sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, close: { padding: 8, backgroundColor: '#F1F5F2', borderRadius: 20 }, sheetTitle: { color: '#17372A', fontSize: 24, fontWeight: '800', marginTop: 8 }, sheetCopy: { color: '#667C70', fontSize: 14, lineHeight: 22, marginTop: 12 }, sheetNotice: { flexDirection: 'row', gap: 9, backgroundColor: '#EDF7F1', borderRadius: 12, padding: 14, marginTop: 20, alignItems: 'center' }, sheetNoticeText: { flex: 1, color: '#34654E', fontSize: 13, lineHeight: 19 }, doneButton: { backgroundColor: '#0F7A56', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 22 }, doneText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
