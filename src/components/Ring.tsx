// src/components/Ring.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from 'react-native-reanimated';
import { Text } from './ui';
import { colors, fonts } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function Ring({
  value, label, color = colors.gold, size = 120, stroke = 9,
}: { value: number; label?: string; color?: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value / 100, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - progress.value * c,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeLinecap="round"
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.serif, fontWeight: '600', fontSize: size * 0.27, color: colors.cream }}>{value}</Text>
        {label ? (
          <Text variant="eyebrow" color={colors.muted} style={{ marginTop: 2, fontSize: 9 }}>{label}</Text>
        ) : null}
      </View>
    </View>
  );
}
