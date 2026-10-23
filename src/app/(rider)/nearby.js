import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationProvider';
import { THEME } from '../../constants/theme';
import { DEFAULT_CITY } from '../../constants/config';
import { fetchNearbyPOIs, generateFallbackPlaces } from '../../services/overpass';
import LeafletMap from '../../components/LeafletMap';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';

export default function NearbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const type = params.type === 'shops' ? 'shops' : 'food';
  const isFood = type === 'food';

  const { coordinates, selectedCity } = useLocation();

  const center = useMemo(() => {
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const lat = coordinates.latitude;
      const lng = coordinates.longitude;
      if (lat >= 6.0 && lat <= 38.5 && lng >= 68.0 && lng <= 98.0) {
        return { lat, lng };
      }
    }
    const city = selectedCity || DEFAULT_CITY;
    return { lat: city.lat, lng: city.lng };
  }, [coordinates, selectedCity]);

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg = 'Ordering coming soon') => {
    setToastMessage(msg);
    setToastVisible(true);
  }, []);

  // Fetch POIs on mount
  useEffect(() => {
    let mounted = true;
    async function loadPlaces() {
      setLoading(true);
      const queryTypes = isFood
        ? ['restaurant', 'fast_food', 'cafe']
        : ['supermarket', 'convenience', 'mall', 'bakery'];

      try {
        const results = await fetchNearbyPOIs(center.lat, center.lng, queryTypes, 2000);
        if (mounted) {
          if (results && results.length > 0) {
            setPlaces(results);
          } else {
            setPlaces(generateFallbackPlaces(center.lat, center.lng, type, 8));
          }
        }
      } catch {
        if (mounted) {
          setPlaces(generateFallbackPlaces(center.lat, center.lng, type, 8));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPlaces();
    return () => {
      mounted = false;
    };
  }, [center, isFood, type]);

  // Markers for LeafletMap
  const markers = useMemo(() => {
    return places.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      label: p.name,
      color: p.id === selectedPlaceId ? '#EF4444' : '#0F7A56',
    }));
  }, [places, selectedPlaceId]);

  const handleMarkerPress = useCallback(
    (m) => {
      setSelectedPlaceId(m.id);
      showToast('Ordering coming soon');
    },
    [showToast]
  );

  const handlePlacePress = useCallback(
    (place) => {
      setSelectedPlaceId(place.id);
      showToast('Ordering coming soon');
    },
    [showToast]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isFood ? 'Food & Cafes Near You' : 'Shops & Supermarkets'}
          </Text>
          <Text style={styles.headerSubtitle}>
            📍 Within 2 km • {selectedCity?.name || 'Local'}
          </Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {isFood ? '🍔 Food' : '🛒 Shops'}
          </Text>
        </View>
      </View>

      {/* Map Section (top 42%) */}
      <View style={styles.mapContainer}>
        <LeafletMap
          center={center}
          zoom={14}
          markers={markers}
          onMarkerPress={handleMarkerPress}
        />
      </View>

      {/* Places List (bottom 58%) */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listSectionTitle}>
            {isFood ? 'Nearby Places to Eat' : 'Nearby Stores'} ({places.length})
          </Text>
          {loading && <ActivityIndicator size="small" color={THEME.colors.primary} />}
        </View>

        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(20, insets.bottom + 12) },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isSelected = item.id === selectedPlaceId;
            return (
              <PressableScale
                style={[styles.placeCard, isSelected && styles.placeCardSelected]}
                onPress={() => handlePlacePress(item)}
              >
                <View style={styles.placeIconBox}>
                  <Text style={{ fontSize: 22 }}>
                    {isFood ? (index % 2 === 0 ? '🍕' : '☕') : '🛍️'}
                  </Text>
                </View>
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.placeMeta} numberOfLines={1}>
                    {item.type.replace('_', ' ').toUpperCase()} • 4.{7 - (index % 3)} ★ (120+ ratings)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.orderBtn}
                  onPress={() => showToast('Ordering coming soon')}
                >
                  <Text style={styles.orderBtnText}>Order</Text>
                </TouchableOpacity>
              </PressableScale>
            );
          }}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={32} color={THEME.colors.mutedText} />
                <Text style={styles.emptyText}>No places found in this area.</Text>
              </View>
            )
          }
        />
      </View>

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.tile,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.mutedText,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.primaryDark,
  },
  mapContainer: {
    height: '38%',
    width: '100%',
    backgroundColor: '#E8F0E8',
  },
  listContainer: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -10,
    ...THEME.shadows.card,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: THEME.fontWeights.extrabold,
    color: THEME.colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.tile,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  placeCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#E6F4EA',
  },
  placeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
    marginRight: 8,
  },
  placeName: {
    fontSize: 14,
    fontWeight: THEME.fontWeights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: 3,
  },
  placeMeta: {
    fontSize: 11,
    color: THEME.colors.mutedText,
  },
  orderBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
  },
  orderBtnText: {
    fontSize: 12,
    fontWeight: THEME.fontWeights.extrabold,
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.mutedText,
    marginTop: 8,
  },
});
