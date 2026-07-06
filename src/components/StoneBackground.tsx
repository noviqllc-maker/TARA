// src/components/StoneBackground.tsx
// Warm temple-stone backdrop for general (non-chart) screens in the v2 design system.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ds } from '@/theme';

export default function StoneBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[ds.stone2, ds.stone]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* soft marigold dawn glow at the top, like light over a temple threshold */}
      <View style={styles.glow} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute', top: -120, alignSelf: 'center',
    width: 360, height: 360, borderRadius: 360,
    backgroundColor: ds.marigold, opacity: 0.08,
  },
});
