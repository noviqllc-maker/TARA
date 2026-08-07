// app/report/year-ahead.tsx
// "Your Year Ahead" — a living 12-month view for owners of the Year Ahead shop report.
// Ownership-gated via `owns` (NOT isPremium). All content is computed deterministically
// from the engine (computeYearAhead) starting at the current month, so it's always fresh.
import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GoldButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { computeYearAhead, YearMonth } from '@/lib/yearAhead';
import { colors, radius, spacing } from '@/theme';

export default function YearAhead() {
  const chart = useChart();
  const { owns } = useSubscription();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = __DEV__ && preview === '1';
  const owned = isPreview || owns('yearaheadtarareport1');

  // Recomputed each mount from "today", so the report stays current on every open.
  const months = useMemo(() => (chart ? computeYearAhead(chart) : []), [chart]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const expandedKey = openKey ?? months[0]?.key ?? null; // current month expanded by default

  if (!chart) {
    return <Msg title="Add your birth details" body="Your Year Ahead is built from your birth chart. Add your date, time, and place of birth first." cta="Go back" onCta={() => router.back()} />;
  }
  if (!owned) {
    return <Msg title="Locked" body="Unlock Year Ahead from the Shop to open your living 12-month view." cta="Go to Shop" onCta={() => router.replace('/(tabs)/profile')} />;
  }

  return (
    <Screen>
      <SubHeader eyebrow={isPreview ? 'Preview · dev' : 'Year Ahead'} title="Your Year Ahead" />
      <Text variant="tiny" color={colors.muted} style={{ marginBottom: 16, lineHeight: 18 }}>
        Your next 12 months, month by month: always current, computed fresh from your chart each time you open it.
      </Text>

      {months.map((m, i) => (
        <MonthCard key={m.key} month={m} index={i} open={expandedKey === m.key} onToggle={() => setOpenKey(expandedKey === m.key ? '' : m.key)} />
      ))}

      <Disclaimer />
    </Screen>
  );
}

const AREA_LABEL: [keyof YearMonth['lifeAreas'], string][] = [['career', 'Career'], ['love', 'Love'], ['money', 'Money']];

function MonthCard({ month, index, open, onToggle }: { month: YearMonth; index: number; open: boolean; onToggle: () => void }) {
  const areas = AREA_LABEL.filter(([k]) => month.lifeAreas[k]);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(400)}>
      <Card solid={open} glow={open && index === 0} style={{ marginBottom: 12 }}>
        <Pressable onPress={onToggle} hitSlop={4}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text variant="serif" style={{ fontSize: 18 }}>{month.label}{index === 0 ? '  ·  this month' : ''}</Text>
              <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 3, fontSize: 12 }}>{month.dashaLabel} · {month.strength}/100</Text>
            </View>
            <Text style={{ color: colors.gold, fontSize: 16 }}>{open ? '▾' : '▸'}</Text>
          </View>

          {/* Strength bar */}
          <View style={styles.track}><View style={[styles.fill, { width: `${month.strength}%` }]} /></View>

          {/* Collapsed preview = this month's DIFFERENTIATOR, so scanning the list shows
              twelve distinct months rather than the same dasha line twelve times. */}
          {!open && (
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }} numberOfLines={2}>{month.differentiator}</Text>
          )}
        </Pressable>

        {open && (
          <View style={{ marginTop: 12 }}>
            {month.transition ? (
              <View style={styles.event}>
                <Text variant="tiny" color={colors.gold} style={{ fontWeight: '700', fontSize: 12 }}>✦ {month.transition}</Text>
              </View>
            ) : null}

            <Text variant="body" color={colors.cream} style={{ fontSize: 14.5, lineHeight: 22 }}>{month.theme}</Text>

            {month.keyDates.length ? (
              <View style={{ marginTop: 16 }}>
                <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10.5 }}>Key dates</Text>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {month.keyDates.map((k) => (
                    <View key={k.date + k.text} style={{ flexDirection: 'row' }}>
                      <Text variant="tiny" color={colors.gold} style={{ width: 74, fontSize: 12, fontWeight: '700' }}>{k.date}</Text>
                      <Text variant="tiny" color={colors.cream} style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}>{k.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {areas.length ? (
              <View style={{ marginTop: 16 }}>
                <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10.5 }}>Life areas</Text>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {areas.map(([k, label]) => (
                    <View key={k} style={{ flexDirection: 'row' }}>
                      <Text variant="tiny" color={colors.goldSoft} style={{ width: 60, fontSize: 12, fontWeight: '600' }}>{label}</Text>
                      <Text variant="tiny" color={colors.cream} style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}>{month.lifeAreas[k]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {month.transits.length ? (
              <View style={{ marginTop: 16 }}>
                <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10.5 }}>Major transits</Text>
                <View style={{ marginTop: 6, gap: 4 }}>
                  {month.transits.map((t) => (
                    <Text key={t} variant="tiny" color={colors.cream} style={{ fontSize: 12.5 }}>• {t}</Text>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: 16 }}>
              <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10.5 }}>Timing windows</Text>
              <View style={styles.chips}>
                {month.windows.map((w) => (
                  <View key={w} style={styles.chip}><Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 11.5 }}>{w}</Text></View>
                ))}
              </View>
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

function Msg({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void }) {
  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <View style={styles.center}>
        <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 10 }}>Year Ahead</Text>
        <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>{title}</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>{body}</Text>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
          <GoldButton label={cta} onPress={onCta} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.gold },
  event: {
    marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(205,163,73,0.35)', backgroundColor: 'rgba(205,163,73,0.08)',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 11, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
});
