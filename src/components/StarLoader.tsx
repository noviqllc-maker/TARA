// src/components/StarLoader.tsx
// The app's revolving-stars loading visual (a slow gold ring + ✦), with an optional
// message. Used while a chart is still computing.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Text } from './ui';
import { colors, fonts } from '@/theme';

export default function StarLoader({ message }: { message?: string }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1);
  }, []);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <View style={styles.center}>
      <View style={styles.ringWrap}>
        <Animated.View style={ringStyle}>
          <Svg width={160} height={160}>
            <Circle cx="80" cy="80" r="70" stroke={colors.line} strokeWidth="1" fill="none" />
            <Circle cx="80" cy="10" r="4" fill={colors.goldSoft} />
          </Svg>
        </Animated.View>
        <View style={styles.glyphWrap}><Text style={styles.glyph}>✦</Text></View>
      </View>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  glyphWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 30, lineHeight: 40, textAlign: 'center', includeFontPadding: false, color: colors.gold },
  msg: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '600', color: colors.cream, textAlign: 'center', marginTop: 36 },
});
