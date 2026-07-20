// app/(onboarding)/credibility.tsx — Screen 2: credibility.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function Credibility() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  useEffect(() => { nav.setOptions?.({ gestureEnabled: false }); }, [nav]);

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center' }}>
          <Text style={styles.emblem}>✦</Text>
          <Text variant="h1" style={styles.headline}>
            Rooted in 5,000 years of Vedic wisdom. Powered by AI.
          </Text>
          <Text variant="body" color={colors.muted} style={styles.body}>
            Rooted in thousands of years of Vedic astrology, Tara combines precise astronomical
            calculations, planetary periods (Dashas), lunar constellations (Nakshatras), divisional
            charts, and AI to deliver guidance uniquely tailored to your birth chart.
          </Text>
        </Animated.View>

        <GoldButton label="Continue" onPress={() => router.replace('/(onboarding)/notifications' as any)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', alignItems: 'center' },
  emblem: { fontSize: 34, lineHeight: 46, color: colors.gold, textAlign: 'center', includeFontPadding: false },
  headline: { textAlign: 'center', marginTop: 22, fontSize: 27, lineHeight: 35 },
  body: { textAlign: 'center', marginTop: 20, lineHeight: 23, fontSize: 14.5, paddingHorizontal: 4 },
});
