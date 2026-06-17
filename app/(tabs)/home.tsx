// app/(tabs)/home.tsx
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton, Chip } from '@/components/ui';
import EnergyDashboard from '@/components/EnergyDashboard';
import Disclaimer from '@/components/Disclaimer';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useTransits } from '@/hooks/useTransits';
import {
  greeting, todayLong, tarasMessage, snapshot, cosmicWeather,
} from '@/data/mock';
import { colors, fonts, spacing } from '@/theme';

const QUICK = [
  { label: 'Ask Tara', route: '/(tabs)/tara' },
  { label: 'Birth Chart', route: '/(tabs)/chart' },
  { label: 'Compatibility', route: '/insights/love' },
  { label: "Today's Remedies", route: '/(tabs)/insights' },
  { label: 'Daily Ritual', route: '/(tabs)/insights' },
  { label: 'Life Timeline', route: '/chart/timeline' },
];

export default function Home() {
  const { profile } = useProfile();
  const chart = useChart();
  const transits = useTransits();
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
          <EnergyDashboard />
        </View>
      </Card>

      {/* Snapshot */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Today's Snapshot</Eyebrow>
        <View style={styles.snapRow}>
          {snapshot.map((s) => (
            <View key={s.label} style={styles.snapItem}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.goldSoft }}>{s.value}%</Text>
              <Text variant="tiny" style={{ fontSize: 10 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Tara's message */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Tara's Message</Eyebrow>
        <Text variant="serif" style={{ fontSize: 18, marginTop: 10, lineHeight: 25 }}>{tarasMessage.headline}</Text>
        <Text variant="tiny" style={{ marginTop: 8 }}>{tarasMessage.body}</Text>
        <GoldButton label="Ask Tara about today" onPress={() => router.push('/(tabs)/tara')} style={{ marginTop: 16 }} />
      </Card>

      {/* Quick actions */}
      <Eyebrow>Quick Actions</Eyebrow>
      <View style={styles.quickGrid}>
        {QUICK.map((q) => (
          <Pressable key={q.label} style={styles.quick} onPress={() => router.push(q.route as any)}>
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
  snapRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  snapItem: { alignItems: 'center', gap: 3 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  quick: {
    width: '47.5%', paddingVertical: 16, paddingHorizontal: 14,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
  cwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
