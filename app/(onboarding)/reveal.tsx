// app/(onboarding)/reveal.tsx — Screen 1: placements reveal (the payoff moment).
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import CelestialReveal from '@/components/CelestialReveal';
import StarLoader from '@/components/StarLoader';
import { Text, GoldButton } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { getTraitLines } from '@/data/traitLines';
import { colors, fonts, spacing } from '@/theme';

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

  const placements = `☉ ${chart.sunSign.toUpperCase()}    ☽ ${chart.moonSign.toUpperCase()}    ↑ ${chart.ascendant.sign.toUpperCase()}`;
  const traits = getTraitLines(chart);

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
        {/* Top third: celestial visual */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.top}>
          <CelestialReveal size={200} />
        </Animated.View>

        {/* Placements + traits */}
        <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.middle}>
          <Text style={styles.placements}>{placements}</Text>
          <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 8, letterSpacing: 0.4 }}>
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
          <Text variant="eyebrow" color={colors.mutedDim} style={styles.footer}>
            We use precise astronomical calculations for guidance unique to your chart.
          </Text>
          <GoldButton label="Continue" onPress={() => router.replace('/(onboarding)/notifications' as any)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  top: { alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  middle: { alignItems: 'center' },
  placements: {
    fontFamily: fonts.sansMed, fontSize: 14, letterSpacing: 2, color: colors.cream, textAlign: 'center',
  },
  traits: { marginTop: 26, alignItems: 'center', gap: 7 },
  trait: { fontSize: 22, lineHeight: 28, textAlign: 'center', color: colors.cream },
  footer: { textAlign: 'center', fontSize: 9.5, lineHeight: 15, marginBottom: 16, paddingHorizontal: 6 },
});
