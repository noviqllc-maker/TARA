// app/report/blueprint.tsx
// "Soul Blueprint" — a permanent, keepsake natal reading for owners of the Soul Blueprint
// shop report. Ownership-gated via `owns` (NOT isPremium). Deterministic (computeBlueprint).
import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GoldButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { computeBlueprint } from '@/lib/blueprint';
import { colors, fonts, radius, spacing } from '@/theme';

const DIGNITY_LABEL: Record<string, { label: string; color: string } | undefined> = {
  exalted: { label: 'EXALTED', color: colors.sage },
  own: { label: 'OWN SIGN', color: colors.goldSoft },
  debilitated: { label: 'GROWTH', color: colors.terra },
};

export default function Blueprint() {
  const chart = useChart();
  const { profile } = useProfile();
  const { owns } = useSubscription();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = __DEV__ && preview === '1';
  const owned = isPreview || owns('birthblueprinttara1');

  const bp = useMemo(() => (chart ? computeBlueprint(chart) : null), [chart]);
  const [openHouse, setOpenHouse] = useState<number | null>(null);

  if (!chart || !bp) return <Msg title="Add your birth details" body="Your Soul Blueprint is built from your birth chart. Add your date, time, and place of birth first." cta="Go back" onCta={() => router.back()} />;
  if (!owned) return <Msg title="Locked" body="Unlock the Soul Blueprint from the Shop to read your complete natal reading." cta="Go to Shop" onCta={() => router.replace('/(tabs)/profile')} />;

  return (
    <Screen>
      <SubHeader eyebrow={isPreview ? 'Preview · dev' : 'Soul Blueprint'} title={`${profile.name || 'Your'} · Soul Blueprint`} />

      {/* 1. HERO */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Text variant="eyebrow" color={colors.gold}>Your Core Signature</Text>
        <View style={styles.sigGrid}>
          {[
            ['Lagna', `${bp.hero.lagna} · ${bp.hero.lagnaLord}`],
            ['Sun', bp.hero.sun], ['Moon', bp.hero.moon],
            ['Nakshatra', `${bp.hero.nakshatra} (${bp.hero.pada})`],
          ].map(([k, v]) => (
            <View key={k} style={{ width: '50%', marginTop: 10 }}>
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 10.5 }}>{k}</Text>
              <Text variant="serif" style={{ fontSize: 15, marginTop: 2 }}>{v}</Text>
            </View>
          ))}
        </View>
        <Text variant="body" color={colors.cream} style={{ fontSize: 14.5, lineHeight: 23, marginTop: 14 }}>{bp.hero.essence}</Text>
      </Card>

      {/* 2. NINE GRAHAS */}
      <SectionLabel>Your Nine Grahas</SectionLabel>
      {bp.grahas.map((g, i) => {
        const dg = DIGNITY_LABEL[g.dignity];
        return (
          <Animated.View key={g.name} entering={FadeInDown.delay(Math.min(i, 8) * 30).duration(360)}>
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text variant="serif" style={{ fontSize: 16 }}>{g.glyph}  {g.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 8 }}>
                  {dg ? <Flag text={dg.label} color={dg.color} /> : null}
                  {g.retrograde && !['Sun', 'Moon'].includes(g.name) ? <Flag text="℞ RETRO" color={colors.lav} /> : null}
                  {g.combust ? <Flag text="COMBUST" color={colors.saffron} /> : null}
                </View>
              </View>
              <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 4, fontSize: 12 }}>{g.sign} · {g.degree} · House {g.house}</Text>
              <Text variant="body" color={colors.cream} style={{ fontSize: 14, lineHeight: 22, marginTop: 8 }}>{g.reading}</Text>
            </Card>
          </Animated.View>
        );
      })}

      {/* 3. HOUSES */}
      <SectionLabel>Your Twelve Houses</SectionLabel>
      <View style={styles.houseGrid}>
        {bp.houses.map((h) => {
          const open = openHouse === h.house;
          return (
            <Pressable key={h.house} onPress={() => setOpenHouse(open ? null : h.house)} style={[styles.houseCell, open && styles.houseCellOpen]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="serif" style={{ fontSize: 14 }}>House {h.house}</Text>
                <Text variant="tiny" color={colors.muted} style={{ fontSize: 10 }}>{h.sign} · {h.lord}</Text>
              </View>
              <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 11, marginTop: 3 }}>{h.occupants.length ? h.occupants.join(', ') : '–'}</Text>
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 10.5, marginTop: 3, lineHeight: 14 }}>{h.theme}</Text>
              {open ? <Text variant="tiny" color={colors.cream} style={{ fontSize: 12, lineHeight: 18, marginTop: 8 }}>{h.reading}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {/* 4. KEY PATTERNS (omitted gracefully when none) */}
      {bp.patterns.length ? (
        <>
          <SectionLabel>Key Patterns</SectionLabel>
          {bp.patterns.map((p) => (
            <Card key={p.key} style={{ marginBottom: 10 }}>
              <Text variant="body" color={colors.cream} style={{ fontSize: 14, lineHeight: 22 }}>{p.text}</Text>
            </Card>
          ))}
        </>
      ) : null}

      {/* 5. NAVAMSA LENS */}
      <SectionLabel>Navamsa Lens (D9)</SectionLabel>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 12 }}>D9 Ascendant · {bp.navamsa.lagna}</Text>
        <Text variant="body" color={colors.cream} style={{ fontSize: 14, lineHeight: 22, marginTop: 8 }}>{bp.navamsa.reading}</Text>
        <View style={styles.chips}>
          {bp.navamsa.notable.map((n) => (
            <View key={n.name} style={styles.chip}><Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 11 }}>{n.name} → {n.sign}</Text></View>
          ))}
        </View>
      </Card>

      {/* 6. CLOSING takeaway */}
      <View style={styles.takeawayBox}>
        <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 6 }}>Your Blueprint Takeaway</Text>
        <Text style={styles.takeawayLine}>{bp.takeaway}</Text>
      </View>

      <Disclaimer />
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text color={colors.gold} style={{ fontSize: 14, fontWeight: '500', marginBottom: 10, marginTop: 4 }}>{children}</Text>;
}
function Flag({ text, color }: { text: string; color: string }) {
  return <View style={[styles.flag, { borderColor: color }]}><Text variant="tiny" color={color} style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.3 }}>{text}</Text></View>;
}
function Msg({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void }) {
  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <View style={styles.center}>
        <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 10 }}>Soul Blueprint</Text>
        <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>{title}</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>{body}</Text>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}><GoldButton label={cta} onPress={onCta} /></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  sigGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  flag: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 7 },
  houseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.lg },
  houseCell: {
    width: '47.5%', padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  houseCellOpen: { width: '100%', borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.08)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  takeawayBox: {
    marginTop: 4, marginBottom: spacing.lg, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 18,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(205,163,73,0.35)', backgroundColor: 'rgba(205,163,73,0.07)',
  },
  takeawayLine: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 18, lineHeight: 26, color: colors.goldSoft },
});
