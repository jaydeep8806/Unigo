import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { DEFAULT_CITY } from '../constants/config';

const validPoint = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat) >= 6 && Number(lat) <= 38.5 && Number(lng) >= 68 && Number(lng) <= 98;
const coordinate = (point) => {
  const lat = Array.isArray(point) ? point[0] : point?.latitude ?? point?.lat;
  const lng = Array.isArray(point) ? point[1] : point?.longitude ?? point?.lng;
  return validPoint(lat, lng) ? { latitude: Number(lat), longitude: Number(lng) } : null;
};

export default function GoogleMap({ center, zoom = 14, markers = [], route = [], pickerMode = false, flyTo, onCenterChange, onDraggingChange, onMarkerPress, fitBounds, fitPadding }) {
  const map = useRef(null);
  const lastFly = useRef(null);
  const [ready, setReady] = useState(false);
  const [initial] = useState(() => coordinate(center) || { latitude: DEFAULT_CITY.lat, longitude: DEFAULT_CITY.lng });
  const path = useMemo(() => route.map(coordinate).filter(Boolean), [route]);
  const bounds = useMemo(() => (fitBounds || []).map(coordinate).filter(Boolean), [fitBounds]);
  const boundsKey = JSON.stringify(bounds);
  const pathKey = JSON.stringify(path);
  const targetLat = Number(center?.lat ?? center?.latitude);
  const targetLng = Number(center?.lng ?? center?.longitude);
  const latDelta = Math.min(80, 360 / Math.pow(2, Math.max(1, zoom - 1)));

  useEffect(() => {
    if (!ready || !map.current) return;
    if (flyTo && validPoint(flyTo.lat, flyTo.lng) && flyTo.timestamp !== lastFly.current) {
      lastFly.current = flyTo.timestamp;
      map.current.animateToRegion({ latitude: Number(flyTo.lat), longitude: Number(flyTo.lng), latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
      return;
    }
    if (!pickerMode && bounds.length >= 2) {
      const points = [...bounds, ...path];
      map.current.fitToCoordinates(points, { edgePadding: { top: fitPadding?.top ?? 50, bottom: fitPadding?.bottom ?? 50, left: 35, right: 35 }, animated: true });
    } else if (!pickerMode && validPoint(targetLat, targetLng)) {
      map.current.animateToRegion({ latitude: targetLat, longitude: targetLng, latitudeDelta: latDelta, longitudeDelta: latDelta }, 400);
    }
  // Coordinates are compared by value to avoid refitting when parent renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pickerMode, flyTo?.timestamp, targetLat, targetLng, zoom, boundsKey, pathKey, fitPadding?.top, fitPadding?.bottom]);

  const regionChanged = useCallback((region) => {
    if (!pickerMode) return;
    onDraggingChange?.(false);
    onCenterChange?.({ lat: region.latitude, lng: region.longitude });
  }, [pickerMode, onCenterChange, onDraggingChange]);

  return <View collapsable={false} style={styles.container}><MapView ref={map} provider={PROVIDER_GOOGLE} userInterfaceStyle="light" style={styles.map}
    initialRegion={{ ...initial, latitudeDelta: latDelta, longitudeDelta: latDelta }}
    onMapReady={() => { setReady(true); if (pickerMode) onCenterChange?.({ lat: initial.latitude, lng: initial.longitude }); }}
    onPanDrag={() => { if (pickerMode) onDraggingChange?.(true); }}
    onRegionChangeComplete={regionChanged}
    onPress={(event) => { if (pickerMode) map.current?.animateToRegion({ ...event.nativeEvent.coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 300); }}>
    {markers.map((marker, index) => { const point = coordinate(marker); return point ? <Marker key={marker.id || `${index}-${point.latitude}-${point.longitude}`} coordinate={point} title={marker.label} pinColor={marker.color || '#0f7a56'} onPress={() => onMarkerPress?.(marker)} /> : null; })}
    {path.length >= 2 && <Polyline coordinates={path} strokeColor="#0f7a56" strokeWidth={5} />}
  </MapView></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, width: '100%', height: '100%' }, map: { width: '100%', height: '100%' } });
