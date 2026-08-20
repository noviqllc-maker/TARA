// app/(tabs)/chart.tsx
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { GlossaryTooltip } from '@/components/GlossaryTooltip';
import PlanetDetailModal from '@/components/PlanetDetailModal';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { PlanetPosition, BirthChart } from '@/lib/vedic';
import { getExplanation } from '@/data/glossary';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Chart() {
  const { profile } = useProfile();
  const chart = useChart();
  const [selected, setSelected] = useState<PlanetPosition | null>(null);
  const [chartMode, setChartMode] = useState<'beginner' | 'advanced'>('beginner');

  if (!chart) {
    return (
      <Screen>
        <View style={{ marginTop: 40 }}>
          <Eyebrow>Your Vedic Birth Chart</Eyebrow>
          <Text variant="screenTitle" style={{ marginTop: 8 }}>Chart not available</Text>
          <Text variant="body" style={{ marginTop: 10 }}>
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
        <Text variant="screenTitle" style={{ marginTop: 6, marginBottom: spacing.lg }}>{profile.name}'s Kundali</Text>
      </Animated.View>

      {/* North-Indian diamond chart with ascendant marker */}
      <Card solid style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <NorthIndianChart chart={chart} />
        <View style={styles.inlineRow}>
          <Text variant="caption" color={colors.muted}>Ascendant (Lagna): {chart.ascendant.sign} {chart.ascendant.degree}</Text>
          <GlossaryTooltip term="lagna" />
        </View>
      </Card>

      {/* Key signs — now REAL. Each carries a ⓘ that explains the term in plain English. */}
      <View style={styles.grid}>
        {([
          ['Sun Sign', chart.sunSign, 'sun'],
          ['Moon Sign', chart.moonSign, 'moon'],
          ['Rising', chart.ascendant.sign, 'ascendant'],
          ['Nakshatra', `${chart.nakshatra} (${chart.nakshatraPada})`, 'nakshatra'],
        ] as const).map(([k, v, term]) => (
          <Card key={k} style={styles.gridCard}>
            <View style={styles.inlineRow}>
              <Text variant="caption" color={colors.muted}>{k}</Text>
              <GlossaryTooltip term={term} />
            </View>
            <Text variant="cardTitle" style={{ marginTop: 5 }}>{v}</Text>
          </Card>
        ))}
      </View>

      {/* Current dasha banner */}
      {chart.currentDasha ? (
        <Card solid glow style={{ marginTop: spacing.lg }}>
          <View style={styles.inlineRow}>
            <Text variant="sectionHeader" color={colors.gold}>Current Period</Text>
            <GlossaryTooltip term="mahadasha" />
          </View>
          <Text variant="cardTitle" style={{ marginTop: 6 }}>{chart.currentDasha}</Text>
          {chart.currentAntardasha ? (
            <Text variant="caption" color={colors.goldSoft} style={{ marginTop: 4 }}>{chart.currentAntardasha}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* Planetary positions — Beginner (plain meaning) / Advanced (degree, house, Navāṁśa) */}
      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.inlineRow}>
          <Text variant="sectionHeader">Planetary Positions</Text>
          <View style={styles.modeToggle}>
            {(['beginner', 'advanced'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => { setChartMode(m); if (m === 'beginner') setSelected(null); }}
                accessibilityRole="button"
                accessibilityState={{ selected: chartMode === m }}
                style={[styles.modeBtn, chartMode === m && styles.modeBtnOn]}
              >
                <Text
                  variant="caption"
                  color={chartMode === m ? colors.bg : colors.muted}
                >
                  {m === 'beginner' ? 'Beginner' : 'Advanced'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {chartMode === 'beginner' ? (
          <>
            <Text variant="secondaryBody" style={{ marginTop: 4, marginBottom: 8 }}>Each planet, in plain language. Tap any for its full reading.</Text>
            {chart.planets.map((pl) => (
              <Pressable key={pl.name} style={styles.planetCol} onPress={() => setSelected(pl)}>
                <View style={[styles.inlineRow, { justifyContent: 'space-between' }]}>
                  <Text variant="sectionHeader">{pl.glyph}  {pl.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="secondaryBody" color={colors.goldSoft}>{pl.sign}</Text>
                    <Text style={{ color: colors.gold, fontSize: 16 }}>›</Text>
                  </View>
                </View>
                <Text variant="secondaryBody" color={colors.muted} style={{ marginTop: 3 }}>
                  {getExplanation(pl.name)}
                </Text>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <View style={[styles.inlineRow, { marginTop: 4, marginBottom: 8 }]}>
              <Text variant="secondaryBody">Full detail: degree, house, Navāṁśa. Tap a planet for its 8 life areas.</Text>
              <GlossaryTooltip term="navamsa" />
            </View>
            {chart.planets.map((pl) => (
              <Pressable key={pl.name} style={styles.planetRow} onPress={() => setSelected(pl)}>
                <Text variant="sectionHeader">{pl.glyph}  {pl.name}{pl.retrograde ? ' ℞' : ''}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="secondaryBody" color={colors.goldSoft}>{pl.sign} · {pl.degree} · H{pl.house}</Text>
                    <Text variant="metadata" color={colors.muted} style={{ marginTop: 2 }}>Navāṁśa (D9): {pl.navamsaSign}</Text>
                  </View>
                  <Text style={{ color: colors.gold, fontSize: 16 }}>›</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
      </Card>

      {/* Tap-a-planet detail sheet: 8 chart-specific life areas for the selected planet. */}
      <PlanetDetailModal planet={selected} chart={chart} onClose={() => setSelected(null)} />

      {/* Aspects — derived from real chart */}
      <Card style={{ marginTop: spacing.lg }}>
        <Text variant="sectionHeader">Chart Highlights</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {chart.aspects.map((a) => (
            <Text key={a} variant="body" color={colors.cream}>• {a}</Text>
          ))}
        </View>
      </Card>

      {/* Graha Drishti — planetary aspects */}
      {chart.drishti.length > 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.inlineRow}>
            <Text variant="sectionHeader">Graha Drishti</Text>
            <GlossaryTooltip term="graha_drishti" />
          </View>
          <View style={{ marginTop: 10, gap: 7 }}>
            {chart.drishti.map((a, i) => (
              <Text key={`${a.from}-${a.house}-${i}`} variant="body" color={colors.cream}>
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

      {/* The full chart is free. No soft-lock here — it guarded no gated content, so it was
          retired in the Insights depth split (an empty soft-lock reads as a false promise). */}
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
  planetCol: {
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)',
  },
  // A label and its ⓘ (or a small trailing control) on one baseline.
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modeToggle: {
    flexDirection: 'row', marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.pill, padding: 2,
  },
  modeBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.pill },
  modeBtnOn: { backgroundColor: colors.gold },
});
