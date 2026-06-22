// app/(tabs)/chart.tsx
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText, Circle } from 'react-native-svg';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { PlanetPosition } from '@/lib/vedic';
import { colors, fonts, spacing } from '@/theme';

export default function Chart() {
  const { profile } = useProfile();
  const chart = useChart();
  const [selected, setSelected] = useState<PlanetPosition | null>(null);

  if (!chart) {
    return (
      <Screen>
        <View style={{ marginTop: 40 }}>
          <Eyebrow>Your Vedic Birth Chart</Eyebrow>
          <Text variant="h2" style={{ marginTop: 8 }}>Chart not available</Text>
          <Text variant="tiny" style={{ marginTop: 10 }}>
            We need your birth date and time to calculate your chart. Please complete onboarding.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Eyebrow>Your Vedic Birth Chart</Eyebrow>
        <Text variant="h2" style={{ marginTop: 6, marginBottom: spacing.lg }}>{profile.name}'s Kundali</Text>
      </Animated.View>

      {/* North-Indian diamond chart with ascendant marker */}
      <Card solid style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Svg width={280} height={280} viewBox="0 0 200 200">
          <Rect x="10" y="10" width="180" height="180" fill="none" stroke={colors.gold} strokeWidth="1" opacity={0.5} />
          <Line x1="10" y1="10" x2="190" y2="190" stroke={colors.gold} strokeWidth="0.7" opacity={0.35} />
          <Line x1="190" y1="10" x2="10" y2="190" stroke={colors.gold} strokeWidth="0.7" opacity={0.35} />
          <Line x1="100" y1="10" x2="10" y2="100" stroke={colors.gold} strokeWidth="0.7" opacity={0.35} />
          <Line x1="100" y1="10" x2="190" y2="100" stroke={colors.gold} strokeWidth="0.7" opacity={0.35} />
          <Line x1="10" y1="100" x2="100" y2="190" stroke={colors.gold} strokeWidth="0.7" opacity={0.35} />
          <Line x1="190" y1="100" x2="100" y2="190" stroke={colors.gold} strokeWidth="0.7" opacity={0.35} />
          <SvgText x="100" y="30" fill={colors.goldSoft} fontSize="8" fontWeight="600" textAnchor="middle" fontFamily={fonts.serif}>{chart.ascendant.sign}</SvgText>
          <Circle cx="100" cy="44" r="3" fill={colors.terra} />
        </Svg>
        <Text variant="tiny" color={colors.muted}>Ascendant (Lagna): {chart.ascendant.sign} {chart.ascendant.degree}</Text>
      </Card>

      {/* Key signs — now REAL */}
      <View style={styles.grid}>
        {[
          ['Sun Sign', chart.sunSign],
          ['Moon Sign', chart.moonSign],
          ['Rising', chart.ascendant.sign],
          ['Nakshatra', `${chart.nakshatra} (${chart.nakshatraPada})`],
        ].map(([k, v]) => (
          <Card key={k} style={styles.gridCard}>
            <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 9.5 }}>{k}</Text>
            <Text variant="serif" style={{ fontSize: 15, marginTop: 5 }}>{v}</Text>
          </Card>
        ))}
      </View>

      {/* Current dasha banner */}
      {chart.currentDasha ? (
        <Card solid glow style={{ marginTop: spacing.lg }}>
          <Eyebrow color={colors.gold}>Current Period</Eyebrow>
          <Text variant="serif" style={{ fontSize: 18, marginTop: 6 }}>{chart.currentDasha}</Text>
          {chart.currentAntardasha ? (
            <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 4 }}>{chart.currentAntardasha}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* Planetary positions — REAL */}
      <Card style={{ marginTop: spacing.lg }}>
        <Eyebrow>Planetary Positions</Eyebrow>
        <Text variant="tiny" style={{ marginTop: 4, marginBottom: 8 }}>Tap a planet for its meaning.</Text>
        {chart.planets.map((pl) => (
          <Pressable key={pl.name} style={styles.planetRow} onPress={() => setSelected(pl)}>
            <Text variant="serif" style={{ fontSize: 15 }}>{pl.glyph}  {pl.name}{pl.retrograde ? ' ℞' : ''}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="tiny" color={colors.goldSoft}>{pl.sign} · {pl.degree} · H{pl.house}</Text>
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 10.5, marginTop: 2 }}>Navāṁśa (D9): {pl.navamsaSign}</Text>
            </View>
          </Pressable>
        ))}
      </Card>

      {selected && (
        <Animated.View entering={FadeIn.duration(350)}>
          <Card solid glow style={{ marginTop: spacing.lg }}>
            <Eyebrow color={colors.lav}>{selected.glyph} {selected.name} in {selected.sign}</Eyebrow>
            <Text variant="serif" style={{ fontSize: 15.5, marginTop: 10, lineHeight: 23 }}>{selected.explanation}</Text>
            <Pressable onPress={() => setSelected(null)} style={{ marginTop: 12 }}>
              <Text variant="tiny" color={colors.gold}>Close</Text>
            </Pressable>
          </Card>
        </Animated.View>
      )}

      {/* Aspects — derived from real chart */}
      <Card style={{ marginTop: spacing.lg }}>
        <Eyebrow>Chart Highlights</Eyebrow>
        <View style={{ marginTop: 10, gap: 8 }}>
          {chart.aspects.map((a) => (
            <Text key={a} variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>• {a}</Text>
          ))}
        </View>
      </Card>

      {/* Graha Drishti — planetary aspects */}
      {chart.drishti.length > 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <Eyebrow>Graha Drishti</Eyebrow>
          <View style={{ marginTop: 10, gap: 7 }}>
            {chart.drishti.map((a, i) => (
              <Text key={`${a.from}-${a.house}-${i}`} variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>
                • {a.from} aspects {a.targets.join(', ')} (house {a.house})
              </Text>
            ))}
          </View>
        </Card>
      )}

      <View style={{ marginTop: spacing.lg, gap: 10 }}>
        <GhostButton label="Vedic Calculator →" onPress={() => router.push('/calculator')} />
        <GhostButton label="View Dasha Timeline →" onPress={() => router.push('/chart/timeline')} />
        <GhostButton label="Compatibility →" onPress={() => router.push('/insights/love')} />
      </View>

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '47.5%' },
  planetRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)',
  },
});
