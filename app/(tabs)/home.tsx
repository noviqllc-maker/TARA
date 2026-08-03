// app/(tabs)/home.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, GoldButton } from '@/components/ui';
import EnergyDashboard from '@/components/EnergyDashboard';
import Disclaimer from '@/components/Disclaimer';
import { PremiumNudgeBar } from '@/components/PremiumNudge';
import { useSubscription } from '@/hooks/useSubscription';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useChart } from '@/hooks/useChart';
import { useTransits } from '@/hooks/useTransits';
import { useDailyEnergy } from '@/hooks/useDailyEnergy';
import { useHealth } from '@/hooks/useHealth';
import { useDailyContent } from '@/hooks/useDailyContent';
import { setAskDraft } from '@/lib/askDraft';
import { computeCosmicEvents } from '@/lib/panchanga';
import { todayObservance } from '@/lib/observances';
import { computeTransitFactor, BirthChart } from '@/lib/vedic';
import { Topic } from '@/lib/topic';
import { loadJapa, JapaState } from '@/lib/practice';
import { greeting, todayLong } from '@/data/mock';
import { colors, spacing } from '@/theme';

// Quick actions — non-tab destinations only (Ask Tara & Birth Chart live in the tab bar).
const QUICK = [
  { label: 'Compatibility', route: '/insights/love' },
  { label: "Today's Remedies", route: '/(tabs)/insights' },
  { label: 'Life Timeline', route: '/chart/timeline' },
  { label: 'Shop', route: '/(tabs)/profile', params: { scrollTo: 'shop' } },
];

// Life areas, each mapped to the topic that biases its daily teaser factor. Love leads.
const LIFE_AREAS: { label: string; route: string; topic: Topic }[] = [
  { label: 'Love & Relationships', route: '/insights/love', topic: 'love' },
  { label: 'Career & Money', route: '/insights/career', topic: 'career' },
  { label: 'Health & Wellness', route: '/insights/wellness', topic: 'health' },
  { label: 'Life Purpose', route: '/insights/purpose', topic: 'spiritual' },
];

// ---- daily life-area teaser (deterministic, seeded by user+date+domain) ---------
// A one-line read composed from the domain's strongest transiting graha (topic-biased, the
// same engine the rest of the app uses) + a short domain-flavoured tag. Returns null so a
// row degrades to a plain link when there's no chart / no factor.
// Two tone phrasings per graha, so a graha that leads more than one domain on a busy day
// still reads differently row to row (the tone is seeded per domain, like the advice).
const GRAHA_TONE: Record<string, string[]> = {
  Sun: ['the Sun lends clarity', 'the Sun brings a steadying focus'],
  Moon: ['the Moon softens the mood', 'the Moon deepens feeling'],
  Mars: ['Mars brings drive', 'Mars sharpens your edge'],
  Mercury: ['Mercury quickens the mind', 'Mercury favours clear words'],
  Jupiter: ['Jupiter opens things up', 'Jupiter widens the view'],
  Venus: ['Venus warms the day', 'Venus draws people closer'],
  Saturn: ['Saturn asks for patience', 'Saturn rewards steady effort'],
  Rahu: ['Rahu stirs ambition', 'Rahu pulls toward the new'],
  Ketu: ['Ketu turns you inward', 'Ketu invites you to let go'],
};
const DOMAIN_ADVICE: Partial<Record<Topic, string[]>> = {
  love: ['listen first', 'lead with warmth', 'say the kind thing'],
  career: ['pick one priority', 'move with intention', 'let steadiness lead'],
  health: ['tend your energy gently', 'rest counts as work today', 'keep the rhythm simple'],
  spiritual: ['make room for reflection', 'follow what holds meaning', 'trust the quiet pull'],
};
function teaserHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function lifeAreaTeaser(chart: BirthChart | null, date: Date, topic: Topic, seed: string): string | null {
  if (!chart) return null;
  let graha: string;
  try { graha = computeTransitFactor(chart, date, topic).transiting; } catch { return null; }
  const tones = GRAHA_TONE[graha];
  const advice = DOMAIN_ADVICE[topic];
  if (!tones?.length || !advice?.length) return null;
  const tone = tones[teaserHash(seed + ':tone') % tones.length];
  const a = advice[teaserHash(seed) % advice.length];
  return `${tone[0].toUpperCase()}${tone.slice(1)} — ${a}.`;
}

// Title-case gold section label (replaces the old all-caps Eyebrow on Home).
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text color={colors.gold} style={styles.sectionLabel}>{children}</Text>;
}

export default function Home() {
  const { profile } = useProfile();
  const { session } = useAuth();
  const uid = session?.user?.id || profile.name || 'anon';
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
  // Today's Cosmic Events — deterministic, engine-computed, changes day to day (recompute
  // per calendar day + chart, matching the useTransits/useDailyEnergy pattern; no AI call).
  const dayKey = new Date().toDateString();
  const cosmic = useMemo(() => computeCosmicEvents(chart, new Date()), [chart, dayKey]);
  // Today's observance (Ekādaśī / Pūrṇimā / festival …), if one is active — surfaced as a
  // line on the cosmic-events card and echoed on the Practice card. Deterministic, no AI.
  const observance = useMemo(() => todayObservance(new Date()), [dayKey]);
  // Today's Guidance — engine-composed, seeded per user + day (no AI, no mock).
  const daily = useDailyContent();
  // "Monday • July 20" — title case, dot separator (not all caps).
  const dateLine = todayLong().replace(', ', ' • ');

  // Per-domain daily teasers, seeded (user + date + domain), recomputed per calendar day.
  const areaTeasers = useMemo(
    () => LIFE_AREAS.map((a) => lifeAreaTeaser(chart, new Date(), a.topic, `${uid}:${dayKey}:${a.topic}`)),
    [chart, uid, dayKey],
  );

  // The Cosmic Weather rows that AREN'T already in the events grid (nakshatra & tithi are),
  // merged into the events card as a second row-group. No value is rendered twice on Home.
  const cosmicRows: [string, string][] = [
    ['Dasha', chart?.currentDasha ?? '—'],
    ['Transit', transits.transitText],
    ['Moon Phase', transits.moonPhase],
  ];

  // Japa streak, surfaced on the Daily Practice card. Refetches on focus so it stays live.
  const [japa, setJapa] = useState<JapaState | null>(null);
  useFocusEffect(useCallback(() => { loadJapa().then(setJapa); }, []));

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Text color={colors.gold} style={styles.dateLine}>{dateLine}</Text>
        <Text variant="serif" style={styles.hero}>{greeting()},</Text>
        <Text variant="serif" style={[styles.hero, styles.heroName]}>{profile.name || 'friend'}</Text>
        {/* Dynamic cosmic line — deterministic, from the day's strongest real factor. */}
        {daily.cosmicLine ? <Text style={styles.cosmicLine}>{daily.cosmicLine}</Text> : null}
      </Animated.View>

      {/* Today's Guidance — the hero card, emotion-first (renamed from Tara's Message) */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <SectionLabel>Today's Guidance</SectionLabel>
        <Text variant="serif" style={styles.guidanceHead}>{daily.message.headline}</Text>
        <Text style={styles.guidanceBody}>{daily.message.body}</Text>
        <GoldButton label="Ask About Today" onPress={() => router.push('/(tabs)/tara')} style={{ marginTop: 18 }} />
        {/* Bridge: PREFILLS the question in Ask Tara (focused, not sent). The user's
            explicit send press is the only thing that ever spends a credit. */}
        <Pressable
          onPress={() => {
            setAskDraft(`About today's guidance — "${daily.message.headline}" — why is this the theme for me today?`);
            router.push('/(tabs)/tara');
          }}
          hitSlop={6}
          style={{ marginTop: 14, alignSelf: 'center' }}
        >
          <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 13 }}>Why today? →</Text>
        </Pressable>
      </Card>

      {/* Energy dashboard */}
      <Card style={{ marginBottom: spacing.lg }}>
        <SectionLabel>Today's Energy</SectionLabel>
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

      {/* 4. Your Life Areas — promoted; each row carries a daily teaser (Love leads) */}
      <SectionLabel>Your Life Areas</SectionLabel>
      <View style={styles.lifeGrid}>
        {LIFE_AREAS.map((s, i) => (
          <Pressable key={s.label} style={styles.areaCard} onPress={() => router.push(s.route as any)}>
            <View style={styles.areaTop}>
              <Text variant="serif" style={{ fontSize: 15 }}>{s.label}</Text>
              <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
            </View>
            {areaTeasers[i] ? (
              <Text variant="tiny" color={colors.muted} style={styles.areaTeaser}>{areaTeasers[i]}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* 5. Daily Practice — streak surfaced here (pulls daily opens) */}
      <Pressable onPress={() => router.push('/practice' as any)}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Text style={{ fontSize: 22 }}>🙏</Text>
              <View style={{ flex: 1 }}>
                <Text variant="serif" style={{ fontSize: 16 }}>Daily Practice</Text>
                <Text variant="tiny" color={colors.muted} style={{ fontSize: 12, marginTop: 2 }}>
                  {japa && japa.streak > 0 ? `🔥 ${japa.streak}-day streak · today’s mantra` : 'Japa, evening ritual & observances'}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </View>
        </Card>
      </Pressable>

      {/* 6. Today's Cosmic Events — panchanga/day-lord almanac + a merged second group
             (Dasha, transit, Moon phase) absorbed from the old Cosmic Weather card */}
      <Card style={{ marginBottom: spacing.lg }}>
        <SectionLabel>Today's Cosmic Events</SectionLabel>
        <View style={styles.eventsGrid}>
          {[
            { glyph: '☾', label: 'Moon', value: `${cosmic.moonSign} • ${cosmic.moonNakshatra}` },
            { glyph: '◐', label: 'Tithi', value: cosmic.tithi },
            { glyph: cosmic.dayLordGlyph, label: 'Planet of the day', value: cosmic.dayLord },
            { glyph: '⏱', label: 'Power hours', value: cosmic.power.window },
            { glyph: '●', label: 'Lucky color', value: cosmic.luckyColor, swatch: cosmic.luckyColorHex },
            { glyph: '✦', label: 'Lucky number', value: String(cosmic.luckyNumber) },
          ].map((c) => (
            <View key={c.label} style={styles.eventCell}>
              <Text style={{ fontSize: 16, color: colors.goldSoft, lineHeight: 22 }}>{c.glyph}</Text>
              <View style={{ flex: 1 }}>
                <Text color={colors.muted} style={{ fontSize: 10.5, letterSpacing: 0.3 }}>{c.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {c.swatch ? <View style={[styles.swatch, { backgroundColor: c.swatch }]} /> : null}
                  <Text color={colors.cream} style={styles.eventValue} numberOfLines={1}>{c.value}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Merged second group (was "Current Cosmic Weather") — no duplicate values. */}
        <View style={styles.cosmicRows}>
          {cosmicRows.map(([k, v]) => (
            <View key={k} style={styles.cwRow}>
              <Text variant="tiny" color={colors.muted}>{k}</Text>
              <Text variant="body" color={colors.goldSoft} style={{ fontSize: 13, flexShrink: 1, textAlign: 'right' }} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Today's observance, when one is active — informational, taps into Practice. */}
        {observance ? (
          <Pressable onPress={() => router.push('/practice/observances' as any)} hitSlop={6} style={styles.observanceLine}>
            <Text style={{ fontSize: 14, color: colors.goldSoft }}>✦</Text>
            <Text variant="tiny" color={colors.cream} style={{ flex: 1, fontSize: 12.5, lineHeight: 17 }}>
              <Text variant="tiny" color={colors.gold} style={{ fontSize: 12.5, fontWeight: '600' }}>{observance.name}</Text>
              {'  '}today · tap to read
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {/* 7. Journal Prompt */}
      <Card style={{ marginBottom: spacing.lg }}>
        <SectionLabel>Journal Prompt</SectionLabel>
        <Text variant="serif" style={styles.journalPrompt}>“{daily.journalPrompt}”</Text>
        <Pressable onPress={() => router.push('/insights/journal')} hitSlop={6} style={{ marginTop: 14 }}>
          <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 13 }}>Open Mood Journal →</Text>
        </Pressable>
      </Card>

      {/* 8. Premium nudge — free users only */}
      <PremiumNudgeBar context="home" style={{ marginBottom: spacing.lg }} />

      {/* 9. Quick Actions — non-tab destinations only */}
      <SectionLabel>Quick Actions</SectionLabel>
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

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Header hero
  dateLine: { fontSize: 13.5, fontWeight: '500', letterSpacing: 0.2, marginBottom: 12 },
  hero: { fontSize: 48, fontWeight: '600', letterSpacing: -0.5, lineHeight: 52, color: colors.cream },
  heroName: { color: colors.gold },
  cosmicLine: { fontSize: 16, lineHeight: 22, color: colors.goldSoft, marginTop: 12, marginBottom: spacing.lg },
  // Section labels (title case, gold, 14px medium — no all caps)
  sectionLabel: { fontSize: 14, fontWeight: '500', letterSpacing: 0.1, marginBottom: 2 },
  // Guidance hero card
  guidanceHead: { fontSize: 31, fontWeight: '500', lineHeight: 40, marginTop: 12, marginBottom: 4, color: colors.cream },
  guidanceBody: { fontSize: 15, lineHeight: 24, color: colors.cream, opacity: 0.85, marginTop: 10 },
  // Cosmic events value (prominent)
  eventValue: { fontSize: 14, fontWeight: '600' },
  connectRow: {
    marginTop: 12, paddingTop: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  journalPrompt: { fontSize: 16, marginTop: 10, lineHeight: 25, fontStyle: 'italic', color: colors.cream },
  lifeGrid: { gap: 10, marginTop: 12, marginBottom: spacing.lg },
  areaCard: {
    padding: 16, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
  areaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  areaTeaser: { marginTop: 6, fontSize: 12.5, lineHeight: 17 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  quick: {
    width: '47.5%', paddingVertical: 16, paddingHorizontal: 14,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
  cwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cosmicRows: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, gap: 9 },
  eventsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 14 },
  eventCell: { width: '50%', flexDirection: 'row', gap: 8, paddingRight: 8 },
  swatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.line },
  observanceLine: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
});
