// app/(tabs)/insights.tsx — "Your Cosmic Weather". All content is engine-composed and
// seeded per user + day (see useDailyContent): the summary, the 5-6 rotating insight
// cards, What to Avoid / Lean Into, and the Mantra of the Day. Each insight card carries
// an "Ask Tara why →" bridge that routes through the normal (credit-gated) answer flow.
import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useDailyContent } from '@/hooks/useDailyContent';
import { useHealth } from '@/hooks/useHealth';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { bodySuggestion, genericBodySuggestion, classifyHealth } from '@/lib/wellness';
import { setAskDraft } from '@/lib/askDraft';
import { todayLong } from '@/data/mock';
import { colors, spacing } from '@/theme';

// PREFILL the question in Ask Tara (focused, not sent) — the explicit send press is the
// only action that spends a credit, so no stray tap can trigger a charge.
const askWhy = (q: string) => { setAskDraft(q); router.push('/(tabs)/tara'); };

export default function Insights() {
  const daily = useDailyContent();
  const { metrics, connected } = useHealth();
  const { isPremium } = useSubscription();
  const { session } = useAuth();
  const { profile } = useProfile();

  // The health-aware Body Signal suggestion (premium only — the free reading is unchanged so
  // nothing leaks to the free tier). Seeded (user + date), same key style as useDailyContent.
  const seed = `${session?.user?.id || profile.name || 'anon'}:${new Date().toDateString()}`;
  const bodyExtra = useMemo(() => {
    if (!isPremium || !connected) return null;                 // free tier / not connected → no suggestion
    return classifyHealth(metrics).hasData
      ? bodySuggestion(metrics, new Date(), seed)              // real data → state-tuned line
      : genericBodySuggestion(new Date(), seed);              // connected, no samples yet → day-lord line
  }, [isPremium, connected, metrics, seed]);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Eyebrow>Daily Insights · {todayLong()}</Eyebrow>
        <Text variant="h1" style={{ marginTop: 8, marginBottom: spacing.lg }}>Your Cosmic Weather</Text>
      </Animated.View>

      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Text variant="serif" style={{ fontSize: 16.5, lineHeight: 25 }}>{daily.weatherSummary}</Text>
      </Card>

      {daily.insights.map((c) => (
        <Card key={c.key} style={{ marginBottom: 12 }}>
          <Eyebrow color={c.color}>{c.label}</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8, fontSize: 13 }}>{c.text}</Text>

          {/* Body Signal only: a lifestyle suggestion for premium (reading + suggestion), or a
              gentle connect invite when Apple Health isn't linked yet. */}
          {c.key === 'body' && bodyExtra ? (
            <View style={styles.suggestion}>
              <Text variant="tiny" color={colors.sage} style={{ fontSize: 12 }}>✦ </Text>
              <Text variant="tiny" color={colors.creamDim} style={{ fontSize: 12.5, lineHeight: 18, flex: 1 }}>{bodyExtra}</Text>
            </View>
          ) : null}
          {c.key === 'body' && !connected ? (
            <Pressable onPress={() => router.push('/insights/wellness')} hitSlop={6} style={{ marginTop: 10 }}>
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5 }}>
                Connect Apple Health for guidance tuned to your real rhythm <Text variant="tiny" color={colors.gold} style={{ fontSize: 11.5 }}>→</Text>
              </Text>
            </Pressable>
          ) : null}

          <Pressable onPress={() => askWhy(c.question)} hitSlop={6} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
            <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 12.5 }}>Ask Tara why →</Text>
          </Pressable>
        </Card>
      ))}

      <View style={styles.dual}>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.rose}>What to Avoid</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8 }}>{daily.avoid}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.sage}>Lean Into</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8 }}>{daily.leanInto}</Text>
        </Card>
      </View>

      <Card solid style={{ marginTop: spacing.lg }}>
        <Eyebrow>Mantra of the Day</Eyebrow>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, fontSize: 11 }}>Today's mantra · {daily.mantraGraha}</Text>
        <Text variant="serif" style={{ fontSize: 19, marginTop: 8, color: colors.goldSoft }}>{daily.mantra}</Text>
        <Text variant="tiny" style={{ marginTop: 6 }}>{daily.mantraNote}</Text>
      </Card>

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dual: { flexDirection: 'row', gap: 12 },
  suggestion: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
});
