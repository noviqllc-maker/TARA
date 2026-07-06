// app/(tabs)/home.tsx — Today dashboard, temple-material design system (v2).
import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert, Text as RNText } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import StoneBackground from '@/components/StoneBackground';
import ArchCard from '@/components/ArchCard';
import FlatCard from '@/components/FlatCard';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useTransits } from '@/hooks/useTransits';
import { useDailyEnergy } from '@/hooks/useDailyEnergy';
import { useHealth } from '@/hooks/useHealth';
import { greeting, todayLong, tarasMessage, cosmicWeather } from '@/data/mock';
import { ds, type as t, space, radii } from '@/theme';

// Local Text that defaults to the v2 body face + sandal-on-stone color.
function Text({ style, ...rest }: React.ComponentProps<typeof RNText>) {
  return <RNText style={[{ color: ds.onStone, fontFamily: t.body }, style]} {...rest} />;
}

const QUICK = [
  { label: 'Ask Tara', desc: 'Your 24/7 Vedic guide', route: '/(tabs)/tara' },
  { label: 'Birth Chart', desc: 'Your natal blueprint', route: '/(tabs)/chart' },
  { label: 'Compatibility', desc: 'Guṇa Milan match', route: '/insights/love' },
  { label: "Today's Remedies", desc: 'Rituals for the day', route: '/(tabs)/insights' },
  { label: 'Shop', desc: 'Reports & remedies', route: '/(tabs)/profile', params: { scrollTo: 'shop' } },
  { label: 'Life Timeline', desc: 'Dashas & turning points', route: '/chart/timeline' },
];

// Qualitative band for the overall energy score.
function energyWord(n: number): string {
  if (n >= 78) return 'Radiant';
  if (n >= 66) return 'Rising';
  if (n >= 54) return 'Balanced';
  if (n >= 42) return 'Tender';
  return 'Restful';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const chart = useChart();
  const transits = useTransits();
  const energy = useDailyEnergy();
  const { metrics, connectAppleHealth, available, loading } = useHealth();
  const needsHealth = metrics.source === 'mock';

  const overall = Math.round(
    energy.domains.reduce((a, d) => a + d.score, 0) / Math.max(1, energy.domains.length),
  );

  const onConnectHealth = async () => {
    if (!available) {
      Alert.alert('Dev build required', 'Apple Health works in a development or production build (not Expo Go), on iPhone.');
      return;
    }
    await connectAppleHealth();
  };

  const weather: [string, string][] = [
    ['Nakshatra', chart?.nakshatra ?? cosmicWeather.nakshatra],
    ['Dasha', chart?.currentDasha ?? cosmicWeather.dasha],
    ['Transit', transits.transitText],
    ['Panchanga', transits.panchanga],
    ['Moon Phase', transits.moonPhase],
  ];

  return (
    <View style={{ flex: 1 }}>
      <StoneBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space.xl, paddingBottom: 120 }}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.eyebrow}>{todayLong()}</Text>
          <Text style={styles.greeting}>
            {greeting()},{'\n'}{profile.name || 'friend'} <Text style={{ color: ds.marigold }}>✦</Text>
          </Text>
        </Animated.View>

        {/* Flagship — Today's Energy */}
        <ArchCard
          eyebrow="Today's Energy"
          title={energyWord(overall)}
          value={`${overall}`}
          sub={tarasMessage.headline}
          style={{ marginBottom: space.lg }}
        />
        {needsHealth && (
          <Pressable onPress={onConnectHealth} disabled={loading} style={styles.connectRow}>
            <Text style={styles.connectText}>
              {loading ? 'Connecting…' : 'Body reads your chart only.  '}
              {!loading && <Text style={{ color: ds.marigold, fontFamily: t.bodyBold }}>Connect Apple Health →</Text>}
            </Text>
          </Pressable>
        )}

        {/* Domain breakdown */}
        <Text style={styles.section}>The Five Energies</Text>
        <View style={{ gap: space.sm, marginBottom: space.xl }}>
          {energy.domains.map((d) => (
            <FlatCard
              key={d.key}
              label={d.key}
              right={<Text style={styles.stat}>{d.score}</Text>}
            />
          ))}
        </View>

        {/* Tara's message */}
        <View style={styles.message}>
          <Text style={styles.msgEyebrow}>Tara's Message</Text>
          <Text style={styles.msgBody}>{tarasMessage.body}</Text>
          <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/tara')}>
            <Text style={styles.ctaText}>Ask Tara about today</Text>
          </Pressable>
        </View>

        {/* Quick actions */}
        <Text style={styles.section}>Quick Actions</Text>
        <View style={{ gap: space.sm, marginBottom: space.xl }}>
          {QUICK.map((q) => (
            <FlatCard
              key={q.label}
              label={q.label}
              description={q.desc}
              onPress={() => router.push(('params' in q ? { pathname: q.route, params: q.params } : q.route) as any)}
            />
          ))}
        </View>

        {/* Cosmic weather — instrument-style data panel */}
        <Text style={styles.section}>Current Cosmic Weather</Text>
        <View style={styles.weatherPanel}>
          {weather.map(([k, v], i) => (
            <View key={k} style={[styles.wRow, i === weather.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.wKey}>{k}</Text>
              <Text style={styles.wVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={{ marginTop: space.lg }}>
          <Text style={{ textAlign: 'center', fontSize: 11.5, color: ds.onStoneMuted, lineHeight: 17 }}>
            Tara offers reflective guidance, not medical, legal, or financial advice.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: t.bodyBold, fontSize: 11, letterSpacing: 2.2,
    textTransform: 'uppercase', color: ds.kumkum, marginBottom: space.sm,
  },
  greeting: {
    fontFamily: t.displaySemi, fontSize: 32, lineHeight: 40,
    color: ds.onStone, marginBottom: space.xl,
  },
  section: {
    fontFamily: t.bodyBold, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase',
    color: ds.marigold, marginBottom: space.md,
  },
  stat: { fontFamily: t.monoMed, fontSize: 18, color: ds.marigold },
  connectRow: { alignItems: 'center', marginBottom: space.xl, marginTop: -space.sm },
  connectText: { fontFamily: t.body, fontSize: 12.5, color: ds.onStoneMuted, textAlign: 'center' },
  message: {
    backgroundColor: ds.stoneSurface, borderColor: ds.hairline, borderWidth: 1,
    borderRadius: radii.card, padding: space.xl, marginBottom: space.xl,
  },
  msgEyebrow: {
    fontFamily: t.bodyBold, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase',
    color: ds.kumkum, marginBottom: space.sm,
  },
  msgBody: { fontFamily: t.display, fontSize: 18, lineHeight: 26, color: ds.onStone },
  cta: {
    alignSelf: 'flex-start', marginTop: space.lg,
    backgroundColor: ds.kumkum, borderRadius: radii.pill,
    paddingVertical: space.md, paddingHorizontal: space.xl,
  },
  ctaText: { fontFamily: t.bodyBold, fontSize: 14, color: ds.sandal },
  weatherPanel: {
    backgroundColor: ds.stoneSurface, borderColor: ds.hairline, borderWidth: 1,
    borderRadius: radii.card, paddingHorizontal: space.lg,
  },
  wRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: ds.hairline,
  },
  wKey: { fontFamily: t.body, fontSize: 13, color: ds.onStoneMuted },
  wVal: { fontFamily: t.monoMed, fontSize: 13, color: ds.sandal, maxWidth: '62%', textAlign: 'right' },
});
