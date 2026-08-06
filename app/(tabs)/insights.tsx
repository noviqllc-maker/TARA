// app/(tabs)/insights.tsx — "Your Cosmic Weather". Engine-composed, seeded per user + day.
//
// DEPTH SPLIT (pre-launch gating of existing content):
//   FREE   → the weather headline, Emotional Energy, Mental Energy, ONE rotating third core
//            card, and Mantra of the Day — each with its "Ask Tara why →" bridge.
//   PREMIUM→ Transit Spotlight, Retrograde Watch, Your Chapter, Body Signal, What to Avoid /
//            Lean Into, and any other deep card. On the free tier these render as a teaser:
//            section label + first ~6 words + ✦, tapping opens the PremiumSheet. No "Ask Tara
//            why" on a teaser, and the full composed text is NEVER carried into the teaser
//            render model (truncated at composition, not clipped visually) so it can't leak.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow } from '@/components/ui';
import { PremiumSheet } from '@/components/PremiumNudge';
import Disclaimer from '@/components/Disclaimer';
import { useDailyContent } from '@/hooks/useDailyContent';
import { useHealth } from '@/hooks/useHealth';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { bodySuggestion, genericBodySuggestion, classifyHealth, dayLordOf } from '@/lib/wellness';
import { benefitsLeadingWith } from '@/lib/premium';
import { setAskDraft } from '@/lib/askDraft';
import { todayLong } from '@/data/mock';
import { colors, spacing } from '@/theme';

// PREFILL the question in Ask Tara (focused, not sent) — the explicit send press is the
// only action that spends a credit, so no stray tap can trigger a charge.
const askWhy = (q: string) => { setAskDraft(q); router.push('/(tabs)/tara'); };

// Always-free core cards; the hard-premium deep cards; everything else is core-eligible and
// the FIRST such card each day becomes the rotating third free card (the daily shuffle in
// composeDailyContent makes "first" rotate naturally).
const ALWAYS_FREE = new Set(['emotional', 'mental']);
const HARD_PREMIUM = new Set(['transit', 'retrograde', 'dasha', 'body']);

// First ~n words + an ellipsis. Used to build teaser strings at composition time so the full
// text never reaches the rendered node on the free tier.
function firstWords(s: string, n = 6): string {
  const w = s.trim().split(/\s+/);
  return w.length <= n ? s : `${w.slice(0, n).join(' ')} …`;
}

type CardVM =
  | { gated: false; key: string; label: string; color: string; text: string; question: string }
  | { gated: true; key: string; label: string; color: string; teaser: string };

export default function Insights() {
  const daily = useDailyContent();
  const { metrics, connected } = useHealth();
  const { isPremium } = useSubscription();
  const { session } = useAuth();
  const { profile } = useProfile();
  const [sheet, setSheet] = useState(false);

  // The health-aware Body Signal suggestion (premium only — and Body Signal is itself premium
  // now, so this only ever renders inside the premium branch). Seeded (user + date).
  const seed = `${session?.user?.id || profile.name || 'anon'}:${new Date().toDateString()}`;
  const bodyExtra = useMemo(() => {
    if (!isPremium || !connected) return null;
    return classifyHealth(metrics).hasData
      ? bodySuggestion(metrics, new Date(), seed)
      : genericBodySuggestion(new Date(), seed);
  }, [isPremium, connected, metrics, seed]);

  // TODO(remove-before-release): temporary Body Signal verification log. Prints the raw
  // HealthKit values, the derived bands, the dominant state, the day lord, and the exact
  // suggestion that would be selected — one [BodySignal] line, __DEV__ only, no behavior
  // change. Re-fires when metrics settle (they load async from the health hook).
  useEffect(() => {
    if (!__DEV__) return;
    const c = classifyHealth(metrics);
    const now = new Date();
    const selected = c.hasData ? bodySuggestion(metrics, now, seed) : genericBodySuggestion(now, seed);
    // eslint-disable-next-line no-console
    console.log(
      `[BodySignal] src=${metrics.source} sleep=${metrics.sleepHours}h steps=${metrics.steps} avg7d=${metrics.stepsAvg7d} recovery=${metrics.recovery}` +
      ` | bands sleep=${c.sleep} activity=${c.activity} recovery=${c.recovery} | state=${c.hasData ? c.state : 'generic(no-data)'}` +
      ` | lord=${dayLordOf(now)} | "${selected}"`,
    );
  }, [metrics, seed]);

  // Split the day's cards into free (full) and gated (teaser). Truncation happens HERE, so a
  // gated card's view-model carries only its 6-word teaser — never the full composed text.
  const cards: CardVM[] = useMemo(() => {
    let thirdUsed = false;
    return daily.insights.map((c) => {
      let free: boolean;
      if (ALWAYS_FREE.has(c.key)) free = true;
      else if (HARD_PREMIUM.has(c.key)) free = false;
      else if (!thirdUsed) { free = true; thirdUsed = true; }
      else free = false;
      if (isPremium || free) return { gated: false, key: c.key, label: c.label, color: c.color, text: c.text, question: c.question };
      return { gated: true, key: c.key, label: c.label, color: c.color, teaser: firstWords(c.text) };
    });
  }, [daily.insights, isPremium]);

  const openSheet = () => setSheet(true);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Eyebrow>Daily Insights · {todayLong()}</Eyebrow>
        <Text variant="h1" style={{ marginTop: 8, marginBottom: spacing.lg }}>Your Cosmic Weather</Text>
      </Animated.View>

      {/* FREE — the overall weather headline. */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Text variant="serif" style={{ fontSize: 16.5, lineHeight: 25 }}>{daily.weatherSummary}</Text>
      </Card>

      {/* Weekly & Monthly Guidance entry — premium forecast; free sees a locked teaser. */}
      <Pressable onPress={() => router.push('/insights/forecast' as any)} style={{ marginBottom: spacing.lg }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Eyebrow color={colors.gold}>Weekly & Monthly Guidance</Eyebrow>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 6, fontSize: 12.5 }}>
                {isPremium ? 'Your week & month ahead — always current' : '✦ Premium · your week & month ahead'}
              </Text>
            </View>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </View>
        </Card>
      </Pressable>

      {/* Insight cards — free render fully; gated render as teasers that open the sheet. */}
      {cards.map((c) =>
        c.gated ? (
          <Pressable key={c.key} onPress={openSheet}>
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow color={c.color}>{c.label}</Eyebrow>
                <Text style={{ color: colors.gold, fontSize: 13 }}>✦</Text>
              </View>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, fontSize: 13 }}>{c.teaser}</Text>
            </Card>
          </Pressable>
        ) : (
          <Card key={c.key} style={{ marginBottom: 12 }}>
            <Eyebrow color={c.color}>{c.label}</Eyebrow>
            <Text variant="tiny" style={{ marginTop: 8, fontSize: 13 }}>{c.text}</Text>

            {/* Body Signal only (premium): the lifestyle suggestion, or a connect invite. */}
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
        ),
      )}

      {/* PREMIUM — What to Avoid / Lean Into. Free tier gets teasers that open the sheet. */}
      {isPremium ? (
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
      ) : (
        // Avoid / Lean Into are ≤6 words, so a 6-word teaser would show the whole thing.
        // Label-only teasers here — no composed words leak; the tap opens the sheet.
        <View style={styles.dual}>
          <Pressable style={{ flex: 1 }} onPress={openSheet}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow color={colors.rose}>What to Avoid</Eyebrow>
                <Text style={{ color: colors.gold, fontSize: 13 }}>✦</Text>
              </View>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, fontSize: 12 }}>Premium · unlock →</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={openSheet}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow color={colors.sage}>Lean Into</Eyebrow>
                <Text style={{ color: colors.gold, fontSize: 13 }}>✦</Text>
              </View>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, fontSize: 12 }}>Premium · unlock →</Text>
            </Card>
          </Pressable>
        </View>
      )}

      {/* FREE — Mantra of the Day. */}
      <Card solid style={{ marginTop: spacing.lg }}>
        <Eyebrow>Mantra of the Day</Eyebrow>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, fontSize: 11 }}>Today's mantra · {daily.mantraGraha}</Text>
        <Text variant="serif" style={{ fontSize: 19, marginTop: 8, color: colors.goldSoft }}>{daily.mantra}</Text>
        <Text variant="tiny" style={{ marginTop: 6 }}>{daily.mantraNote}</Text>
      </Card>

      <Disclaimer />

      <PremiumSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Tara Premium"
        benefits={benefitsLeadingWith('The full Daily Insights — every layer of your day')}
      />
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
