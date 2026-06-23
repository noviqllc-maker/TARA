// app/(tabs)/home.tsx
import React from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton, Chip } from '@/components/ui';
import EnergyDashboard from '@/components/EnergyDashboard';
import Disclaimer from '@/components/Disclaimer';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useTransits } from '@/hooks/useTransits';
import { useDailyEnergy } from '@/hooks/useDailyEnergy';
import { useHealth } from '@/hooks/useHealth';
import {
  greeting, todayLong, tarasMessage, cosmicWeather,
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

export default function Home() {
  const { profile } = useProfile();
  const chart = useChart();
  const transits = useTransits();
  // Real daily energy (chart + Moon transit + moon phase + Apple Health), shared
  // across Home, Love & Career via the hook so the numbers stay consistent.
  const energy = useDailyEnergy();
  const { metrics, connectAppleHealth, available, loading } = useHealth();
  const needsHealth = metrics.source === 'mock';
  const onConnectHealth = async () => {
    if (!available) {
      Alert.alert(
        'Dev build required',
        'Apple Health works in a development or production build (not Expo Go), on iPhone.',
      );
      return;
    }
    await connectAppleHealth(); // on success this refreshes metrics → Body switches to real data
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
          <EnergyDashboard domains={energy.domains} vedicDomains={needsHealth ? ['Body'] : []} />
        </View>
        {needsHealth && (
          <Pressable onPress={onConnectHealth} disabled={loading} style={styles.connectRow}>
            {loading ? (
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5 }}>Connecting…</Text>
            ) : (
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, textAlign: 'center' }}>
                Body reads your chart only.{'  '}
                <Text variant="tiny" color={colors.gold}>Connect Apple Health →</Text>
              </Text>
            )}
          </Pressable>
        )}
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
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  quick: {
    width: '47.5%', paddingVertical: 16, paddingHorizontal: 14,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
  cwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
