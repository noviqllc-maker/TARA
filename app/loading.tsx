// app/loading.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, FadeIn, FadeOut,
} from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { loadingMessages } from '@/data/mock';
import { colors, fonts } from '@/theme';

export default function LoadingScreen() {
  const { update } = useProfile();
  const [idx, setIdx] = useState(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1);
    const iv = setInterval(() => setIdx((i) => (i + 1) % loadingMessages.length), 1500);
    const done = setTimeout(() => {
      update({ onboarded: true });
      router.replace('/(tabs)/home');
    }, loadingMessages.length * 1500 + 600);
    return () => { clearInterval(iv); clearTimeout(done); };
  }, []);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <View style={styles.root}>
      <CosmicBackground intense />
      <View style={styles.center}>
        <View style={styles.ringWrap}>
          <Animated.View style={ringStyle}>
            <Svg width={160} height={160}>
              <Circle cx="80" cy="80" r="70" stroke={colors.line} strokeWidth="1" fill="none" />
              <Circle cx="80" cy="10" r="4" fill={colors.goldSoft} />
            </Svg>
          </Animated.View>
          <View style={styles.glyphWrap}>
            <Text style={styles.glyph}>✦</Text>
          </View>
        </View>

        <View style={{ height: 40, marginTop: 36, justifyContent: 'center' }}>
          <Animated.View key={idx} entering={FadeIn.duration(500)} exiting={FadeOut.duration(400)}>
            <Text style={styles.msg}>{loadingMessages[idx]}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  glyphWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 30, lineHeight: 40, textAlign: 'center', includeFontPadding: false, color: colors.gold },
  msg: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '600', color: colors.cream, textAlign: 'center' },
});
