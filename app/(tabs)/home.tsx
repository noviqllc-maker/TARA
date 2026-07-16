// app/(tabs)/home.tsx
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton, Chip } from '@/components/ui';
import EnergyDashboard from '@/components/EnergyDashboard';
import Disclaimer from '@/components/Disclaimer';
import { PremiumNudgeBar } from '@/components/PremiumNudge';
import { useSubscription } from '@/hooks/useSubscription';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useTransits } from '@/hooks/useTransits';
import { useDailyEnergy } from '@/hooks/useDailyEnergy';
import { useHealth } from '@/hooks/useHealth';
import {
  greeting, todayLong, tarasMessage, cosmicWeather, insights,
} from '@/data/mock';
import { colors, spacing } from '@/theme';

const QUICK = [
  { label: 'Ask Tara', route: '/(tabs)/tara' },
  { label: 'Birth Chart', route: '/(tabs)/chart' },
  { label: 'Compatibility', route: '/insights/love' },
  { label: "Today's Remedies", route: '/(tabs)/insights' },
  { label: 'Shop', route: '/(tabs)/profile', params: { scrollTo: 'shop' } },
  { label: 'Life Timeline', route: '/chart/timeline' },
];

// Life-area detail screens (moved here from the Insights tab).
const LIFE_AREAS = [
  { label: 'Love & Relationships', route: '/insights/love' },
  { label: 'Career & Money', route: '/insights/career' },
  { label: 'Health & Wellness', route: '/insights/wellness' },
  { label: 'Life Purpose', route: '/insights/purpose' },
];

export default function Home() {
  const { profile } = useProfile();
  const chart = useChart();
  const transits = useTransits();
  // Real daily energy (chart + Moon transit + moon phase + Apple Health), shared
  // across Home, Love & Career via the hook so the numbers stay consistent.
  const energy = useDailyEnergy();
  const { metrics, connected, needsPermissionCheck, connectAppleHealth, available, loading } = useHealth();
  // Body ring is a chart-only estimate until real Health data flows in (✦ marker).
  const bodyChartOnly = metrics.source !== 'apple-health';

  // Premium nudge shows for free users only (the bar self-hides when premium).
  const { isPremium } = useSubscription();
  useEffect(() => { if (__DEV__) console.log('[Premium] Home mount · isPremium =', isPremium); }, [isPremium]);
  // iOS won't re-show the permission sheet once the user has decided, so when Health
  // is connected but sending no data we send them to the Health app to enable it.
  const openHealthApp = () =>
    Alert.alert(
      'Enable Health data',
      'Apple Health is connected, but Tara isn’t receiving data yet. Open Health → Sharing → Apps → Tara and turn on the categories.',
      [
        { text: 'Open Health', onPress: () => Linking.openURL('x-apple-health://').catch(() => {}) },
        { text: 'Later', style: 'cancel' },
      ],
    );

  const onConnectHealth = async () => {
    console.log('[Home] Connect Apple Health tapped'); // task 3: confirms the tap registers
    if (!available) {
      Alert.alert(
        'Dev build required',
        'Apple Health works in a development or production build (not Expo Go), on iPhone.',
      );
      return;
    }
    const res = await connectAppleHealth(); // shows the sheet; on grant, metrics → Body real data
    if (res === 'no-data') openHealthApp();
  };
  // Now fully live: nakshatra + dasha from the user's chart, and today's real sky.
  const weather: [string, string][] = [
    ['Nakshatra', chart?.nakshatra ?? cosmicWeather.nakshatra],
    ['Dasha', chart?.currentDasha ?? cosmicWeather.dasha],
    ['Transit', transits.transitText],
    ['Panchanga', transits.panchanga],
    ['Moon Phase', transits.moonPhase],
  ];

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Eyebrow>{todayLong()}</Eyebrow>
        <Text variant="h1" style={{ marginTop: 8, marginBottom: spacing.lg }}>
          {greeting()},{'\n'}{profile.name || 'friend'} <Text style={{ color: colors.gold }}>✦</Text>
        </Text>
      </Animated.View>

      {/* Energy dashboard */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Today's Energy</Eyebrow>
        <View style={{ marginTop: 12 }}>
          <EnergyDashboard domains={energy.domains} vedicDomains={bodyChartOnly ? ['Body'] : []} />
        </View>
        {/* Not connected → offer connect. Connected but no data → guide to Health app. */}
        {!connected ? (
          <Pressable
            onPress={onConnectHealth} disabled={loading}
            hitSlop={10} style={({ pressed }) => [styles.connectRow, pressed && { opacity: 0.55 }]}
          >
            {loading ? (
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5 }}>Connecting…</Text>
            ) : (
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, textAlign: 'center' }}>
                Body reads your chart only.{'  '}
                <Text variant="tiny" color={colors.gold}>Connect Apple Health →</Text>
              </Text>
            )}
          </Pressable>
        ) : needsPermissionCheck ? (
          <Pressable
            onPress={openHealthApp} hitSlop={10}
            style={({ pressed }) => [styles.connectRow, pressed && { opacity: 0.55 }]}
          >
            <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, textAlign: 'center' }}>
              Apple Health connected, no data yet.{'  '}
              <Text variant="tiny" color={colors.gold}>Enable in Health →</Text>
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {/* Tara's message */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Tara's Message</Eyebrow>
        <Text variant="serif" style={{ fontSize: 18, marginTop: 10, lineHeight: 25 }}>{tarasMessage.headline}</Text>
        <Text variant="tiny" style={{ marginTop: 8 }}>{tarasMessage.body}</Text>
        <GoldButton label="Ask Tara about today" onPress={() => router.push('/(tabs)/tara')} style={{ marginTop: 16 }} />
      </Card>

      {/* Premium nudge — free users only, directly below Tara's Message */}
      <PremiumNudgeBar context="home" style={{ marginBottom: spacing.lg }} />

      {/* Journal Prompt (moved from Insights) */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Journal Prompt</Eyebrow>
        <Text variant="serif" style={styles.journalPrompt}>“{insights.journalPrompt}”</Text>
        <Pressable onPress={() => router.push('/insights/journal')} hitSlop={6} style={{ marginTop: 14 }}>
          <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 13 }}>Open Mood Journal →</Text>
        </Pressable>
      </Card>

      {/* Explore Life Areas (moved from Insights) */}
      <Eyebrow color={colors.muted}>Explore Life Areas</Eyebrow>
      <View style={styles.lifeGrid}>
        {LIFE_AREAS.map((s) => (
          <Pressable key={s.label} style={styles.areaCard} onPress={() => router.push(s.route as any)}>
            <Text variant="body" style={{ fontSize: 13.5 }}>{s.label}</Text>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Quick actions */}
      <Eyebrow>Quick Actions</Eyebrow>
      <View style={styles.quickGrid}>
        {QUICK.map((q) => (
          <Pressable
            key={q.label}
            style={styles.quick}
            onPress={() => router.push(('params' in q ? { pathname: q.route, params: q.params } : q.route) as any)}
          >
            <Text variant="body" style={{ fontSize: 13.5 }}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Cosmic weather */}
      <Card style={{ marginTop: spacing.lg }}>
        <Eyebrow>Current Cosmic Weather</Eyebrow>
        <View style={{ marginTop: 10, gap: 9 }}>
          {weather.map(([k, v]) => (
            <View key={k} style={styles.cwRow}>
              <Text variant="tiny" color={colors.muted}>{k}</Text>
              <Text variant="body" color={colors.goldSoft} style={{ fontSize: 13 }}>{v}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  connectRow: {
    marginTop: 12, paddingTop: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  journalPrompt: { fontSize: 16, marginTop: 10, lineHeight: 25, fontStyle: 'italic', color: colors.cream },
  lifeGrid: { gap: 10, marginTop: 12, marginBottom: spacing.lg },
  areaCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  quick: {
    width: '47.5%', paddingVertical: 16, paddingHorizontal: 14,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
  cwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
