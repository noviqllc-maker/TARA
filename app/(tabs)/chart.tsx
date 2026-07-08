// app/(tabs)/chart.tsx
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { PremiumHint, PremiumSheet } from '@/components/PremiumNudge';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { PlanetPosition, BirthChart } from '@/lib/vedic';
import { colors, fonts, spacing } from '@/theme';

export default function Chart() {
  const { profile } = useProfile();
  const chart = useChart();
  const { isPremium } = useSubscription();
  const [selected, setSelected] = useState<PlanetPosition | null>(null);
  const [premiumSheet, setPremiumSheet] = useState(false);

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
        <NorthIndianChart chart={chart} />
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

      {/* Full chart stays free above; this only invites a deeper reading. */}
      {!isPremium && (
        <PremiumHint
          style={{ marginTop: spacing.lg }}
          message="Unlock your full birth blueprint — a deep natal reading with personalized remedies, dasha guidance and timing."
          onPress={() => setPremiumSheet(true)}
        />
      )}

      <PremiumSheet
        visible={premiumSheet}
        onClose={() => setPremiumSheet(false)}
        title="Your full birth blueprint"
        message="Go beyond the chart with a deep natal reading — planet-by-planet guidance, remedies, and the timing of your dashas."
        benefits={['Deep natal reading & remedies', 'Dasha timeline guidance', 'Personalized planetary insights']}
      />

      <Disclaimer />
    </Screen>
  );
}

/* ---------------- North-Indian Kundali ---------------- */

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

// Label anchors for the 12 houses, counter-clockwise from the top-center house —
// the fixed North-Indian layout. House 1 (top center) always holds the ascendant.
const HOUSE_ANCHORS = [
  { x: 100, y: 48 }, { x: 55, y: 26 }, { x: 26, y: 56 }, { x: 46, y: 100 },
  { x: 26, y: 144 }, { x: 55, y: 174 }, { x: 100, y: 150 }, { x: 145, y: 174 },
  { x: 174, y: 144 }, { x: 154, y: 100 }, { x: 174, y: 56 }, { x: 145, y: 26 },
];

function NorthIndianChart({ chart }: { chart: BirthChart }) {
  const ascIndex = chart.ascendant.signIndex;

  // planets grouped by the house they occupy (1–12)
  const byHouse: Record<number, string[]> = {};
  chart.planets.forEach((p) => {
    if (!byHouse[p.house]) byHouse[p.house] = [];
    byHouse[p.house].push(PLANET_ABBR[p.name] || p.name.slice(0, 2));
  });

  const grid = { stroke: colors.gold, strokeWidth: 0.7, opacity: 0.4 } as const;

  return (
    <Svg width={280} height={280} viewBox="0 0 200 200">
      {/* outer square + diagonals + inner diamond */}
      <Rect x="10" y="10" width="180" height="180" fill="none" stroke={colors.gold} strokeWidth="1" opacity={0.5} />
      <Line x1="10" y1="10" x2="190" y2="190" {...grid} />
      <Line x1="190" y1="10" x2="10" y2="190" {...grid} />
      <Line x1="100" y1="10" x2="10" y2="100" {...grid} />
      <Line x1="100" y1="10" x2="190" y2="100" {...grid} />
      <Line x1="10" y1="100" x2="100" y2="190" {...grid} />
      <Line x1="190" y1="100" x2="100" y2="190" {...grid} />

      {HOUSE_ANCHORS.map((a, i) => {
        const house = i + 1;
        const signNum = ((ascIndex + i) % 12) + 1;       // house 1 = ascendant sign
        const planets = byHouse[house] || [];
        const isLagna = house === 1;
        // wrap planet abbreviations into rows of two so dense houses stay legible
        const rows: string[] = [];
        for (let j = 0; j < planets.length; j += 2) rows.push(planets.slice(j, j + 2).join(' '));
        return (
          <React.Fragment key={house}>
            <SvgText
              x={a.x} y={a.y - (planets.length ? 7 : 0)}
              fill={isLagna ? colors.gold : colors.muted}
              fontSize="7" textAnchor="middle" fontFamily={fonts.sansSemi} fontWeight="600"
            >
              {signNum}
            </SvgText>
            {rows.map((r, ri) => (
              <SvgText
                key={ri} x={a.x} y={a.y + 2 + ri * 8}
                fill={isLagna ? colors.terra : colors.cream}
                fontSize="8" textAnchor="middle" fontFamily={fonts.sansSemi} fontWeight="600"
              >
                {r}
              </SvgText>
            ))}
          </React.Fragment>
        );
      })}
    </Svg>
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
