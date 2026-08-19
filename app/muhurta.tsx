// app/muhurta.tsx
// Personal Muhūrta Planner: pick a purpose, see the most favorable dates in the next 90 days
// (ranked from tithi / nakshatra / yoga / weekday and the live transits over the user's chart),
// tap a date for its time windows. Deterministic, no AI. Informational, not a substitute for a
// full muhūrta or professional (medical/legal/financial) advice.
import React, { useMemo, useState } from 'react';
import { View, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { PURPOSES, Purpose, findMuhurtaDates, muhurtaWindows, MuhurtaDate } from '@/lib/muhurtaPlanner';
import { colors, radius, spacing } from '@/theme';

const QUALITY_COLOR = { Excellent: colors.sage, Good: colors.goldSoft, Fair: colors.muted };

export default function MuhurtaScreen() {
  const chart = useChart();
  const { profile } = useProfile();
  const [purpose, setPurpose] = useState<Purpose>('marriage');
  const [selected, setSelected] = useState<MuhurtaDate | null>(null);

  const dates = useMemo(() => findMuhurtaDates(chart, purpose, 90, 5), [chart, purpose]);
  const location = profile.lat != null && profile.lon != null
    ? { lat: profile.lat, lon: profile.lon, tzOffsetMinutes: profile.tzOffsetMinutes }
    : undefined;
  const windows = useMemo(
    () => (selected && location ? muhurtaWindows(selected.date, purpose, location) : null),
    [selected, purpose, location?.lat, location?.lon, location?.tzOffsetMinutes],
  );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Eyebrow>Muhūrta Planner</Eyebrow>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text variant="tiny" color={colors.gold}>Close</Text></Pressable>
      </View>
      <Text variant="h2" style={{ marginTop: 6 }}>Favorable dates ahead</Text>
      <Text variant="tiny" style={{ marginTop: 8 }}>
        The most supportive days in the next 90 for what you are planning, from your chart and the panchāṅga.
      </Text>

      {/* Purpose selector */}
      <View style={styles.purposeRow}>
        {PURPOSES.map((p) => {
          const on = purpose === p.key;
          return (
            <Pressable key={p.key} onPress={() => { setPurpose(p.key); setSelected(null); }} style={[styles.chip, on && styles.chipOn]}>
              <Text variant="tiny" color={on ? colors.bg : colors.muted} style={{ fontSize: 12.5, fontWeight: on ? '700' : '500' }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!chart ? (
        <Card solid glow style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={{ fontSize: 22, color: colors.gold }}>✦</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
            Add your birth details to find dates tuned to your own chart.
          </Text>
        </Card>
      ) : (
        dates.map((d, i) => (
          <Pressable key={i} onPress={() => setSelected(d)}>
            <Card style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="serif" style={{ fontSize: 17 }}>{d.dateLabel}</Text>
                <View style={styles.qualityRow}>
                  <Text variant="tiny" color={QUALITY_COLOR[d.quality]} style={{ fontSize: 12.5, fontWeight: '700' }}>{d.quality}</Text>
                  <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5 }}>{d.score}/100</Text>
                </View>
              </View>
              <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 12, marginTop: 4 }}>
                {d.tithi} · {d.nakshatra} · {d.yoga}
              </Text>
              <View style={{ marginTop: 8, gap: 4 }}>
                {d.reasons.map((r, ri) => (
                  <Text key={ri} variant="tiny" color={colors.cream} style={{ fontSize: 12.5, lineHeight: 17 }}>✓ {r}</Text>
                ))}
                {d.cautions.map((c, ci) => (
                  <Text key={ci} variant="tiny" color={colors.terra} style={{ fontSize: 12.5, lineHeight: 17 }}>• {c}</Text>
                ))}
              </View>
              <Text variant="tiny" color={colors.gold} style={{ fontSize: 11.5, marginTop: 8 }}>Tap for time windows →</Text>
            </Card>
          </Pressable>
        ))
      )}

      <Disclaimer />

      {/* Time-windows sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={styles.sheet}>
            {selected ? (
              <>
                <View style={styles.sheetHeader}>
                  <Text variant="serif" style={{ fontSize: 18, flex: 1 }}>{selected.dateLabel} · time windows</Text>
                  <Pressable onPress={() => setSelected(null)} hitSlop={12}><Text style={{ fontSize: 28, color: colors.gold }}>×</Text></Pressable>
                </View>
                {windows ? (
                  <>
                    <Row label="Best hour for this" value={windows.bestHora} good />
                    <Row label="Abhijit (auspicious)" value={windows.abhijit} good />
                    <Row label="Rāhukālam (avoid)" value={windows.rahukalam} />
                  </>
                ) : (
                  <Text variant="tiny" color={colors.muted} style={{ marginTop: 14, lineHeight: 19 }}>
                    Set your birth place in Profile to see the day's exact time windows (they depend on your location's sunrise).
                  </Text>
                )}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Row({ label, value, good }: { label: string; value: string | null; good?: boolean }) {
  return (
    <View style={styles.winRow}>
      <Text variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>{label}</Text>
      <Text variant="tiny" color={value ? (good ? colors.sage : colors.terra) : colors.mutedDim} style={{ fontSize: 13, fontWeight: '600' }}>{value ?? 'n/a'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  qualityRow: { alignItems: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30, borderTopWidth: 1, borderColor: colors.line },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  winRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)' },
});
