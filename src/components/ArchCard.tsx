// src/components/ArchCard.tsx
// Signature element of the temple-material design system: a sandalwood card with a
// kolam-style dotted arch tracing a gopuram threshold across its top edge, and a soft
// diya glow behind the focal value.
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { ds, type as t, space, radii } from '@/theme';

type Props = {
  eyebrow?: string;
  title?: string;
  value?: React.ReactNode;
  sub?: string;
  valueColor?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

// Kolam dotted arch — a shallow gopuram curve of marigold dots across the top edge.
function DottedArch() {
  return (
    <Svg width="100%" height={30} viewBox="0 0 320 30" preserveAspectRatio="xMidYMid meet" style={styles.arch}>
      <Path
        d="M12 27 Q160 1 308 27"
        fill="none"
        stroke={ds.marigold}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeDasharray="0.1 11"
        opacity={0.9}
      />
    </Svg>
  );
}

// Diya glow — marigold radial light bloom behind the focal stat.
function DiyaGlow() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="diya" cx="50%" cy="42%" r="55%">
          <Stop offset="0%" stopColor={ds.marigold} stopOpacity={0.26} />
          <Stop offset="55%" stopColor={ds.marigold} stopOpacity={0.08} />
          <Stop offset="100%" stopColor={ds.marigold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50%" cy="44%" rx="58%" ry="46%" fill="url(#diya)" />
    </Svg>
  );
}

export default function ArchCard({ eyebrow, title, value, sub, valueColor = ds.ink, children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <DottedArch />
      <View style={styles.card}>
        <DiyaGlow />
        <View style={{ alignItems: 'center' }}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {value != null ? (
            typeof value === 'string' || typeof value === 'number'
              ? <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
              : <View style={{ marginTop: space.sm }}>{value}</View>
          ) : null}
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 15 }, // room for the arch to sit above the card
  arch: { position: 'absolute', top: 0, left: 0, right: 0 },
  card: {
    backgroundColor: ds.sandal,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: ds.hairline,
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: t.bodyBold, fontSize: 11, letterSpacing: 2.2,
    textTransform: 'uppercase', color: ds.kumkum, marginBottom: space.sm,
  },
  title: {
    fontFamily: t.displaySemi, fontSize: 29, lineHeight: 34,
    color: ds.ink, textAlign: 'center',
  },
  value: {
    fontFamily: t.monoMed, fontSize: 44, lineHeight: 52,
    marginTop: space.md, includeFontPadding: false, textAlign: 'center',
  },
  sub: {
    fontFamily: t.body, fontSize: 13.5, lineHeight: 20,
    color: ds.inkMuted, textAlign: 'center', marginTop: space.sm,
  },
});
