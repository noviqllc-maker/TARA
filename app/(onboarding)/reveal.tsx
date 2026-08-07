// app/(onboarding)/reveal.tsx — Screen 1: placements reveal (the payoff moment).
// Presentation only: a soft sequential entrance choreographs the elements on mount.
// Uses Reanimated (already a dependency) with shared values so opacity/transform run on
// the UI thread (native-driver equivalent). Honors Reduce Motion, runs once on mount, and
// only starts once the real chart content mounts — never behind the star loader.
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, AccessibilityInfo } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import CelestialReveal from '@/components/CelestialReveal';
import StarLoader from '@/components/StarLoader';
import { Text, GoldButton } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { BirthChart } from '@/lib/vedic';
import { getTraitLines } from '@/data/traitLines';
import { colors, fonts, radius, spacing } from '@/theme';

const EASE = Easing.out(Easing.cubic); // gentle easeOut
const DUR = 450;                        // base fade+drift duration

// One entrance unit: fade 0→1 with an optional upward drift and/or scale, on a delay. When
// `reduceMotion` is set it renders at its final state with no animation. `pulse` adds a brief
// 1→1.04→1 scale swell just after the fade completes (used to headline the nakshatra).
type RiseProps = {
  delay: number; duration?: number; drift?: number; scaleFrom?: number;
  pulse?: boolean; fadeOnly?: boolean; reduceMotion: boolean;
  style?: any; children: React.ReactNode;
};
function Rise({ delay, duration = DUR, drift = 14, scaleFrom, pulse, fadeOnly, reduceMotion, style, children }: RiseProps) {
  const o = useSharedValue(reduceMotion ? 1 : 0);
  const ty = useSharedValue(reduceMotion || fadeOnly ? 0 : drift);
  const sc = useSharedValue(reduceMotion ? 1 : (scaleFrom ?? 1));

  useEffect(() => {
    if (reduceMotion) return; // already at final state — no animation
    o.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
    if (!fadeOnly) ty.value = withDelay(delay, withTiming(0, { duration, easing: EASE }));
    if (scaleFrom != null) sc.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
    if (pulse) {
      sc.value = withDelay(delay + duration, withSequence(
        withTiming(1.04, { duration: 150, easing: EASE }),
        withTiming(1, { duration: 150, easing: EASE }),
      ));
    }
    // Mount-only: the sequence plays once and never replays on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aStyle = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: ty.value }, { scale: sc.value }],
  }));
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

export default function Reveal() {
  const insets = useSafeAreaInsets();
  const chart = useChart();
  const nav = useNavigation();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => { nav.setOptions?.({ gestureEnabled: false }); }, [nav]);

  // Resolve the OS Reduce Motion setting once (async). We gate the content on this so the
  // choreography's initial hidden state is only used when we will actually animate.
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduceMotion(v); })
      .catch(() => { if (alive) setReduceMotion(false); });
    return () => { alive = false; };
  }, []);

  // Chart not ready (or Reduce-Motion not resolved yet) → the revolving-stars loading state.
  // The entrance sequence therefore starts when the real content mounts, not behind the loader.
  if (!chart || reduceMotion === null) {
    return (
      <View style={{ flex: 1 }}>
        <CosmicBackground intense />
        <StarLoader message="Casting your chart…" />
      </View>
    );
  }

  return <RevealContent chart={chart} reduceMotion={reduceMotion} insets={insets} />;
}

// Mounts once, only with real content in hand → every Rise below plays its entrance a single
// time. `reduceMotion` is known before this mounts, so each unit initializes correctly.
function RevealContent({ chart, reduceMotion, insets }: { chart: BirthChart; reduceMotion: boolean; insets: EdgeInsets }) {
  const placements = [
    { label: 'Sun Sign', glyph: '☉', value: chart.sunSign },
    { label: 'Moon Sign', glyph: '☽', value: chart.moonSign },
    { label: 'Rising', glyph: '↑', value: chart.ascendant.sign },
  ];
  const traits = getTraitLines(chart);

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Celestial visual — 0ms, longer, breathes in (scale 0.96→1 + fade) */}
        <Rise delay={0} duration={700} fadeOnly scaleFrom={0.96} reduceMotion={reduceMotion} style={styles.top}>
          <CelestialReveal size={180} />
        </Rise>

        <View style={styles.middle}>
          {/* 2. Placements row — 500ms, as one unit */}
          <Rise delay={500} reduceMotion={reduceMotion} style={styles.placeRise}>
            <View style={styles.placeRow}>
              {placements.map((p) => (
                <View key={p.label} style={styles.placeCol}>
                  <Text variant="eyebrow" color={colors.mutedDim} style={styles.placeLabel}>{p.label}</Text>
                  <Text style={styles.placeValue}>
                    <Text style={{ color: colors.gold }}>{p.glyph}</Text> {p.value}
                  </Text>
                </View>
              ))}
            </View>
          </Rise>

          {/* 3. Birth star — 850ms, with a brief scale pulse so the nakshatra reads as headline */}
          <Rise delay={850} pulse reduceMotion={reduceMotion}>
            <View style={styles.birthStar}>
              <Text variant="eyebrow" color={colors.gold} style={styles.placeLabel}>Birth Star (Nakshatra)</Text>
              <Text style={styles.birthStarValue}>
                <Text style={{ color: colors.gold }}>✦</Text> {chart.nakshatra}
              </Text>
            </View>
          </Rise>

          {/* 5. Caption rides with the placements row (same 500ms unit) */}
          <Rise delay={500} reduceMotion={reduceMotion}>
            <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 12, letterSpacing: 0.4 }}>
              Vedic (sidereal) placements
            </Text>
          </Rise>

          {/* 4. Trait lines — one at a time (1100 / 1400 / 1700…), each landing like a spoken line */}
          <View style={styles.traits}>
            {traits.map((t, i) => (
              <Rise key={i} delay={1100 + i * 300} drift={12} reduceMotion={reduceMotion}>
                <Text variant="serif" style={styles.trait}>{t}</Text>
              </Rise>
            ))}
          </View>
        </View>

        {/* Footer caption + CTA */}
        <View>
          {/* 6. Footer — 2000ms, fade only, settling quietly */}
          <Rise delay={2000} fadeOnly reduceMotion={reduceMotion} style={{ marginBottom: 18 }}>
            <Text variant="eyebrow" color={colors.gold} style={styles.footerLine1}>
              Ancient Vedic wisdom. Precise celestial calculations.
            </Text>
            <Text variant="eyebrow" color={colors.mutedDim} style={styles.footerLine2}>
              Guidance written from your stars alone.
            </Text>
          </Rise>

          {/* 7. Continue — 2200ms, fade + drift. Always mounted, so a mid-sequence tap navigates normally. */}
          <Rise delay={2200} reduceMotion={reduceMotion}>
            <GoldButton label="Continue" onPress={() => router.replace('/(onboarding)/notifications' as any)} />
          </Rise>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  top: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  middle: { alignItems: 'center' },

  placeRise: { alignSelf: 'stretch' },
  placeRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 4 },
  placeCol: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  placeLabel: { fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center' },
  placeValue: { fontFamily: fonts.serif, fontSize: 15, color: colors.cream, textAlign: 'center', marginTop: 6 },

  birthStar: {
    alignItems: 'center', marginTop: 20, paddingVertical: 11, paddingHorizontal: 20,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.07)',
  },
  birthStarValue: { fontFamily: fonts.serifMed, fontSize: 19, color: colors.goldSoft, textAlign: 'center', marginTop: 6 },

  traits: { marginTop: 24, alignItems: 'center', gap: 6 },
  trait: { fontSize: 20, lineHeight: 26, textAlign: 'center', color: colors.cream },

  footerLine1: { textAlign: 'center', fontSize: 9.5, lineHeight: 15, letterSpacing: 1.6 },
  footerLine2: { textAlign: 'center', fontSize: 9, lineHeight: 14, letterSpacing: 1.2, marginTop: 5 },
});
