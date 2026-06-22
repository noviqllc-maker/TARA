// app/insights/wellness.tsx
import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton, Chip } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import Ring from '@/components/Ring';
import Disclaimer from '@/components/Disclaimer';
import { useHealth } from '@/hooks/useHealth';
import { wellness as mockExtra } from '@/data/mock';
import { colors, fonts, spacing } from '@/theme';

export default function Wellness() {
  const { metrics, connected, available, loading, connectAppleHealth, refresh } = useHealth();
  const live = metrics.source === 'apple-health';

  const onConnect = async () => {
    if (!available) {
      Alert.alert(
        'Dev build required',
        'Apple Health works in a development or production build (not Expo Go), on iPhone. See APPLE-HEALTH-SETUP.md.',
      );
      return;
    }
    const ok = await connectAppleHealth();
    if (!ok) Alert.alert('Not connected', 'Permission was denied or no data was available.');
  };

  return (
    <Screen>
      <SubHeader eyebrow="Health & Wellness" title="Your Body Signals" />

      {/* Live / connect banner */}
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow color={live ? colors.sage : colors.gold}>
            {live ? '● Apple Health connected' : 'Connect Apple Health'}
          </Eyebrow>
          <Text variant="tiny" style={{ marginTop: 6 }}>
            {live
              ? `Showing your real data${metrics.sleepHours ? ` · ${metrics.sleepHours}h sleep` : ''}.`
              : 'Blend your real sleep, recovery & HRV with your chart.'}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : live ? (
          <Pressable onPress={refresh}><Text variant="tiny" color={colors.gold}>Refresh</Text></Pressable>
        ) : (
          <Pressable onPress={onConnect} style={styles.connectBtn}>
            <Text variant="body" color="#1a1018" style={{ fontSize: 13, fontWeight: '600' }}>Connect</Text>
          </Pressable>
        )}
      </Card>

      <Card solid style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg }}>
        <Ring value={metrics.sleep} label="Sleep" color={colors.lav} size={104} />
        <Ring value={metrics.recovery} label="Recovery" color={colors.rose} size={104} />
      </Card>

      <View style={styles.metricRow}>
        {[
          ['HRV', `${metrics.hrv}ms`, colors.sage],
          ['Rest HR', `${metrics.rhr}`, colors.terra],
          ['Steps', `${(metrics.steps / 1000).toFixed(1)}k`, colors.goldSoft],
        ].map(([k, v, c]) => (
          <Card key={k as string} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 9 }}>{k}</Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 19, fontWeight: '600', color: c as string, marginTop: 4 }}>{v}</Text>
          </Card>
        ))}
      </View>

      <View style={[styles.metricRow, { marginTop: 12 }]}>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.terra}>Active Energy</Eyebrow>
          <Text variant="serif" style={{ fontSize: 18, marginTop: 6 }}>{metrics.activeEnergy} kcal</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.sage}>Recovery</Eyebrow>
          <Text variant="serif" style={{ fontSize: 18, marginTop: 6 }}>{metrics.recovery}%</Text>
        </Card>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <Eyebrow>Focus Areas</Eyebrow>
        <View style={{ marginTop: 10, gap: 8 }}>
          <Text variant="tiny">Body — <Text color={colors.goldSoft}>{metrics.recovery < 55 ? 'Restoration & hydration' : 'Steady movement'}</Text></Text>
          <Text variant="tiny">Mind — <Text color={colors.goldSoft}>{metrics.sleep < 60 ? 'Single-tasking' : 'Focused output'}</Text></Text>
          <Text variant="tiny">Spiritual — <Text color={colors.goldSoft}>{mockExtra.spiritualAlignment}</Text></Text>
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Eyebrow>Recommended Habits</Eyebrow>
        <View style={styles.chips}>{mockExtra.habits.map((h) => <Chip key={h}>{h}</Chip>)}</View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Eyebrow>Recommended Practices</Eyebrow>
        <View style={styles.chips}>{mockExtra.practices.map((p) => <Chip key={p}>{p}</Chip>)}</View>
      </Card>

      <View style={{ height: 16 }} />
      <GhostButton label="Open Mood Journal →" onPress={() => router.push('/insights/journal')} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricRow: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  connectBtn: { backgroundColor: colors.goldSoft, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, marginLeft: 12 },
});
