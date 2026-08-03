// app/practice/index.tsx
// Practice Hub — the home for daily devotional practice. All free, no entitlement checks.
// Deterministic, engine-computed: Japa/Mantra, Observances, Evening Ritual, Sankalpa (on
// window days), Today's Teaching (Svādhyāya), and Mauna (Amāvasyā / Saturdays).
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { useDailyContent } from '@/hooks/useDailyContent';
import { useAuth } from '@/hooks/useAuth';
import { computeCosmicEvents } from '@/lib/panchanga';
import { dayMantra } from '@/lib/mantras';
import { computeObservances, todayObservance, Observance, ObservanceKind } from '@/lib/observances';
import { loadJapa, loadEvening, loadMauna, JapaState, EveningState, MaunaState } from '@/lib/practice';
import { openSankalpaFor, Sankalpa } from '@/lib/sankalpa';
import { teachingForDate } from '@/lib/svadhyaya';
import { colors, radius, spacing } from '@/theme';

const SANKALPA_WINDOWS: ObservanceKind[] = ['amavasya', 'purnima', 'sankranti', 'ekadashi'];

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PracticeHub() {
  const chart = useChart();
  const daily = useDailyContent();
  const { session } = useAuth();
  const uid = session?.user?.id || 'anon';
  const now = useMemo(() => new Date(), []);
  const dayKey = now.toDateString();

  const cosmic = useMemo(() => computeCosmicEvents(chart, now), [chart, dayKey]);
  const mantra = useMemo(() => dayMantra(now), [dayKey]);
  const today = useMemo(() => todayObservance(now), [dayKey]);
  const upcoming = useMemo<Observance | null>(() => (today ? null : computeObservances(now, 30).find((o) => o.daysAway > 0) ?? null), [today, dayKey]);
  const obs = today ?? upcoming;
  const teaching = useMemo(() => teachingForDate(uid, now).teaching, [uid, dayKey]);
  // Mauna is offered only on Amāvasyā and on Saturdays — invitation, never a nag.
  const maunaDay = (today?.kind === 'amavasya') || now.getDay() === 6;

  const [japa, setJapa] = useState<JapaState | null>(null);
  const [eve, setEve] = useState<EveningState | null>(null);
  const [mauna, setMauna] = useState<MaunaState | null>(null);
  const sankalpaWindow = today && SANKALPA_WINDOWS.includes(today.kind) ? today : null;
  const [revisit, setRevisit] = useState<Sankalpa | null>(null);
  useEffect(() => {
    loadJapa().then(setJapa);
    loadEvening().then(setEve);
    if (maunaDay) loadMauna().then(setMauna);
    if (sankalpaWindow) openSankalpaFor(sankalpaWindow.kind).then(setRevisit);
  }, [sankalpaWindow?.kind, maunaDay]);

  return (
    <Screen>
      <SubHeader eyebrow="Practice" title="Daily Practice" />

      {/* Date + tithi header */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text color={colors.gold} style={{ fontSize: 13.5, fontWeight: '500', letterSpacing: 0.2 }}>
          {DOW[now.getDay()]} • {MON[now.getMonth()]} {now.getDate()}
        </Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>
          {cosmic.paksha ? `${cosmic.paksha} · ` : ''}{cosmic.tithi} · {cosmic.vara}
        </Text>
      </View>

      {/* Today's Mantra → japa */}
      <Animated.View entering={FadeInDown.duration(360)}>
        <Pressable onPress={() => router.push('/practice/japa' as any)}>
          <Card solid glow style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="eyebrow" color={colors.gold}>Today's Mantra</Text>
              <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
            </View>
            <Text style={styles.devanagari}>{mantra.devanagari}</Text>
            <Text variant="serif" style={{ fontSize: 16, marginTop: 4 }}>{mantra.translit}</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 6, lineHeight: 17 }}>{mantra.meaning}</Text>
            <View style={styles.mantraFoot}>
              <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 11.5 }}>{mantra.glyph} {mantra.graha} · {mantra.day}</Text>
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5 }}>
                {japa ? (japa.today > 0 ? `${japa.today} mālā today` : 'Begin a mālā →') : 'Begin a mālā →'}
              </Text>
            </View>
            {japa && japa.streak > 0 ? (
              <Text variant="tiny" color={colors.saffron} style={{ marginTop: 8, fontSize: 11.5 }}>✦ {japa.streak}-day streak</Text>
            ) : null}
          </Card>
        </Pressable>
      </Animated.View>

      {/* Evening Ritual */}
      <Animated.View entering={FadeInDown.delay(40).duration(360)}>
        <Pressable onPress={() => router.push('/practice/evening' as any)}>
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Text style={{ fontSize: 20 }}>🌙</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="serif" style={{ fontSize: 16 }}>Evening Reflection</Text>
                  <Text variant="tiny" color={colors.muted} style={{ fontSize: 12, marginTop: 2 }}>
                    {eve?.doneToday ? 'Closed today ✦' : 'A gentle 4-step wind-down'}
                    {eve && eve.streak > 0 ? ` · ${eve.streak}-day streak` : ''}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
            </View>
          </Card>
        </Pressable>
      </Animated.View>

      {/* Sankalpa — invite on an auspicious window, else an entry to intentions/history */}
      <Animated.View entering={FadeInDown.delay(80).duration(360)}>
        <Pressable onPress={() => router.push('/practice/sankalpa' as any)}>
          <Card solid={!!sankalpaWindow} glow={!!sankalpaWindow} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="eyebrow" color={colors.gold}>Sankalpa</Text>
              <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
            </View>
            {sankalpaWindow ? (
              <>
                <Text variant="serif" style={{ fontSize: 16, marginTop: 8 }}>Set a sankalpa under {sankalpaWindow.name}</Text>
                <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, fontSize: 12, lineHeight: 17 }}>
                  {revisit ? `And revisit your last one: “${revisit.text}”` : 'An auspicious window to name a short intention — an invitation, never an obligation.'}
                </Text>
              </>
            ) : (
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, fontSize: 12.5, lineHeight: 18 }}>
                Set short intentions on auspicious windows, and revisit them when the window returns.
              </Text>
            )}
          </Card>
        </Pressable>
      </Animated.View>

      {/* Today's / upcoming Observance */}
      {obs ? (
        <Animated.View entering={FadeInDown.delay(60).duration(360)}>
          <Pressable onPress={() => router.push('/practice/observances' as any)}>
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="eyebrow" color={colors.gold}>{today ? "Today's Observance" : 'Next Observance'}</Text>
                <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
              </View>
              <Text variant="serif" style={{ fontSize: 17, marginTop: 8 }}>{obs.name}</Text>
              <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 3, fontSize: 12 }}>
                {today ? 'Today' : `${obs.dateLabel} · in ${obs.daysAway} day${obs.daysAway === 1 ? '' : 's'}`}
              </Text>
              <Text variant="tiny" color={colors.cream} style={{ marginTop: 8, fontSize: 12.5, lineHeight: 18 }} numberOfLines={3}>{obs.significance}</Text>
              <Text variant="tiny" color={colors.gold} style={{ marginTop: 10, fontWeight: '600', fontSize: 12 }}>See the calendar →</Text>
            </Card>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Today's Teaching (Svādhyāya) */}
      <Animated.View entering={FadeInDown.delay(100).duration(360)}>
        <Pressable onPress={() => router.push('/practice/svadhyaya' as any)}>
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="eyebrow" color={colors.gold}>Today's Teaching</Text>
              <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
            </View>
            <Text variant="serif" style={{ fontSize: 16, marginTop: 8 }}>
              {teaching.type === 'shloka' ? teaching.citation : teaching.title}
            </Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 5, fontSize: 12.5, lineHeight: 18 }} numberOfLines={2}>
              {teaching.type === 'shloka' ? teaching.rendering : teaching.body}
            </Text>
          </Card>
        </Pressable>
      </Animated.View>

      {/* Mauna — offered only on Amāvasyā and Saturdays */}
      {maunaDay ? (
        <Animated.View entering={FadeInDown.delay(120).duration(360)}>
          <Pressable onPress={() => router.push('/practice/mauna' as any)}>
            <Card solid glow style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="eyebrow" color={colors.gold}>Mauna</Text>
                <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
              </View>
              <Text variant="tiny" color={colors.cream} style={{ marginTop: 8, fontSize: 12.5, lineHeight: 18 }}>
                Mauna — the practice of kept silence. A quiet space traditionally honoured on new-moon and Saturn’s day.
              </Text>
              <Text variant="tiny" color={mauna?.doneToday ? colors.saffron : colors.gold} style={{ marginTop: 10, fontWeight: '600', fontSize: 12.5 }}>
                {mauna?.doneToday ? 'Silence kept today ✦' : 'Begin 10 quiet minutes →'}
              </Text>
            </Card>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* A relational / digital-wellness nudge for today (engine/calendar-gated). */}
      {daily.relationalLine ? (
        <View style={styles.nudge}>
          <Text style={{ fontSize: 14 }}>🤝</Text>
          <Text variant="tiny" color={colors.cream} style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}>{daily.relationalLine}</Text>
        </View>
      ) : null}

      <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: spacing.lg, fontStyle: 'italic', lineHeight: 17 }}>
        Practice is offered in the spirit of tradition — described, never prescribed.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  devanagari: { fontSize: 30, color: colors.cream, marginTop: 14, lineHeight: 42 },
  mantraFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  nudge: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md, padding: 14,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  sectionLabel: { fontSize: 14, fontWeight: '500', marginTop: spacing.md, marginBottom: 12 },
});
