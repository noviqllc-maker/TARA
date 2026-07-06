// app/intro.tsx
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Polygon, Line } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import CosmicBackground from '@/components/CosmicBackground';
import { Text } from '@/components/ui';
import { colors, fonts, shadow } from '@/theme';

const AView = Animated.View;

function SacredGeometry() {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 60000, easing: Easing.linear }), -1);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <AView style={[{ position: 'absolute' }, style]}>
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <Circle cx="150" cy="150" r="120" stroke={colors.gold} strokeWidth="0.7" opacity="0.3" fill="none" />
        <Circle cx="150" cy="150" r="90" stroke={colors.gold} strokeWidth="0.5" opacity="0.2" fill="none" />
        <Polygon points="150,40 245,205 55,205" stroke={colors.gold} strokeWidth="0.6" opacity="0.35" fill="none" />
        <Polygon points="150,260 55,95 245,95" stroke={colors.lav} strokeWidth="0.6" opacity="0.3" fill="none" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <Line key={i} x1="150" y1="150"
              x2={150 + 120 * Math.cos(a)} y2={150 + 120 * Math.sin(a)}
              stroke={colors.gold} strokeWidth="0.3" opacity="0.15" />
          );
        })}
      </Svg>
    </AView>
  );
}

export default function Intro() {
  const pulse = useSharedValue(1);
  const scale = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value * scale.value }] }));

  return (
    <View style={styles.root}>
      <CosmicBackground intense />
      <View style={styles.center}>
        <SacredGeometry />
        <AView entering={FadeIn.duration(1400)}>
          <Text style={styles.title}>TARA</Text>
        </AView>
        <AView entering={FadeIn.delay(700).duration(1400)}>
          <Text style={styles.wellness}>Wellness</Text>
        </AView>
        <AView entering={FadeIn.delay(1200).duration(1400)}>
          <Text variant="tiny" color={colors.goldSoft} style={styles.sub}>Your Vedic Life Guide</Text>
        </AView>
      </View>

      <AView entering={FadeInDown.delay(1700).duration(900)} style={styles.ctaWrap}>
        <Animated.View style={btnStyle}>
          <Pressable
            onPressIn={() => (scale.value = withSequence(withTiming(0.95, { duration: 90 }), withTiming(1, { duration: 200 })))}
            onPress={() => router.push('/(onboarding)/name')}
          >
            <LinearGradient
              colors={[colors.goldSoft, colors.terra]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.cta, shadow.gold]}
            >
              <Text variant="body" color="#1a1018" style={{ fontWeight: '600', fontSize: 16 }}>
                Start Journey
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </AView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: fonts.serif, fontSize: 58, fontWeight: '400', letterSpacing: 12,
    lineHeight: 70, color: colors.cream, textAlign: 'center', includeFontPadding: false,
  },
  wellness: { fontFamily: fonts.sans, fontSize: 18, fontWeight: '600', letterSpacing: 6, color: colors.gold, textAlign: 'center', marginTop: 2 },
  sub: { letterSpacing: 3, marginTop: 14, textAlign: 'center' },
  ctaWrap: { paddingBottom: 70, alignItems: 'center' },
  cta: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48 },
});
