import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DEFAULT_CITY } from '../constants/config';
import { THEME } from '../constants/theme';

const MAP_LOAD_TIMEOUT = 12000;

function isCoordsInIndia(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 6 && latitude <= 38.5 && longitude >= 68 && longitude <= 98;
}

/**
 * Leaflet.js map rendered inside a WebView using Google Maps / OpenStreetMap tiles.
 * Supports smooth screen-centered pin dropping and dragging for ride hailing.
 * Fully compatible with Expo Go — zero native build required.
 */
export default function LeafletMap({
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
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const validCenter = useMemo(() => (
    center && isCoordsInIndia(center.lat, center.lng)
      ? { lat: Number(center.lat), lng: Number(center.lng) }
      : { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng }
  ), [center]);

  // Timeout for map loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setErrorMessage('Map is taking too long to load. Check your internet connection.');
      }
    }, MAP_LOAD_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [reloadKey, loading]);

  // Send updated props to the WebView whenever they change
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    const payload = JSON.stringify({
      type: 'UPDATE_MAP',
      center: validCenter,
      zoom,
      markers,
      route,
      pickerMode,
      flyTo,
      fitBounds,
    });
    webViewRef.current.injectJavaScript(`
      try { if (window.__updateMap) { window.__updateMap(${payload}); } } catch(e) {}
      true;
    `);
  }, [mapReady, validCenter, zoom, markers, route, pickerMode, flyTo, fitBounds]);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CONSOLE_LOG') {
        console.log('[LeafletMap WebView]', data.message);
      } else if (data.type === 'MAP_READY') {
        setMapReady(true);
        if (data.lat && data.lng && onCenterChange) {
          onCenterChange({ lat: data.lat, lng: data.lng });
        }
      } else if (data.type === 'TILE_READY') {
        setLoading(false);
        setErrorMessage('');
      } else if (data.type === 'TILE_ERROR') {
        setLoading(false);
        setErrorMessage('Map tiles could not load. Check your connection.');
      } else if (data.type === 'MAP_DRAGGING') {
        if (onDraggingChange) onDraggingChange(Boolean(data.isDragging));
      } else if (data.type === 'CENTER_CHANGE' && onCenterChange) {
        if (onDraggingChange) onDraggingChange(false);
        onCenterChange({ lat: data.lat, lng: data.lng });
      } else if (data.type === 'MARKER_PRESS' && onMarkerPress) {
        const marker = markers.find(
          (m) => m.id === data.id || (Number(m.lat) === data.lat && Number(m.lng) === data.lng)
        );
        if (marker) onMarkerPress(marker);
      }
    } catch {
      // ignore JSON parse errors
    }
  }, [onCenterChange, onDraggingChange, onMarkerPress, markers]);

  const retry = () => {
    setLoading(true);
    setErrorMessage('');
    setMapReady(false);
    setReloadKey((k) => k + 1);
  };

  // Initial HTML only re-renders when reloadKey changes to prevent webview flicker.
  /* eslint-disable react-hooks/exhaustive-deps */
  const htmlContent = useMemo(
    () => generateMapHTML(validCenter, zoom, markers, route, pickerMode, fitBounds),
    [reloadKey]
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <View style={styles.container}>
      <WebView
        key={reloadKey}
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: 'https://google.com' }}
        style={styles.map}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        onError={(e) => {
          console.warn('[LeafletMap] WebView error:', e?.nativeEvent?.description);
          setLoading(false);
          setErrorMessage('Failed to load map.');
        }}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={retry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function generateMapHTML(center, zoom, markers, route, pickerMode, fitBounds) {
  const markersJSON = JSON.stringify(markers || []);
  const routeJSON = JSON.stringify(route || []);
  const fitBoundsJSON = JSON.stringify(fitBounds || null);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<style>
  html,body{
    width:100%;height:100%;margin:0;padding:0;overflow:hidden;
    background-color:#F8FAFC;
  }
  #map{
    position:absolute;top:0;bottom:0;left:0;right:0;
    width:100%;height:100%;
    background-color:#F8FAFC;
  }
  .marker-label{
    background:rgba(15,23,42,0.88);color:#FFFFFF;font-size:11px;font-weight:600;
    padding:3px 8px;border-radius:6px;white-space:nowrap;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    border:none;box-shadow:0 2px 6px rgba(0,0,0,0.25);
  }
  .marker-label::before{display:none}
  .leaflet-control-attribution{font-size:8px!important;opacity:0.6}
</style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  function sendLog(msg){
    try {
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'CONSOLE_LOG',message:msg}));
      }
    }catch(e){}
  }

  window.onerror=function(msg,url,line){
    sendLog('JS_ERR: '+msg+' at line '+line);
  };

  function startInit(){
    if(typeof L === 'undefined'){
      if(!window.__triedUnpkg){
        window.__triedUnpkg = true;
        var s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = function(){ setTimeout(startInit, 50); };
        s.onerror = function(){ sendLog('Unpkg fallback also failed'); };
        document.head.appendChild(s);
        return;
      }
      setTimeout(startInit, 80);
      return;
    }
    initLeaflet();
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    startInit();
  } else {
    window.addEventListener('DOMContentLoaded', startInit);
  }

  function initLeaflet(){
    try {
      var map = L.map('map',{
        zoomControl: false,
        attributionControl: false,
        center: [${center.lat}, ${center.lng}],
        zoom: ${zoom}
      });

      // High-resolution Google Maps tiles with OpenStreetMap fallback
      var tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '© Google Maps'
      });

      function onTileReady() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'TILE_READY'}));
      }

      tileLayer.on('tileload', onTileReady);
      tileLayer.on('tileerror', function() {
        if (!window.__switchedToOsm) {
          window.__switchedToOsm = true;
          map.removeLayer(tileLayer);
          var fallbackLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          });
          fallbackLayer.on('tileload', onTileReady);
          fallbackLayer.on('tileerror', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({type:'TILE_ERROR'}));
          });
          fallbackLayer.addTo(map);
        }
      });

      tileLayer.addTo(map);

      // Force size invalidation so tiles load immediately
      setTimeout(function(){ map.invalidateSize(); }, 80);
      setTimeout(function(){ map.invalidateSize(); }, 350);
      setTimeout(function(){ map.invalidateSize(); }, 900);
      window.addEventListener('resize', function(){ map.invalidateSize(); });

      var markersLayer = L.layerGroup().addTo(map);
      var routeLayer = L.layerGroup().addTo(map);
      var isPickerMode = ${pickerMode ? 'true' : 'false'};
      var lastFlyToTimestamp = null;
      var lastBoundsKey = null;

      function createIcon(color){
        var svg = '<svg width=\"26\" height=\"34\" viewBox=\"0 0 26 34\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">' +
          '<path d=\"M13 0C5.82 0 0 5.82 0 13c0 9.2 13 21 13 21s13-11.8 13-21c0-7.18-5.82-13-13-13z\" fill=\"' + color + '\"/>' +
          '<circle cx=\"13\" cy=\"13\" r=\"4.5\" fill=\"#FFFFFF\"/>' +
        '</svg>';
        return L.divIcon({
          className: '',
          html: '<div style=\"filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));position:relative;width:26px;height:34px;\">' + svg + '</div>',
          iconSize: [26, 34],
          iconAnchor: [13, 34],
          popupAnchor: [0, -34]
        });
      }

      function updateMarkers(list){
        markersLayer.clearLayers();
        (list||[]).forEach(function(m){
          var lat=Number(m.lat),lng=Number(m.lng);
          if(!isFinite(lat)||!isFinite(lng))return;
          var marker=L.marker([lat,lng],{icon:createIcon(m.color||'#0F7A56')});
          if(m.label){
            var isPerm = m.permanent !== undefined ? Boolean(m.permanent) : ((list||[]).length <= 4);
            marker.bindTooltip(m.label,{
              permanent: isPerm,
              direction: 'bottom',
              offset: [0, 4],
              className: 'marker-label'
            });
          }
          marker.on('click',function(){
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type:'MARKER_PRESS',id:m.id,lat:lat,lng:lng
            }));
          });
          markersLayer.addLayer(marker);
        });
      }

      function updateRoute(coords){
        routeLayer.clearLayers();
        if(!coords||coords.length<2)return;
        var latlngs=coords.map(function(c){
          if(Array.isArray(c))return[c[0],c[1]];
          return[c.latitude||c.lat,c.longitude||c.lng];
        });
        L.polyline(latlngs,{
          color:'#0F7A56',weight:5,opacity:0.88,
          lineCap:'round',lineJoin:'round'
        }).addTo(routeLayer);
      }

      function doFitBounds(bounds){
        if(!bounds||bounds.length!==2)return;
        try{
          var b=L.latLngBounds(
            L.latLng(bounds[0][0],bounds[0][1]),
            L.latLng(bounds[1][0],bounds[1][1])
          );
          map.fitBounds(b,{padding:[60,40],animate:true,maxZoom:16});
        }catch(e){}
      }

      // Map drag and movement handlers for picker mode
      map.on('movestart', function(){
        if(isPickerMode){
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_DRAGGING', isDragging: true
          }));
        }
      });

      map.on('moveend', function(){
        if(isPickerMode){
          var c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CENTER_CHANGE',
            lat: c.lat,
            lng: c.lng,
            isDragging: false
          }));
        }
      });

      // Tap anywhere on map to smoothly center that spot in picker mode
      map.on('click', function(e){
        if(isPickerMode && e.latlng){
          map.panTo(e.latlng, { animate: true });
        }
      });

      // Initial render
      updateMarkers(${markersJSON});
      updateRoute(${routeJSON});
      var initBounds=${fitBoundsJSON};
      if(initBounds) {
        lastBoundsKey = JSON.stringify(initBounds);
        doFitBounds(initBounds);
      }

      // Global update function called from React Native
      window.__updateMap=function(data){
        if(data.pickerMode!==undefined) {
          if (data.pickerMode && !isPickerMode) {
            lastBoundsKey = null;
            var pickerCenter = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'CENTER_CHANGE', lat: pickerCenter.lat, lng: pickerCenter.lng
            }));
          }
          isPickerMode = Boolean(data.pickerMode);
        }

        if(data.flyTo && data.flyTo.timestamp !== lastFlyToTimestamp && isFinite(data.flyTo.lat) && isFinite(data.flyTo.lng)){
          lastFlyToTimestamp = data.flyTo.timestamp;
          map.setView([data.flyTo.lat, data.flyTo.lng], 15, { animate: true });
        } else if(!isPickerMode){
          if(data.fitBounds && data.fitBounds.length===2){
            var boundsKey = JSON.stringify(data.fitBounds);
            if (boundsKey !== lastBoundsKey) {
              lastBoundsKey = boundsKey;
              doFitBounds(data.fitBounds);
            }
          } else if(data.center && isFinite(data.center.lat) && isFinite(data.center.lng)){
            lastBoundsKey = null;
            var c = map.getCenter();
            var d = Math.abs(c.lat - data.center.lat) + Math.abs(c.lng - data.center.lng);
            if (d > 0.001) {
              map.setView([data.center.lat, data.center.lng], data.zoom||map.getZoom(), {animate:true});
            }
          }
        }

        if(data.markers) updateMarkers(data.markers);
        if(data.route!==undefined) updateRoute(data.route);
        map.invalidateSize();
      };

      // Signal ready
      map.whenReady(function(){
        map.invalidateSize();
        var c = map.getCenter();
        setTimeout(function(){
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type:'MAP_READY',
            lat: c.lat,
            lng: c.lng
          }));
        },200);
      });
    } catch(err){
      sendLog('INIT_EX: '+err.message);
    }
  }
})();
<\/script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    color: THEME.colors.mutedText,
    fontSize: 13,
  },
  errorBanner: {
    position: 'absolute',
    top: '45%',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 20,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
  },
  retryText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: THEME.fontWeights.bold,
  },
});
