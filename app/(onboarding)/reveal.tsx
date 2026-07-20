// app/(onboarding)/reveal.tsx — Screen 1: placements reveal (the payoff moment).
import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import CelestialReveal from '@/components/CelestialReveal';
import StarLoader from '@/components/StarLoader';
import { Text, GoldButton } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { getTraitLines } from '@/data/traitLines';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Reveal() {
  const insets = useSafeAreaInsets();
  const chart = useChart();
  const nav = useNavigation();
  useEffect(() => { nav.setOptions?.({ gestureEnabled: false }); }, [nav]);

  // Chart not ready yet → the revolving-stars loading state.
  if (!chart) {
    return (
      <View style={{ flex: 1 }}>
        <CosmicBackground intense />
        <StarLoader message="Casting your chart…" />
      </View>
    );
  }

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
        {/* Top third: celestial visual */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.top}>
          <CelestialReveal size={180} />
        </Animated.View>

        {/* Placements + traits */}
        <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.middle}>
          {/* Labeled placements — three columns */}
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

          {/* Birth star (nakshatra) — the most personal Vedic placement, highlighted */}
          <View style={styles.birthStar}>
            <Text variant="eyebrow" color={colors.gold} style={styles.placeLabel}>Birth Star (Nakshatra)</Text>
            <Text style={styles.birthStarValue}>
              <Text style={{ color: colors.gold }}>✦</Text> {chart.nakshatra}
            </Text>
          </View>

          <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 12, letterSpacing: 0.4 }}>
            Vedic (sidereal) placements
          </Text>

          <View style={styles.traits}>
            {traits.map((t, i) => (
              <Text key={i} variant="serif" style={styles.trait}>{t}</Text>
            ))}
          </View>
        </Animated.View>

        {/* Footer caption + CTA */}
        <View>
          <View style={{ marginBottom: 18 }}>
            <Text variant="eyebrow" color={colors.gold} style={styles.footerLine1}>
              Ancient Vedic wisdom. Precise celestial calculations.
            </Text>
            <Text variant="eyebrow" color={colors.mutedDim} style={styles.footerLine2}>
              Guidance written from your stars alone.
            </Text>
          </View>
          <GoldButton label="Continue" onPress={() => router.replace('/(onboarding)/notifications' as any)} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  top: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  middle: { alignItems: 'center' },

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
