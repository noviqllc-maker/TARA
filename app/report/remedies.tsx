// app/report/remedies.tsx
// "Personal Remedies" — natal-derived guidance with a LIVING layer (running dasha + Sade
// Sati) that recomputes on open. Ownership-gated via `owns` (NOT isPremium). No AI.
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GoldButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { computeRemedies } from '@/lib/remedies';
import { GrahaRemedy } from '@/data/remedies';
import { colors, radius, spacing } from '@/theme';

export default function Remedies() {
  const chart = useChart();
  const { owns } = useSubscription();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = __DEV__ && preview === '1';
  const owned = isPreview || owns('dosharemediestara1');

  // Recomputed each mount so the "current focus" layer stays with your dasha + Saturn transit.
  const r = useMemo(() => (chart ? computeRemedies(chart) : null), [chart]);

  if (!chart || !r) return <Msg title="Add your birth details" body="Your remedies are drawn from your birth chart. Add your date, time, and place of birth first." cta="Go back" onCta={() => router.back()} />;
  if (!owned) return <Msg title="Locked" body="Unlock Personal Remedies from the Shop to open your natal guidance and living dasha layer." cta="Go to Shop" onCta={() => router.replace('/(tabs)/profile')} />;

  return (
    <Screen>
      <SubHeader eyebrow={isPreview ? 'Preview · dev' : 'Personal Remedies'} title="Your Personal Remedies" />

      {/* 1. CURRENT FOCUS (living) */}
      <SectionLabel>Your Current Focus</SectionLabel>
      <Text variant="tiny" color={colors.muted} style={{ marginBottom: 12, lineHeight: 17 }}>
        For this chapter of your life — remedies for the planetary period you’re living through now. This section updates as your dasha and Saturn’s transit move.
      </Text>
      <Card solid glow style={{ marginBottom: 12 }}>
        <Text variant="eyebrow" color={colors.gold}>Running period · {r.focus.mahaLord}–{r.focus.antarLord}</Text>
        <RemedyBlock title={`${r.focus.mahaLord} Mahādasha`} rem={r.focus.mahaRemedy} />
        {r.focus.antarLord !== r.focus.mahaLord ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
            <RemedyBlock title={`${r.focus.antarLord} Antardasha`} rem={r.focus.antarRemedy} />
          </View>
        ) : null}
      </Card>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="eyebrow" color={colors.gold}>{r.focus.sadeSati.title}</Text>
        <Text variant="body" color={colors.cream} style={{ fontSize: 14, lineHeight: 22, marginTop: 8 }}>{r.focus.sadeSati.body}</Text>
        {r.focus.sadeSati.support ? (
          <Text variant="tiny" color={colors.muted} style={{ fontSize: 12, lineHeight: 18, marginTop: 10 }}>{r.focus.sadeSati.support}</Text>
        ) : null}
      </Card>

      {/* 2. CHART CONDITIONS */}
      <SectionLabel>Chart Conditions</SectionLabel>
      {r.conditions.map((c) => (
        <Card key={c.key} style={{ marginBottom: 10, borderColor: c.present ? 'rgba(205,163,73,0.35)' : colors.line, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="serif" style={{ fontSize: 15 }}>{c.title}</Text>
            <View style={[styles.pill, { borderColor: c.present ? colors.gold : colors.line }]}>
              <Text variant="tiny" color={c.present ? colors.gold : colors.muted} style={{ fontSize: 10, fontWeight: '700' }}>{c.present ? 'PRESENT' : 'CLEAR'}</Text>
            </View>
          </View>
          <Text variant={c.present ? 'body' : 'tiny'} color={c.present ? colors.cream : colors.muted} style={{ fontSize: c.present ? 14 : 12.5, lineHeight: c.present ? 22 : 18, marginTop: 8 }}>{c.text}</Text>
        </Card>
      ))}

      {/* 3. STRENGTHENING SET (natal, permanent) */}
      <SectionLabel>Your Strengthening Set</SectionLabel>
      <Text variant="tiny" color={colors.muted} style={{ marginBottom: 12, lineHeight: 17 }}>
        Natal guidance keyed to the grahas that most shape your chart. Gemstones are shared as tradition — “traditionally associated,” never a prescription.
      </Text>
      <StrengthCard heading={`Support · ${r.strengthen.weakest.name}`} why={r.strengthen.weakest.why} rem={r.strengthen.weakest.remedy} />
      <StrengthCard heading={`Lean on · ${r.strengthen.supportive.name}`} why={r.strengthen.supportive.why} rem={r.strengthen.supportive.remedy} />

      {/* 4. WEEKLY RHYTHM */}
      <SectionLabel>Weekly Rhythm</SectionLabel>
      <Card style={{ marginBottom: spacing.lg }}>
        {r.weekly.map((w, i) => (
          <View key={w.day} style={[styles.weekRow, i === r.weekly.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ width: 92 }}>
              <Text variant="body" style={{ fontSize: 13.5 }}>{w.day}</Text>
              <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 10.5 }}>{w.graha}</Text>
            </View>
            <Text variant="tiny" color={colors.cream} style={{ flex: 1, fontSize: 12.5, lineHeight: 17 }}>{w.micro}</Text>
          </View>
        ))}
      </Card>

      {/* 5. Disclaimer (required — remedies touch wellbeing) */}
      <Disclaimer />
    </Screen>
  );
}

function RemedyBlock({ title, rem }: { title: string; rem: GrahaRemedy }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="serif" style={{ fontSize: 15 }}>{title}</Text>
      <Text style={{ fontFamily: 'Fraunces_400Regular', fontStyle: 'italic', fontSize: 15, color: colors.goldSoft, marginTop: 6 }}>{rem.mantra}</Text>
      <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, marginTop: 2 }}>{rem.mantraMeaning}</Text>
      <View style={styles.kvWrap}>
        <KV k="Day" v={rem.day} /><KV k="Colour" v={rem.color} />
        <KV k="Donation" v={rem.donation} full /><KV k="Seva" v={rem.seva} full />
      </View>
    </View>
  );
}

function StrengthCard({ heading, why, rem }: { heading: string; why: string; rem: GrahaRemedy }) {
  return (
    <Card style={{ marginBottom: 10 }}>
      <Text variant="eyebrow" color={colors.gold}>{heading}</Text>
      <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, fontSize: 12, lineHeight: 17 }}>{why}.</Text>
      <Text style={{ fontFamily: 'Fraunces_400Regular', fontStyle: 'italic', fontSize: 15, color: colors.goldSoft, marginTop: 10 }}>{rem.mantra}</Text>
      <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, marginTop: 2 }}>{rem.mantraMeaning}</Text>
      <View style={styles.kvWrap}>
        <KV k="Colours" v={rem.color} /><KV k="Day" v={rem.day} />
        <KV k="Gemstone" v={`${rem.gemstone} · ${rem.finger}, ${rem.metal} (traditionally associated)`} full />
        <KV k="Donation" v={rem.donation} full />
      </View>
    </Card>
  );
}

function KV({ k, v, full }: { k: string; v: string; full?: boolean }) {
  return (
    <View style={{ width: full ? '100%' : '50%', marginTop: 8, paddingRight: 8 }}>
      <Text variant="tiny" color={colors.muted} style={{ fontSize: 10, letterSpacing: 0.3 }}>{k}</Text>
      <Text variant="tiny" color={colors.cream} style={{ fontSize: 12.5, marginTop: 2, lineHeight: 17 }}>{v}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text color={colors.gold} style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 4 }}>{children}</Text>;
}
function Msg({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void }) {
  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <View style={styles.center}>
        <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 10 }}>Personal Remedies</Text>
        <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>{title}</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>{body}</Text>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}><GoldButton label={cta} onPress={onCta} /></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  kvWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
});
