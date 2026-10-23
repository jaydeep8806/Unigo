import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

/**
 * Toast component
 * Smooth floating notification toast replacing Alert for "Coming soon" messages
 */
export default function Toast({
  visible = false,
  message = '',
  duration = 2400,
  onDismiss,
  icon = 'information-circle',
}) {
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(-80));
  const [opacity] = useState(() => new Animated.Value(0));

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  }, [opacity, translateY, onDismiss]);

  const dismissImmediate = useCallback(() => {
    translateY.setValue(-80);
    opacity.setValue(0);
  }, [opacity, translateY]);

  useEffect(() => {
    let timer;
    if (visible && message) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 16,
          useNativeDriver: true,
          speed: 16,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timer = setTimeout(() => {
        dismiss();
      }, duration);
    } else {
      dismissImmediate();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, message, duration, insets.top, opacity, translateY, dismiss, dismissImmediate]);

  if (!visible && !message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={icon} size={20} color={THEME.colors.accent} style={styles.icon} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: THEME.radius.pill,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    maxWidth: '92%',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: THEME.fontWeights.semibold,
    letterSpacing: 0.2,
  },
});
