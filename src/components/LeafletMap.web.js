import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_CITY } from '../constants/config';
import LegacyMap from './LegacyMap.web';

let mapsLoader;
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!mapsLoader) {
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return Promise.reject(new Error('Google Maps web key is missing.'));
    mapsLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`;
      script.async = true;
      script.onload = () => window.google?.maps ? resolve(window.google.maps) : reject(new Error('Google Maps could not load.'));
      script.onerror = () => reject(new Error('Google Maps could not load. Check the web key and connection.'));
      document.head.appendChild(script);
    }).catch(error => { mapsLoader = null; throw error; });
  }
  return mapsLoader;
}
const point = (p) => {
  const lat = Number(Array.isArray(p) ? p[0] : p?.lat ?? p?.latitude);
  const lng = Number(Array.isArray(p) ? p[1] : p?.lng ?? p?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38.5 && lng >= 68 && lng <= 98 ? { lat, lng } : null;
};
export default function GoogleMapWeb({ center, zoom = 14, markers = [], route = [], pickerMode = false, flyTo, onCenterChange, onDraggingChange, onMarkerPress, fitBounds, fitPadding }) {
  const container = useRef(null); const map = useRef(null); const markerRefs = useRef([]); const line = useRef(null);
  const lastFly = useRef(null);
  const callbacks = useRef({});
  useEffect(() => { callbacks.current = { pickerMode, onCenterChange, onDraggingChange, onMarkerPress }; }, [pickerMode, onCenterChange, onDraggingChange, onMarkerPress]);
  const [ready, setReady] = useState(false); const [error, setError] = useState('');
  const start = useRef(point(center) || { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng });
  const path = useMemo(() => route.map(point).filter(Boolean), [route]);
  const bounds = useMemo(() => (fitBounds || []).map(point).filter(Boolean), [fitBounds]);
  const pathKey = JSON.stringify(path), boundsKey = JSON.stringify(bounds);
  useEffect(() => {
    let alive = true; let listeners = [];
    loadGoogleMaps().then(maps => {
      if (!alive || !container.current) return;
      const instance = new maps.Map(container.current, { center: start.current, zoom, disableDefaultUI: true, clickableIcons: false });
      map.current = instance;
      listeners = [instance.addListener('dragstart', () => { if (callbacks.current.pickerMode) callbacks.current.onDraggingChange?.(true); }), instance.addListener('idle', () => { if (callbacks.current.pickerMode) { const c = instance.getCenter(); callbacks.current.onDraggingChange?.(false); callbacks.current.onCenterChange?.({ lat: c.lat(), lng: c.lng() }); } }), instance.addListener('click', event => { if (callbacks.current.pickerMode && event.latLng) instance.panTo(event.latLng); })];
      setReady(true);
    }).catch(() => { if (alive) setError('Google Maps could not load. Check the web key and connection.'); });
    return () => { alive = false; listeners.forEach(listener => listener.remove()); markerRefs.current.forEach(marker => marker.setMap(null)); line.current?.setMap(null); map.current = null; };
    // Initialise the map once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    markerRefs.current.forEach(marker => marker.setMap(null));
    markerRefs.current = markers.map(item => { const position = point(item); if (!position) return null; const marker = new window.google.maps.Marker({ map: map.current, position, title: item.label }); marker.addListener('click', () => callbacks.current.onMarkerPress?.(item)); return marker; }).filter(Boolean);
  }, [ready, markers]);
  useEffect(() => {
    if (!ready || !map.current) return;
    line.current?.setMap(null);
    if (path.length >= 2) line.current = new window.google.maps.Polyline({ map: map.current, path, strokeColor: '#0f7a56', strokeOpacity: 0.95, strokeWeight: 5 });
  // The path key compares coordinates, not array identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pathKey]);
  useEffect(() => {
    if (!ready || !map.current) return;
    if (flyTo && point(flyTo) && flyTo.timestamp !== lastFly.current) { lastFly.current = flyTo.timestamp; map.current.panTo(point(flyTo)); map.current.setZoom(flyTo.zoom || 15); }
    else if (!pickerMode && bounds.length >= 2) { const b = new window.google.maps.LatLngBounds(); [...bounds, ...path].forEach(p => b.extend(p)); map.current.fitBounds(b, { top: fitPadding?.top ?? 50, bottom: fitPadding?.bottom ?? 50, left: 35, right: 35 }); }
    else if (!pickerMode && point(center)) { map.current.panTo(point(center)); map.current.setZoom(zoom); }
  // Coordinates and padding are compared by value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, flyTo?.timestamp, pickerMode, boundsKey, pathKey, center?.lat, center?.lng, zoom, fitPadding?.top, fitPadding?.bottom]);
  if (error) return <LegacyMap center={center} zoom={zoom} markers={markers} route={route} pickerMode={pickerMode} flyTo={flyTo} onCenterChange={onCenterChange} onDraggingChange={onDraggingChange} onMarkerPress={onMarkerPress} fitBounds={fitBounds} fitPadding={fitPadding} />;
  return <View style={styles.container}><div ref={container} style={{ width: '100%', height: '100%' }} />{!ready && <View style={styles.overlay}>{error ? <Text>{error}</Text> : <ActivityIndicator color="#0f7a56" />}</View>}</View>;
}
const styles = StyleSheet.create({ container: { flex: 1, width: '100%', height: '100%' }, overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f8f6' } });
