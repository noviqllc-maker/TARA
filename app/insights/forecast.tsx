// app/insights/forecast.tsx
// "Weekly & Monthly Guidance" — a premium (isPremium-gated) rolling forecast, presented as a
// genuine ARC, not seven stitched daily cards. WEEK: a story + energy shape + a 7-day arc bar
// + one line per day + best windows + one caution + a takeaway. MONTH: a scannable story + key
// dated events + strongest windows + cautions + a takeaway. All deterministic (computeForecast),
// recomputed each open. Free users see a locked teaser → the paywall.
import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, Eyebrow, GoldButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { computeForecast, WeekDay, ForecastMark } from '@/lib/forecast';
import { PREMIUM_BENEFITS } from '@/lib/premium';
import { setAskDraft } from '@/lib/askDraft';
import { colors, spacing } from '@/theme';

const askDay = (q: string) => { setAskDraft(q); router.push('/(tabs)/tara'); };
const dayPhrase = (d: WeekDay) => (d.rel === 'Today' ? 'today' : d.rel === 'Tomorrow' ? 'tomorrow' : `on ${d.dayName}`);

export default function Forecast() {
  const chart = useChart();
  const { isPremium } = useSubscription();
  const forecast = useMemo(() => (chart ? computeForecast(chart) : null), [chart]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!chart) {
    return (
      <Screen>
        <SubHeader eyebrow="Guidance" title="Weekly & Monthly Guidance" />
        <Card><Text variant="body">Add your birth details first. Your forecast is built from your chart.</Text></Card>
      </Screen>
    );
  }

  if (!isPremium || !forecast) {
    // Locked teaser: the 7-day energy arc is visible (a real preview); the story, windows, and
    // the month view are held behind the paywall. No premium copy leaks into the free tier.
    const preview = forecast?.week.days ?? [];
    return (
      <Screen>
        <SubHeader eyebrow="Guidance" title="Weekly & Monthly Guidance" />
        <Text variant="tiny" color={colors.muted} style={{ marginBottom: 16, lineHeight: 18 }}>
          Your week and month ahead, read as one arc: when to push, when to rest, and when to make your move.
        </Text>

        {preview.length ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Eyebrow>The week ahead · a glance</Eyebrow>
            <View style={{ marginTop: 14 }}><EnergyArc days={preview} /></View>
          </Card>
        ) : null}

        <Card solid glow style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, color: colors.gold }}>✦</Text>
          <Text variant="cardTitle" style={{ marginTop: 8, textAlign: 'center' }}>Unlock your full forecast</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
            The week's story and its strongest windows, plus the month ahead: key dates, opportunity windows, and what to watch.
          </Text>
          <View style={{ marginTop: 14, gap: 7, alignSelf: 'stretch' }}>
            {PREMIUM_BENEFITS.map((b) => (
              <View key={b} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={{ color: colors.gold, fontSize: 13 }}>✓</Text>
                <Text variant="tiny" color={colors.cream} style={{ fontSize: 12.5, flex: 1 }}>{b}</Text>
              </View>
            ))}
          </View>
          <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
            <GoldButton label="Unlock with Premium" onPress={() => router.push('/paywall')} />
          </View>
        </Card>

        <Disclaimer />
      </Screen>
    );
  }

  const { week, month } = forecast;

  return (
    <Screen>
      <SubHeader eyebrow="Guidance" title="Weekly & Monthly Guidance" />

      {/* ---- WEEK: the arc ---- */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Text variant="cardTitle">The Week Ahead</Text>
        <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>{week.weekRange} · {week.energyShape}</Text>
        <Text variant="body" color={colors.cream} style={{ marginTop: 12, opacity: 0.92 }}>{week.weekStory}</Text>
        <View style={{ marginTop: 16 }}><EnergyArc days={week.days} /></View>
      </Card>

      {/* One line per day, tap for the Ask-Tara bridge */}
      <Card style={{ marginBottom: spacing.lg, paddingVertical: 4 }}>
        {week.days.map((d, i) => (
          <Pressable
            key={d.key} onPress={() => setOpenKey(openKey === d.key ? null : d.key)} hitSlop={4}
            style={[styles.dayRow, i > 0 && styles.dayRowBorder]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="sectionHeader">{d.rel}</Text>
              <Text variant="caption" color={colors.muted}>{d.dateLabel}</Text>
            </View>
            <Text variant="body" color={colors.cream} style={{ marginTop: 4, opacity: 0.92 }}>{d.headline}</Text>
            {openKey === d.key ? (
              <Pressable onPress={() => askDay(`What should I focus on ${dayPhrase(d)}, ${d.dateLabel}?`)} hitSlop={6} style={{ marginTop: 8 }}>
                <Text variant="caption" color={colors.gold}>Ask Tara about this day →</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="sectionHeader" color={colors.sage}>Your Strongest Windows This Week</Text>
        <View style={{ marginTop: 10, gap: 10 }}>
          {week.bestWindows.map((w, i) => (
            <View key={i}>
              <Text variant="body" color={colors.gold} style={{ fontSize: 14 }}>{w.dateRange}</Text>
              <Text variant="secondaryBody" style={{ marginTop: 2 }}>{w.reason}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="sectionHeader" color={colors.terra}>Watch Out</Text>
        <Text variant="body" color={colors.cream} style={{ marginTop: 8, opacity: 0.92 }}>{week.watchOut}</Text>
      </Card>

      <Card solid style={{ marginBottom: spacing.xl }}>
        <Text variant="sectionHeader" color={colors.gold}>One Thing to Remember</Text>
        <Text variant="body" color={colors.goldSoft} style={{ marginTop: 8 }}>{week.oneThingToRemember}</Text>
      </Card>

      {/* ---- MONTH: scannable ---- */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Text variant="cardTitle">The Month Ahead</Text>
        <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>{month.monthRange} · {month.strengthLabel}</Text>
        <Text variant="body" color={colors.cream} style={{ marginTop: 12, opacity: 0.92 }}>{month.monthStory}</Text>
      </Card>

      <MarkList label="Key Dates" color={colors.gold} marks={month.keyDates} />
      <MarkList label="Your Strongest Windows" color={colors.sage} marks={month.strongestWindows} />
      <MarkList label="Watch Out" color={colors.terra} marks={month.watchOut} />

      <Card solid style={{ marginBottom: spacing.lg }}>
        <Text variant="sectionHeader" color={colors.gold}>This Month's Essence</Text>
        <Text variant="body" color={colors.goldSoft} style={{ marginTop: 8 }}>{month.oneThingToRemember}</Text>
      </Card>

      <Pressable onPress={() => askDay(`What matters most for me over the next month, from ${month.monthRange}?`)} hitSlop={6} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
        <Text variant="caption" color={colors.gold}>Ask Tara about the month →</Text>
      </Pressable>

      <Disclaimer />
    </Screen>
  );
}

// A compact 7-column energy arc: bar height ∝ each day's strength, labeled by weekday initial.
function EnergyArc({ days }: { days: WeekDay[] }) {
  return (
    <View style={styles.arcRow}>
      {days.map((d) => (
        <View key={d.key} style={styles.arcCol}>
          <View style={styles.arcTrack}>
            <View style={[styles.arcBar, { height: `${Math.max(10, Math.min(100, d.strength))}%` }]} />
          </View>
          <Text variant="tiny" color={colors.muted} style={{ fontSize: 10.5, marginTop: 5 }}>{d.dayName[0]}</Text>
        </View>
      ))}
    </View>
  );
}

function MarkList({ label, color, marks }: { label: string; color: string; marks: ForecastMark[] }) {
  if (!marks.length) return null;
  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <Text variant="sectionHeader" color={color}>{label}</Text>
      <View style={{ marginTop: 10, gap: 9 }}>
        {marks.map((m) => (
          <View key={m.date + m.text} style={{ flexDirection: 'row' }}>
            <Text variant="caption" color={color} style={{ width: 92, fontWeight: '700' }}>{m.date}</Text>
            <Text variant="secondaryBody" color={colors.cream} style={{ flex: 1 }}>{m.text}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  trackSm: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.gold },
  dayRow: { paddingVertical: 12, paddingHorizontal: 2 },
  dayRowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  arcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  arcCol: { flex: 1, alignItems: 'center' },
  arcTrack: { height: 52, width: 12, borderRadius: 6, backgroundColor: colors.line, justifyContent: 'flex-end', overflow: 'hidden' },
  arcBar: { width: '100%', borderRadius: 6, backgroundColor: colors.gold },
});
