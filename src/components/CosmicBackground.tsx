// src/components/CosmicBackground.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme';

const { width, height } = Dimensions.get('window');

function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const op = useSharedValue(0.2);
  React.useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(withTiming(0.9, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size, backgroundColor: '#fff' },
        style,
      ]}
    />
  );
}

export default function CosmicBackground({ intense = false }: { intense?: boolean }) {
  const stars = useMemo(
    () =>
      Array.from({ length: intense ? 80 : 46 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.6,
        delay: Math.random() * 2000,
      })),
    [intense],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.bg, colors.bg2, colors.black]}
        style={StyleSheet.absoluteFill}
      />
      {/* nebula glows */}
      <View style={[styles.nebula, { backgroundColor: colors.lav, top: -80, right: -60 }]} />
      <View style={[styles.nebula, { backgroundColor: colors.terra, bottom: -100, left: -70, opacity: 0.1 }]} />
      {stars.map((s, i) => (
        <Star key={i} {...s} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nebula: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    opacity: 0.16,
  },
});
