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
import { computeCosmicEvents, CosmicEvents } from '@/lib/panchanga';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { GlossaryTooltip } from '@/components/GlossaryTooltip';
import { todayObservance } from '@/lib/observances';
import { computeTransitFactor, BirthChart } from '@/lib/vedic';
import { buildMonth, dayDetail, DayCell, TithiSpecial } from '@/lib/calendar';
import { PURPOSES, Purpose, findMuhurtaDates } from '@/lib/muhurtaPlanner';
import { Topic } from '@/lib/topic';
import { PriorityKey } from '@/data/priorities';
import { loadJapa, JapaState } from '@/lib/practice';
import { greeting, todayLong, EnergyDomain } from '@/data/mock';
import { colors, radius, spacing } from '@/theme';

// Quick actions — non-tab destinations only (Ask Tara & Birth Chart live in the tab bar).
// Calendar & Muhūrta now live as full embedded Home sections, so they're no longer here.
const QUICK = [
  { label: 'Vedic Calculator', route: '/calculator' },
  { label: 'Compatibility', route: '/insights/love' },
  { label: "Today's Remedies", route: '/(tabs)/insights' },
  { label: 'Life Timeline', route: '/chart/timeline' },
  { label: 'Shop', route: '/(tabs)/profile', params: { scrollTo: 'shop' } },
];

// Calendar tithi-marker colors + labels (mirrors app/calendar.tsx so the embedded grid reads
// identically to the full screen).
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOT_COLOR: Record<Exclude<TithiSpecial, null>, string> = {
  amavasya: colors.terra, purnima: colors.lav, ekadashi: colors.goldSoft,
};
const DOT_LABEL: Record<Exclude<TithiSpecial, null>, string> = {
  amavasya: 'Amāvasyā', purnima: 'Pūrṇimā', ekadashi: 'Ekādaśī',
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Life areas, each mapped to the topic that biases its daily teaser factor. Default order;
// reordered at render time to lead with the user's onboarding priority.
const LIFE_AREAS: { label: string; route: string; topic: Topic }[] = [
  { label: 'Love & Relationships', route: '/insights/love', topic: 'love' },
  { label: 'Career & Money', route: '/insights/career', topic: 'career' },
  { label: 'Health & Wellness', route: '/insights/wellness', topic: 'health' },
  { label: 'Life Purpose', route: '/insights/purpose', topic: 'spiritual' },
];

// Which of the four real life areas each onboarding priority leads with. The eight priorities
// collapse onto the four areas the app actually has (money/business -> Career, family -> Love,
// learning -> Life Purpose). All areas stay visible; only their order changes.
const PRIORITY_TOPIC: Record<PriorityKey, Topic> = {
  career: 'career', money: 'career', business: 'career',
  love: 'love', family: 'love',
  health: 'health',
  purpose: 'spiritual', learning: 'spiritual',
};

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
  return `${tone[0].toUpperCase()}${tone.slice(1)}. ${a[0].toUpperCase()}${a.slice(1)}.`;
}

// Title-case gold section header on the unified scale (18 Outfit Medium).
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text variant="sectionHeader" color={colors.gold}>{children}</Text>;
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
  // Cosmic Events (sunrise/sunset, day-lord horā, Rāhukālam, Abhijit) are location-aware. We
  // use the user's CURRENT location when it's available, falling back to their birth place, so
  // the single card always reflects where they actually are without a birth/current split.
  const { current: currentLocation } = useCurrentLocation();
  const birthLocation = profile.lat != null && profile.lon != null
    ? { lat: profile.lat, lon: profile.lon, tzOffsetMinutes: profile.tzOffsetMinutes }
    : undefined;
  const cosmicLocation = currentLocation ?? birthLocation;
  const cosmic = useMemo(
    () => computeCosmicEvents(chart, new Date(), cosmicLocation),
    [chart, dayKey, cosmicLocation?.lat, cosmicLocation?.lon, cosmicLocation?.tzOffsetMinutes],
  );
  // Today's observance (Ekādaśī / Pūrṇimā / festival …), if one is active — surfaced as a
  // line on the cosmic-events card and echoed on the Practice card. Deterministic, no AI.
  const observance = useMemo(() => todayObservance(new Date()), [dayKey]);

  // Today's Cosmic Events — the compact daily almanac (facts only, no explanations; the
  // panchāṅga interpretation now lives on Daily Insights). Nakshatra & tithi are in the grid,
  // so the second row-group carries only Dasha / Transit / Moon phase (never duplicated).
  const cosmicRows: [string, string][] = [
    ['Dasha', chart?.currentDasha ?? '–'],
    ['Transit', transits.transitText],
    ['Moon Phase', transits.moonPhase],
  ];
  // The three timing rows (power hour / Abhijit / Rāhukālam) are added only when a location is
  // set, so they never render as empty placeholders.
  type EventCell = { glyph: string; label: string; value: string; swatch?: string; term?: string };
  const buildCells = (ev: CosmicEvents): EventCell[] => [
    { glyph: '☾', label: 'Moon', value: `${ev.moonSign} • ${ev.moonNakshatra}`, term: 'nakshatra' },
    { glyph: '◐', label: 'Tithi', value: ev.tithi, term: 'tithi' },
    { glyph: ev.dayLordGlyph, label: 'Planet of the day', value: ev.dayLord, term: 'vara' },
    ...(ev.powerHours
      ? [{ glyph: '⏱', label: 'Power hour', value: `${ev.powerHours.start} – ${ev.powerHours.end}`, term: 'hora' }]
      : []),
    ...(ev.abhijitMuhurta
      ? [{ glyph: '☀', label: 'Abhijit (auspicious)', value: `${ev.abhijitMuhurta.start} – ${ev.abhijitMuhurta.end}`, term: 'abhijit' }]
      : []),
    ...(ev.rahukalam
      ? [{ glyph: '☊', label: 'Rāhukālam (avoid)', value: `${ev.rahukalam.start} – ${ev.rahukalam.end}`, term: 'rahukalam' }]
      : []),
    { glyph: '●', label: 'Lucky color', value: ev.luckyColor, swatch: ev.luckyColorHex },
    { glyph: '✦', label: 'Lucky number', value: String(ev.luckyNumber) },
  ];
  const cells = buildCells(cosmic);

  // One grid renderer for the cosmic-events card.
  const renderGrid = (cellArr: EventCell[]) => (
    <View style={styles.eventsGrid}>
      {cellArr.map((c) => (
        <View key={c.label} style={styles.eventCell}>
          <Text style={{ fontSize: 16, color: colors.goldSoft, lineHeight: 22 }}>{c.glyph}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text color={colors.muted} style={{ fontSize: 10.5, letterSpacing: 0.3 }}>{c.label}</Text>
              {c.term ? <GlossaryTooltip term={c.term} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {c.swatch ? <View style={[styles.swatch, { backgroundColor: c.swatch }]} /> : null}
              <Text color={colors.cream} style={styles.eventValue} numberOfLines={1}>{c.value}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // ---- Embedded Vedic Calendar + Muhūrta ----------------------------------------
  // Month grid (deterministic, from calendar.ts), a tapped-day detail, and a purpose-driven
  // muhūrta shortlist — the same engines the full /calendar and /muhurta screens use.
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [purpose, setPurpose] = useState<Purpose>('business');

  const { weeks, label: monthLabel } = useMemo(
    () => buildMonth(cursor.year, cursor.month, today),
    [cursor.year, cursor.month, dayKey],
  );
  const shiftMonth = (delta: number) => setCursor(({ year, month }) => {
    const m = month + delta;
    return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
  });
  // Day detail uses the same current-or-birth location as Cosmic Events, so the time windows
  // reflect where the user actually is. Without a location the windows read "Set birth place".
  const dayInfo = useMemo(
    () => dayDetail(selectedDate, chart, cosmicLocation),
    [selectedDate, chart, cosmicLocation?.lat, cosmicLocation?.lon, cosmicLocation?.tzOffsetMinutes],
  );
  // Best upcoming muhūrta for the chosen purpose (premium-gated: [] for free users, who see a
  // locked prompt instead of fabricated dates).
  const topMuhurta = useMemo(
    () => findMuhurtaDates(chart, purpose, 90, 1, isPremium)[0] ?? null,
    [chart, purpose, isPremium],
  );

  // Today's Guidance — engine-composed, seeded per user + day (no AI, no mock).
  const daily = useDailyContent();
  // "Monday • July 20" — title case, dot separator (not all caps).
  const dateLine = todayLong().replace(', ', ' • ');

  // Astrology first: order the life areas by today's real energy for each (from the chart +
  // transits). Preferences are only a tie-breaker: if the user's top preference is within 5
  // points of the strongest area today, it leads; otherwise the chart's order stands. The
  // chart always decides the day; preferences never override it.
  const TOPIC_DOMAIN: Record<string, EnergyDomain['key']> = { love: 'Relationships', career: 'Career', health: 'Body', spiritual: 'Spiritual' };
  const prefs = profile.userPriorities ?? [];
  const orderedAreas = useMemo(() => {
    const scoreOf = (topic: string) => energy.domains.find((d) => d.key === TOPIC_DOMAIN[topic])?.score ?? 50;
    const sorted = [...LIFE_AREAS].sort((a, b) => scoreOf(b.topic) - scoreOf(a.topic));
    const prefTopic = prefs.length ? PRIORITY_TOPIC[prefs[0]] : null;
    if (prefTopic && sorted[0].topic !== prefTopic) {
      const gap = scoreOf(sorted[0].topic) - scoreOf(prefTopic);
      if (gap <= 5) {
        const pref = LIFE_AREAS.find((a) => a.topic === prefTopic);
        if (pref) return [pref, ...sorted.filter((a) => a.topic !== prefTopic)];
      }
    }
    return sorted;
  }, [energy.domains, prefs.join(',')]);

  // Per-domain daily teasers, seeded (user + date + domain), recomputed per calendar day.
  const areaTeasers = useMemo(
    () => orderedAreas.map((a) => lifeAreaTeaser(chart, new Date(), a.topic, `${uid}:${dayKey}:${a.topic}`)),
    [chart, uid, dayKey, orderedAreas],
  );

  // Japa streak, surfaced on the Daily Practice card. Refetches on focus so it stays live.
  const [japa, setJapa] = useState<JapaState | null>(null);
  useFocusEffect(useCallback(() => { loadJapa().then(setJapa); }, []));

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Text variant="caption" color={colors.gold} style={{ marginBottom: 12 }}>{dateLine}</Text>
        <Text variant="heroGreeting">{greeting()},</Text>
        <Text variant="heroGreeting" color={colors.gold}>{profile.name || 'friend'}</Text>
        {/* No transit subtitle here — Today's Guidance carries the day's message in plain English. */}
      </Animated.View>

      {/* Today's Guidance — the hero card, emotion-first (renamed from Tara's Message) */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <SectionLabel>Today's Guidance</SectionLabel>
        <Text variant="cardTitle" style={{ marginTop: 12, marginBottom: 4 }}>{daily.message.headline}</Text>
        <Text variant="body" color={colors.cream} style={{ marginTop: 10, opacity: 0.9 }}>{daily.guidance}</Text>
        <GoldButton label="Ask Tara about today" onPress={() => router.push('/(tabs)/tara')} style={{ marginTop: 18 }} />
      </Card>

      {/* Today's Cosmic Events — the compact daily snapshot: facts at a glance, no explanations.
          The panchāṅga interpretation (5 elements + universal/personal meaning) lives on Daily
          Insights; the full per-day analysis lives in the Vedic Calendar. Nothing repeats. */}
      <Card style={{ marginBottom: spacing.lg }}>
        <SectionLabel>Today's Cosmic Events</SectionLabel>
        {renderGrid(cells)}

        {/* Second group — Dasha / Transit / Moon phase (values not already in the grid). */}
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
        {orderedAreas.map((s, i) => (
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

      {/* 5b. Weekly & Monthly Guidance — premium forecast; free sees a locked entry teaser */}
      <Pressable onPress={() => router.push('/insights/forecast' as any)}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Text style={{ fontSize: 22 }}>🗓️</Text>
              <View style={{ flex: 1 }}>
                <Text variant="serif" style={{ fontSize: 16 }}>Weekly & Monthly Guidance</Text>
                <Text variant="tiny" color={colors.muted} style={{ fontSize: 12, marginTop: 2 }}>
                  {isPremium ? 'Your week & month ahead, always current' : '✦ Premium · your week & month ahead'}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </View>
        </Card>
      </Pressable>

      {/* 6b. Vedic Calendar — embedded month grid; tapping a day updates the detail below */}
      <SectionLabel>Vedic Calendar</SectionLabel>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}><Text style={styles.calArrow}>‹</Text></Pressable>
        <Text variant="serif" style={{ fontSize: 18 }}>{monthLabel}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={12}><Text style={styles.calArrow}>›</Text></Pressable>
      </View>
      <Card style={{ marginTop: 12, marginBottom: spacing.md, paddingHorizontal: 8, paddingVertical: 10 }}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <View key={i} style={styles.calCell}><Text variant="tiny" color={colors.muted} style={{ fontSize: 11 }}>{d}</Text></View>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((c: DayCell, di) => {
              const m = c.marker;
              const icon = m.observance?.kind === 'festival' ? '🪔' : m.observance?.kind === 'sankranti' ? '☀' : m.yogaMajor ? '⭐' : '';
              const isSel = c.inMonth && sameDay(c.date, selectedDate);
              return (
                <Pressable
                  key={di}
                  onPress={() => c.inMonth && setSelectedDate(c.date)}
                  style={[styles.calCell, c.isToday && !isSel && styles.calCellToday, isSel && styles.calCellSelected]}
                  disabled={!c.inMonth}
                >
                  <Text
                    variant="tiny"
                    color={!c.inMonth ? colors.mutedDim : isSel ? colors.bg : c.isToday ? colors.gold : colors.cream}
                    style={{ fontSize: 13.5, fontWeight: c.isToday || isSel ? '700' : '400' }}
                  >
                    {c.day}
                  </Text>
                  <View style={styles.markerRow}>
                    {m.special ? <View style={[styles.dot, { backgroundColor: DOT_COLOR[m.special] }]} /> : <View style={styles.dot} />}
                    {icon ? <Text style={{ fontSize: 8.5 }}>{icon}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>
      <View style={styles.legend}>
        {(['amavasya', 'purnima', 'ekadashi'] as const).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: DOT_COLOR[k] }]} />
            <Text variant="tiny" color={colors.muted} style={{ fontSize: 11 }}>{DOT_LABEL[k]}</Text>
          </View>
        ))}
        <View style={styles.legendItem}><Text style={{ fontSize: 11 }}>🪔</Text><Text variant="tiny" color={colors.muted} style={{ fontSize: 11 }}>Festival</Text></View>
        <View style={styles.legendItem}><Text style={{ fontSize: 11 }}>⭐</Text><Text variant="tiny" color={colors.muted} style={{ fontSize: 11 }}>Auspicious yoga</Text></View>
      </View>

      {/* 6c. Selected day detail — updates in place when a calendar day is tapped */}
      <Card style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
        <Text variant="serif" style={{ fontSize: 18, marginBottom: 2 }}>{dayInfo.dateLabel}</Text>
        <DetailField label="Tithi" value={dayInfo.tithi} note={dayInfo.tithiMeaning} />
        <DetailField label="Nakshatra" value={dayInfo.nakshatra} note={dayInfo.nakshatraMeaning} />
        <DetailField label="Yoga" value={dayInfo.yoga} note={dayInfo.yogaNote} />
        {dayInfo.observance ? (
          <DetailField
            label={dayInfo.observance.kind === 'festival' ? 'Festival' : 'Observance'}
            value={dayInfo.observance.name}
            note={dayInfo.observance.significance}
          />
        ) : null}

        <Text variant="eyebrow" color={colors.gold} style={styles.groupLabel}>Best hours</Text>
        {dayInfo.bestHours.map((b) => (
          <View key={b.area} style={styles.hourRow}>
            <Text variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>{b.area}</Text>
            <Text variant="tiny" color={b.window ? colors.goldSoft : colors.mutedDim} style={{ fontSize: 13 }}>{b.window ?? 'Set birth place'}</Text>
          </View>
        ))}

        <Text variant="eyebrow" color={colors.gold} style={styles.groupLabel}>Muhūrta windows</Text>
        <View style={styles.hourRow}>
          <Text variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>Abhijit (auspicious)</Text>
          <Text variant="tiny" color={dayInfo.abhijit ? colors.sage : colors.mutedDim} style={{ fontSize: 13 }}>{dayInfo.abhijit ?? 'Set birth place'}</Text>
        </View>
        <View style={styles.hourRow}>
          <Text variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>Rāhukālam (avoid)</Text>
          <Text variant="tiny" color={dayInfo.rahukalam ? colors.terra : colors.mutedDim} style={{ fontSize: 13 }}>{dayInfo.rahukalam ?? 'Set birth place'}</Text>
        </View>
      </Card>

      {/* 6d. Muhūrta Planner — purpose selector + best upcoming date (premium) */}
      <SectionLabel>Muhūrta Planner</SectionLabel>
      <Text variant="tiny" color={colors.muted} style={{ marginTop: 2, fontSize: 12.5 }}>Plan the right moment. What are you starting?</Text>
      <View style={styles.purposeRow}>
        {PURPOSES.map((p) => {
          const on = purpose === p.key;
          return (
            <Pressable key={p.key} onPress={() => setPurpose(p.key)} style={[styles.chip, on && styles.chipOn]}>
              <Text variant="tiny" color={on ? colors.bg : colors.muted} style={{ fontSize: 12.5, fontWeight: on ? '700' : '500' }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {!isPremium ? (
        <Card style={{ marginTop: 12, marginBottom: spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, color: colors.gold }}>✦</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
            Auspicious dates for what you're planning, tuned to your own chart. Part of Tara Premium.
          </Text>
          <Pressable onPress={() => router.push('/paywall')} hitSlop={8} style={{ marginTop: 12 }}>
            <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 13 }}>Unlock Premium →</Text>
          </Pressable>
        </Card>
      ) : !chart ? (
        <Card style={{ marginTop: 12, marginBottom: spacing.lg, alignItems: 'center' }}>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, textAlign: 'center', lineHeight: 19 }}>
            Add your birth details to find dates tuned to your own chart.
          </Text>
        </Card>
      ) : (
        <>
          {topMuhurta ? (
            <Pressable onPress={() => router.push('/muhurta')}>
              <Card style={{ marginTop: 12 }}>
                <Text variant="tiny" color={colors.muted} style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' }}>Best upcoming window</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text variant="serif" style={{ fontSize: 17 }}>{topMuhurta.dateLabel}</Text>
                  <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 12.5, fontWeight: '700' }}>{topMuhurta.quality} · {topMuhurta.score}/100</Text>
                </View>
                <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 12, marginTop: 4 }}>{topMuhurta.tithi} · {topMuhurta.nakshatra} · {topMuhurta.yoga}</Text>
                {topMuhurta.reasons[0] ? (
                  <Text variant="tiny" color={colors.cream} style={{ fontSize: 12.5, lineHeight: 17, marginTop: 8 }}>✓ {topMuhurta.reasons[0]}</Text>
                ) : null}
              </Card>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push('/muhurta')} hitSlop={6} style={{ marginTop: 12, marginBottom: spacing.lg }}>
            <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 13 }}>View all Muhūrtas →</Text>
          </Pressable>
        </>
      )}

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

// One labeled field in the selected-day detail card (label • value • one-line meaning).
function DetailField({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10, letterSpacing: 0.5 }}>{label}</Text>
      <Text variant="serif" style={{ fontSize: 15, color: colors.goldSoft, marginTop: 2 }}>{value}</Text>
      <Text variant="tiny" color={colors.cream} style={{ fontSize: 12.5, lineHeight: 18, marginTop: 4 }}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header hero + section labels + guidance now use the unified type scale (variants
  // heroGreeting / sectionHeader / cardTitle / body), so their ad-hoc styles are gone.
  // Cosmic events value (prominent)
  eventValue: { fontSize: 14, fontWeight: '600' },
  connectRow: {
    marginTop: 12, paddingTop: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  journalPrompt: { fontSize: 16, marginTop: 10, lineHeight: 25, color: colors.cream },
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
  // Embedded Vedic Calendar
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
  calArrow: { fontSize: 28, color: colors.gold, lineHeight: 30, paddingHorizontal: 10 },
  weekRow: { flexDirection: 'row' },
  calCell: { flex: 1, aspectRatio: 0.92, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingTop: 4 },
  calCellToday: { backgroundColor: 'rgba(205,163,73,0.12)', borderWidth: 1, borderColor: colors.line },
  calCellSelected: { backgroundColor: colors.gold, borderWidth: 1, borderColor: colors.gold },
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3, height: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  groupLabel: { fontSize: 10.5, letterSpacing: 0.6, marginTop: 20, marginBottom: 6 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)' },
  // Muhūrta purpose chips
  purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
});
