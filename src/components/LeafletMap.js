import React, { useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { THEME } from '../constants/theme';
import { DEFAULT_CITY } from '../constants/config';

// India geographic bounding box (approximate)
function isCoordsInIndia(lat, lng) {
  return lat >= 6.0 && lat <= 38.5 && lng >= 68.0 && lng <= 98.0;
}

/**
 * LeafletMap – high-performance, robust WebView map component for India.
 * Uses CartoDB Voyager tiles (crisp, high-contrast, free, fast across India)
 * with OpenStreetMap as secondary tile source.
 */
export default function LeafletMap({
  center = { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng },
  zoom = 14,
  markers = [],
  route = [],
  pickerMode = false,
  onCenterChange,
  onMarkerPress,
  fitBounds,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webviewRef = useRef(null);

  // Validate center stays in India
  const validCenter = useMemo(() => {
    if (center && isCoordsInIndia(center.lat, center.lng)) {
      return center;
    }
    return { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng };
  }, [center]);

  const handleMessage = useCallback(
    (event) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'centerChange' && onCenterChange) {
          onCenterChange({ lat: msg.lat, lng: msg.lng });
        } else if (msg.type === 'markerPress' && onMarkerPress) {
          onMarkerPress(msg.marker);
        } else if (msg.type === 'mapReady') {
          setLoading(false);
        }
      } catch {
        // ignore parse errors
      }
    },
    [onCenterChange, onMarkerPress]
  );

  const markersJSON = JSON.stringify(markers);
  const routeJSON = JSON.stringify(route);
  const fitBoundsJSON = fitBounds ? JSON.stringify(fitBounds) : 'null';

  const html = useMemo(
    () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #E6F4EA;
    }
    #map {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 100%;
      background-color: #E6F4EA;
    }
    .center-pin {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      z-index: 1000;
      pointer-events: none;
      font-size: 38px;
      line-height: 1;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255, 255, 255, 0.7) !important;
      padding: 2px 5px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  ${pickerMode ? '<div class="center-pin">📍</div>' : ''}
  <script>
    function notify(type, data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
      }
    }

    function initMap() {
      if (typeof L === 'undefined') {
        setTimeout(initMap, 80);
        return;
      }

      try {
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: true
        }).setView([${validCenter.lat}, ${validCenter.lng}], ${zoom});

        // Crisp, high-contrast, fast CartoDB Voyager tiles (subdomains a,b,c,d)
        var primaryTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
          minZoom: 3
        });
        primaryTiles.addTo(map);

        // Markers
        var markers = ${markersJSON};
        markers.forEach(function(m) {
          if (!m.lat || !m.lng) return;
          var icon = L.divIcon({
            html: '<div style="width:28px;height:28px;border-radius:14px;background:' + (m.color || '#0F7A56') + ';border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:4px;background:white;"></div></div>',
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
          if (m.label) {
            marker.bindTooltip(m.label, { permanent: false, direction: 'top', offset: [0, -14] });
          }
          marker.on('click', function() {
            notify('markerPress', { marker: m });
          });
        });

        // Route polyline
        var routeCoords = ${routeJSON};
        if (routeCoords && routeCoords.length > 1) {
          L.polyline(routeCoords, {
            color: '#0F7A56',
            weight: 5,
            opacity: 0.85,
            smoothFactor: 1,
          }).addTo(map);
        }

        // Fit bounds if provided
        var fitBounds = ${fitBoundsJSON};
        if (fitBounds && fitBounds.length === 2 && fitBounds[0] && fitBounds[1]) {
          try {
            map.fitBounds(fitBounds, { padding: [50, 50], maxZoom: 16 });
          } catch(e) {}
        }

        // Picker mode moveend
        ${pickerMode ? `
        map.on('moveend', function() {
          var c = map.getCenter();
          notify('centerChange', { lat: c.lat, lng: c.lng });
        });
        ` : ''}

        // Invalidate size immediately and after layout completes
        map.invalidateSize();
        setTimeout(function() { map.invalidateSize(); }, 250);
        setTimeout(function() { map.invalidateSize(); }, 800);
        window.addEventListener('resize', function() { map.invalidateSize(); });

        notify('mapReady');
      } catch(err) {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#0F7A56;font-family:sans-serif;padding:20px;text-align:center;">Map loading...</div>';
      }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initMap();
    } else {
      window.addEventListener('DOMContentLoaded', initMap);
      window.addEventListener('load', initMap);
    }
  </script>
</body>
</html>`,
    [validCenter, zoom, markersJSON, routeJSON, fitBoundsJSON, pickerMode]
  );

  if (error) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          Map could not load. Check your internet connection.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://unpkg.com' }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        androidLayerType="hardware"
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4EA',
  },
  webview: {
    flex: 1,
    backgroundColor: '#E6F4EA',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.mutedText,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    padding: 24,
  },
  fallbackText: {
    fontSize: 14,
    color: THEME.colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
