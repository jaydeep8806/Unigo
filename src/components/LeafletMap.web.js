import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { DEFAULT_CITY } from '../constants/config';
import { THEME } from '../constants/theme';

function isCoordsInIndia(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 6 && latitude <= 38.5 && longitude >= 68 && longitude <= 98;
}

/**
 * Web-native Leaflet Map using direct Leaflet.js DOM injection in the browser.
 * Provides high-speed 60fps rendering, custom ride-hailing pins, and route polylines.
 */
export default function LeafletMapWeb({
  center = { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng },
  zoom = 14,
  markers = [],
  route = [],
  pickerMode = false,
  flyTo = null,
  onCenterChange,
  onDraggingChange,
  onMarkerPress,
  fitBounds,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const pickerModeRef = useRef(pickerMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    pickerModeRef.current = pickerMode;
  }, [pickerMode]);

  useEffect(() => {
    if (pickerMode && mapInstanceRef.current && onCenterChange) {
      const currentCenter = mapInstanceRef.current.getCenter();
      onCenterChange({ lat: currentCenter.lat, lng: currentCenter.lng });
    }
  }, [pickerMode, loading, onCenterChange]);

  const validCenter = useMemo(() => (
    center && isCoordsInIndia(center.lat, center.lng)
      ? { lat: Number(center.lat), lng: Number(center.lng) }
      : { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng }
  ), [center]);

  // Inject Leaflet CSS & JS into web document head
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeafletAssets = async () => {
      if (!window.L) {
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!document.getElementById('leaflet-js')) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'leaflet-js';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Leaflet script'));
            document.head.appendChild(script);
          });
        }
      }

      // Initialize map once Leaflet is available
      if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
        try {
          const L = window.L;
          const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
            center: [validCenter.lat, validCenter.lng],
            zoom,
          });

          // High-reliability 100% free OpenStreetMap & Carto tile layers (zero API keys required)
          const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors',
          });

          tileLayer.on('tileerror', () => {
            // Fallback to Wikimedia / OSM mirror if OSM rate-limits
            const fallback = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              maxZoom: 19,
              subdomains: 'abcd',
            });
            fallback.addTo(map);
          });

          tileLayer.addTo(map);

          const markersGroup = L.layerGroup().addTo(map);
          const routeGroup = L.layerGroup().addTo(map);

          markersLayerRef.current = markersGroup;
          routeLayerRef.current = routeGroup;
          mapInstanceRef.current = map;

          map.on('movestart', () => {
            if (onDraggingChange) onDraggingChange(true);
          });

          map.on('moveend', () => {
            if (onDraggingChange) onDraggingChange(false);
            const c = map.getCenter();
            if (onCenterChange) {
              onCenterChange({ lat: c.lat, lng: c.lng });
            }
          });

          map.on('click', (event) => {
            if (pickerModeRef.current) map.panTo(event.latlng, { animate: true });
          });

          // Invalidate size to ensure full container fill
          setTimeout(() => map.invalidateSize(), 100);
          setTimeout(() => map.invalidateSize(), 400);

          setLoading(false);
        } catch (err) {
          console.error('[LeafletMapWeb] Init error:', err);
          setError('Failed to initialize map');
          setLoading(false);
        }
      }
    };

    loadLeafletAssets().catch((err) => {
      console.error(err);
      setError('Could not load map resources.');
      setLoading(false);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center & flyTo
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (flyTo && flyTo.lat && flyTo.lng) {
      mapInstanceRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom || 15, { duration: 1.2 });
    }
  }, [flyTo, loading]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer || !window.L) return;

    const L = window.L;
    layer.clearLayers();

    markers.forEach((m) => {
      const lat = Number(m.lat);
      const lng = Number(m.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const color = m.color || THEME.colors.primary;
      const svg = `
        <div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));width:28px;height:36px;position:relative;">
          <svg width="28" height="36" viewBox="0 0 26 34" fill="none">
            <path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 13 21 13 21s13-11.8 13-21c0-7.18-5.82-13-13-13z" fill="${color}"/>
            <circle cx="13" cy="13" r="4.5" fill="#FFFFFF"/>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-web-marker',
        html: svg,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(layer);

      if (m.label) {
        marker.bindTooltip(m.label, {
          permanent: markers.length <= 4,
          direction: 'bottom',
          offset: [0, 4],
          className: 'marker-label-web',
        });
      }

      marker.on('click', () => {
        if (onMarkerPress) onMarkerPress(m);
      });
    });
  }, [markers, onMarkerPress, loading]);

  // Update Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer || !window.L) return;

    const L = window.L;
    layer.clearLayers();

    if (route && route.length >= 2) {
      const coords = route
        .map((pt) => {
          if (Array.isArray(pt)) {
            const lat = Number(pt[0]);
            const lng = Number(pt[1]);
            return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
          }
          const lat = Number(pt.latitude ?? pt.lat);
          const lng = Number(pt.longitude ?? pt.lng);
          return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
        })
        .filter(Boolean);

      if (coords.length >= 2) {
        // Outer glow polyline
        L.polyline(coords, {
          color: '#064E3B',
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layer);

        // Inner crisp route polyline
        const polyline = L.polyline(coords, {
          color: THEME.colors.primary,
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layer);

        try {
          const bounds = polyline.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 16,
              animate: true,
            });
          }
        } catch (e) {
          console.warn('[LeafletMap.web] fitBounds error:', e);
        }
      }
    } else if (fitBounds && Array.isArray(fitBounds) && fitBounds.length >= 2) {
      try {
        const bounds = L.latLngBounds(fitBounds);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
        }
      } catch (e) {
        console.warn('[LeafletMap.web] fitBounds array error:', e);
      }
    }
  }, [route, fitBounds, loading]);

  return (
    <View style={styles.container}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#F8FAFC',
        }}
      />

      {loading && (
        <View style={styles.centerContainer} pointerEvents="none">
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading live map…</Text>
        </View>
      )}

      {error && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => window.location.reload()}>
            <Text style={styles.retryText}>Reload</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: THEME.colors.danger,
    marginBottom: 8,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
