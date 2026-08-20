// app/insights/forecast.tsx
// "Weekly & Monthly Guidance" — a premium (isPremium-gated) rolling forecast. WEEK AHEAD:
// 7 expandable day cards with a day-strength bar, headline, reading, and an Ask-Tara bridge.
// MONTH AHEAD: month theme, real key dates, opportunity windows, and watch periods. All
// content is computed deterministically from the chart (computeForecast) and recomputed each
// open, so it's always current. Free users see a locked teaser → the paywall.
import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, Eyebrow, GoldButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { computeForecast, ForecastDay, ForecastMark } from '@/lib/forecast';
import { PREMIUM_BENEFITS } from '@/lib/premium';
import { setAskDraft } from '@/lib/askDraft';
import { colors, spacing } from '@/theme';

const askWhy = (q: string) => { setAskDraft(q); router.push('/(tabs)/tara'); };

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
    // Locked teaser: the 7-day strength strip is visible (a real preview), the readings and
    // the month view are held behind the paywall. No premium copy leaks into the free tier.
    const preview = forecast?.week ?? [];
    return (
      <Screen>
        <SubHeader eyebrow="Guidance" title="Weekly & Monthly Guidance" />
        <Text variant="tiny" color={colors.muted} style={{ marginBottom: 16, lineHeight: 18 }}>
          Your week and month ahead: day by day, always current, computed fresh from your chart.
        </Text>

        {preview.length ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Eyebrow>The week ahead · a glance</Eyebrow>
            <View style={{ marginTop: 12, gap: 10 }}>
              {preview.map((d) => (
                <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text variant="tiny" color={colors.muted} style={{ width: 96, fontSize: 12 }}>{d.rel}</Text>
                  <View style={styles.trackSm}><View style={[styles.fill, { width: `${d.strength}%` }]} /></View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card solid glow style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, color: colors.gold }}>✦</Text>
          <Text variant="serif" style={{ fontSize: 19, marginTop: 8, textAlign: 'center' }}>Unlock your full forecast</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
            Daily readings, key dates, opportunity windows and watch periods, for the week and the month ahead.
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
      <Text variant="tiny" color={colors.muted} style={{ marginBottom: 16, lineHeight: 18 }}>
        The rhythm of your next seven days and the month beyond: when to push, when to rest, and when to make your move. Always current, built from your chart.
      </Text>

      {/* WEEK AHEAD */}
      <View style={{ marginBottom: 10 }}><Eyebrow>The Week Ahead</Eyebrow></View>
      {week.map((d, i) => (
        <DayCard key={d.key} day={d} index={i} open={openKey === d.key} onToggle={() => setOpenKey(openKey === d.key ? null : d.key)} />
      ))}

      {/* MONTH AHEAD */}
      <View style={{ height: spacing.lg }} />
      <Eyebrow>The Month Ahead</Eyebrow>
      <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, marginBottom: 12, fontSize: 12 }}>{month.label} · {month.strengthLabel}</Text>

      <Card solid glow style={{ marginBottom: 12 }}>
        <View style={styles.trackSm}><View style={[styles.fill, { width: `${month.strength}%` }]} /></View>
        <Text variant="body" color={colors.cream} style={{ fontSize: 14.5, lineHeight: 22, marginTop: 12 }}>{month.theme}</Text>
      </Card>

      <MarkList label="Key dates" color={colors.gold} marks={month.keyDates} />
      <MarkList label="Opportunity windows" color={colors.sage} marks={month.opportunities} />
      <MarkList label="Move carefully" color={colors.terra} marks={month.watch} />

      <View style={{ height: 8 }} />
      <Pressable onPress={() => askWhy(`What matters most for me over the next month, from ${month.label}?`)} hitSlop={6} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
        <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 12.5 }}>Ask Tara about the month →</Text>
      </Pressable>

      <Disclaimer />
    </Screen>
  );
}

function DayCard({ day, index, open, onToggle }: { day: ForecastDay; index: number; open: boolean; onToggle: () => void }) {
  const [showWhy, setShowWhy] = useState(false);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(400)}>
      <Card solid={open} glow={open && index === 0} style={{ marginBottom: 10 }}>
        <Pressable onPress={onToggle} hitSlop={4}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text variant="serif" style={{ fontSize: 16.5 }}>
                {day.glyph}  {day.rel}
              </Text>
              <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 2, fontSize: 11.5 }}>{day.label} · {day.scoreLabel}</Text>
            </View>
            <Text style={{ color: colors.gold, fontSize: 15 }}>{open ? '▾' : '▸'}</Text>
          </View>

          <View style={styles.trackSm}><View style={[styles.fill, { width: `${day.strength}%` }]} /></View>

          {!open && (
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }} numberOfLines={1}>{day.headline}</Text>
          )}
        </Pressable>

        {open && (
          <View style={{ marginTop: 12 }}>
            <Text variant="body" color={colors.cream} style={{ fontSize: 14, lineHeight: 22 }}>{day.reading}</Text>
            {day.bestFor.length ? (
              <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 10, fontSize: 12.5 }}>Best for: {day.bestFor.join(', ')}</Text>
            ) : null}

            {/* Why this? — reveals the technical breakdown inline; the reading itself stays plain */}
            <Pressable onPress={() => setShowWhy((v) => !v)} hitSlop={6} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
              <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 12.5 }}>{showWhy ? 'Hide the why ▾' : 'Why this? ▸'}</Text>
            </Pressable>
            {showWhy ? (
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, fontSize: 12, lineHeight: 18 }}>{day.mechanics}</Text>
            ) : null}

            <Pressable onPress={() => askWhy(day.question)} hitSlop={6} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
              <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 12.5 }}>Ask Tara →</Text>
            </Pressable>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

function MarkList({ label, color, marks }: { label: string; color: string; marks: ForecastMark[] }) {
  if (!marks.length) return null;
  return (
    <Card style={{ marginBottom: 12 }}>
      <Eyebrow color={color}>{label}</Eyebrow>
      <View style={{ marginTop: 10, gap: 9 }}>
        {marks.map((m) => (
          <View key={m.date + m.text} style={{ flexDirection: 'row' }}>
            <Text variant="tiny" color={color} style={{ width: 92, fontSize: 11.5, fontWeight: '700' }}>{m.date}</Text>
            <Text variant="tiny" color={colors.cream} style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}>{m.text}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  trackSm: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.gold },
});
