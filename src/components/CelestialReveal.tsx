// src/components/CelestialReveal.tsx
// Large celestial visual for the placements-reveal screen: a softly glowing moon on
// a thin orbit ring with a couple of planets — gold-on-dark, in Tara's art style.
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { colors } from '@/theme';

export default function CelestialReveal({ size = 200 }: { size?: number }) {
  const c = size / 2;
  const rx = c - 12;
  const ry = c - 38;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="tara-moon" cx="42%" cy="36%" r="72%">
            <Stop offset="0%" stopColor={colors.cream} stopOpacity={0.95} />
            <Stop offset="55%" stopColor={colors.goldSoft} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={colors.indigo} stopOpacity={0.18} />
          </RadialGradient>
          <RadialGradient id="tara-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.gold} stopOpacity={0.26} />
            <Stop offset="100%" stopColor={colors.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle cx={c} cy={c} r={c} fill="url(#tara-glow)" />
        <Ellipse cx={c} cy={c} rx={rx} ry={ry} stroke={colors.gold} strokeOpacity={0.25} strokeWidth={1} fill="none" />
        <Circle cx={c} cy={c} r={size * 0.28} fill="url(#tara-moon)" stroke={colors.goldSoft} strokeOpacity={0.4} strokeWidth={1} />
        {/* orbiting planets on the ring */}
        <Circle cx={c + rx} cy={c} r={4.5} fill={colors.goldSoft} />
        <Circle cx={c - rx * 0.5} cy={c - ry * 0.86} r={2.6} fill={colors.cream} opacity={0.85} />
      </Svg>
    </View>
  );
}
