// app/insights/wellness.tsx
import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton, Chip } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import { PremiumNudgeBar } from '@/components/PremiumNudge';
import Ring from '@/components/Ring';
import Disclaimer from '@/components/Disclaimer';
import { useHealth } from '@/hooks/useHealth';
import { useChart } from '@/hooks/useChart';
import { composeWellness } from '@/lib/composeWellness';
import { composeHealthAction, HealthAction } from '@/lib/composeHealthAction';
import { colors, fonts, spacing } from '@/theme';

const RISK_COLOR: Record<HealthAction['riskLevel'], string> = {
  low: colors.sage, medium: colors.goldSoft, high: colors.terra,
};

export default function Wellness() {
  const { metrics, connected, available, loading, connectAppleHealth, refresh } = useHealth();
  // Spiritual tone + habits + practices come from the chart (day-lord, 12th house); the health
  // rings above stay driven by real metrics. Null when there is no birth chart yet.
  const chart = useChart();
  const wellnessContent = composeWellness(chart);
  // Six concrete daily pointers (day-lord, transit Moon, natal Mars/Venus/Saturn, horā, risk).
  const healthAction = composeHealthAction(chart);
  const live = metrics.source === 'apple-health';

  const onConnect = async () => {
    if (!available) {
      Alert.alert(
        'Dev build required',
        'Apple Health works in a development or production build (not Expo Go), on iPhone. See APPLE-HEALTH-SETUP.md.',
      );
      return;
    }
    const res = await connectAppleHealth();
    if (res === 'no-data') {
      Alert.alert('Almost there', 'Apple Health is connected, but no data came back yet. Enable categories in the Health app → Sharing → Apps → Tara.');
    } else if (res === 'failed') {
      Alert.alert('Not connected', 'Something went wrong requesting Health access. Please try again.');
    }
  };

  return (
    <Screen>
      <SubHeader eyebrow="Health & Wellness" title="Your Body Signals" />
      <PremiumNudgeBar context="life_health" style={{ marginBottom: spacing.lg }} />

      {/* Live / connect banner */}
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow color={connected ? colors.sage : colors.gold}>
            {connected ? '● Apple Health connected' : 'Connect Apple Health'}
          </Eyebrow>
          <Text variant="tiny" style={{ marginTop: 6 }}>
            {live
              ? `Showing your real data${metrics.sleepHours ? ` · ${metrics.sleepHours}h sleep` : ''}.`
              : connected
                ? 'Connected, but no data yet. Enable categories in the Health app.'
                : 'Blend your real sleep, recovery & HRV with your chart.'}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : connected ? (
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
          <Text variant="tiny">Body: <Text color={colors.goldSoft}>{metrics.recovery < 55 ? 'Restoration & hydration' : 'Steady movement'}</Text></Text>
          <Text variant="tiny">Mind: <Text color={colors.goldSoft}>{metrics.sleep < 60 ? 'Single-tasking' : 'Focused output'}</Text></Text>
          <Text variant="tiny">Spiritual: <Text color={colors.goldSoft}>{wellnessContent?.spiritualAlignment ?? 'Add birth details'}</Text></Text>
        </View>
      </Card>

      {wellnessContent ? (
        <>
          <Card style={{ marginTop: 12 }}>
            <Eyebrow>Recommended Habits</Eyebrow>
            <View style={styles.chips}>{wellnessContent.habits.map((h) => <Chip key={h}>{h}</Chip>)}</View>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Eyebrow>Recommended Practices</Eyebrow>
            <View style={styles.chips}>{wellnessContent.practices.map((p) => <Chip key={p}>{p}</Chip>)}</View>
          </Card>
        </>
      ) : (
        <Card style={{ marginTop: 12 }}>
          <Eyebrow>Recommended Habits & Practices</Eyebrow>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }}>
            Add your birth details to see habits and practices tuned to your chart and today’s day-lord.
          </Text>
        </Card>
      )}

      {/* Six concrete, chart-derived pointers for the day. */}
      {healthAction ? (
        <Card style={{ marginTop: 12 }}>
          <Eyebrow>Today's Wellness Guidance</Eyebrow>
          <View style={{ marginTop: 10, gap: 12 }}>
            {([
              ["Today's action", healthAction.todaysAction],
              ['Avoid today', healthAction.avoidToday],
              ['Best hour', healthAction.bestHour],
              ['Biggest opportunity', healthAction.biggestOpportunity],
              ['One decision to make', healthAction.oneDecisionToMake],
            ] as const).map(([label, value]) => (
              <View key={label}>
                <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10, letterSpacing: 0.4 }}>{label}</Text>
                <Text variant="tiny" color={colors.cream} style={{ fontSize: 13, lineHeight: 19, marginTop: 3 }}>{value}</Text>
              </View>
            ))}
            <View>
              <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10, letterSpacing: 0.4 }}>Rest priority</Text>
              <Text
                variant="tiny"
                color={RISK_COLOR[healthAction.riskLevel]}
                style={{ fontSize: 13, fontWeight: '600', marginTop: 3, textTransform: 'capitalize' }}
              >
                {healthAction.riskLevel}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

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
