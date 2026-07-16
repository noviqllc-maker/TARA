// src/components/AspectDiagram.tsx
// Minimal gold-on-dark celestial diagram for the Ask Tara Calculation Card: an orbit
// ring with the transiting graha and, for an aspect factor, the natal graha it
// contacts — joined by the aspect line at the real aspect angle. For a house factor,
// the transiting graha sits on the ring with its natal-house marker. Purely visual;
// the factor data comes from the Vedic engine (computeTransitFactor).
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Text } from './ui';
import { TransitFactor } from '@/lib/vedic';
import { colors } from '@/theme';

export default function AspectDiagram({ factor, size = 128 }: { factor: TransitFactor; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 18;
  const dot = 26;
  const at = (deg: number) => {
    const a = (deg - 90) * (Math.PI / 180); // 0° at top, clockwise
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const A = at(0);
  const twoBody = !!factor.bodyB;
  // Aspect factor: separate the two bodies by the true aspect angle. House factor:
  // place the marker low-right for a balanced composition.
  const B = at(twoBody ? factor.angle : 130);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.gold} strokeOpacity={0.22} strokeWidth={1} fill="none" />
        {twoBody && (
          <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={colors.gold} strokeOpacity={0.55} strokeWidth={1.2} />
        )}
        <Circle cx={cx} cy={cy} r={1.6} fill={colors.goldSoft} />
      </Svg>

      <Body x={A.x} y={A.y} d={dot} glyph={factor.bodyA.glyph} />
      {twoBody ? (
        <Body x={B.x} y={B.y} d={dot} glyph={factor.bodyB!.glyph} />
      ) : (
        <HouseMarker x={B.x} y={B.y} d={dot} house={factor.house ?? 0} />
      )}
    </View>
  );
}

function Body({ x, y, d, glyph }: { x: number; y: number; d: number; glyph: string }) {
  return (
    <View style={[styles.node, { left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d / 2 }]}>
      <Text style={{ fontSize: 13, color: colors.goldSoft }}>{glyph}</Text>
    </View>
  );
}

function HouseMarker({ x, y, d, house }: { x: number; y: number; d: number; house: number }) {
  return (
    <View style={[styles.node, { left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d / 2 }]}>
      <Text style={{ fontSize: 11, color: colors.goldSoft, fontWeight: '700' }}>{house}H</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#120c1c', borderWidth: 1, borderColor: colors.gold,
  },
});
