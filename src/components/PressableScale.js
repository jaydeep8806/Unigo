import React, { useState } from 'react';
import { Animated, Pressable } from 'react-native';

/**
 * PressableScale
 * Provides smooth, subtle scale-down feedback (0.96) on touch
 */
export default function PressableScale({
  children,
  onPress,
  style,
  activeScale = 0.96,
  disabled = false,
  ...rest
}) {
  const [scale] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 24,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
