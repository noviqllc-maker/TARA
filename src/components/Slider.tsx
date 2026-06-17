// src/components/Slider.tsx
import React from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { colors } from '@/theme';

export default function Slider({
  value, onChange, min = 1, max = 10, color = colors.gold,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; color?: string }) {
  const width = useSharedValue(1);
  const pct = (value - min) / (max - min);

  const setFromX = (x: number) => {
    'worklet';
    const clamped = Math.max(0, Math.min(1, x / width.value));
    const v = Math.round(min + clamped * (max - min));
    runOnJS(onChange)(v);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => setFromX(e.x))
    .onUpdate((e) => setFromX(e.x));

  const fillStyle = useAnimatedStyle(() => ({ width: `${pct * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${pct * 100}%` }));

  const onLayout = (e: LayoutChangeEvent) => { width.value = e.nativeEvent.layout.width; };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.track} onLayout={onLayout} hitSlop={16}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
        <Animated.View style={[styles.thumb, { backgroundColor: color }, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 16, justifyContent: 'center' },
  fill: { position: 'absolute', height: 6, borderRadius: 6, left: 0 },
  thumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, marginLeft: -10, shadowColor: colors.gold, shadowOpacity: 0.6, shadowRadius: 6 },
});
