// app/calendar.tsx
// Personalized Vedic month calendar. Each day shows a tithi color dot (Amāvasyā / Pūrṇimā /
// Ekādaśī), a 🪔 for a festival and a ⭐ for an auspicious yoga; tapping a day opens a detail
// sheet (tithi + nakshatra meaning, yoga, observance, best horā windows per life area, and the
// Abhijit / Rāhukālam muhūrta). Deterministic, no AI. Data from src/lib/calendar.ts.
import React, { useMemo, useState } from 'react';
import { View, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { buildMonth, dayDetail, DayCell, TithiSpecial } from '@/lib/calendar';
import { colors, radius, spacing } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOT_COLOR: Record<Exclude<TithiSpecial, null>, string> = {
  amavasya: colors.terra, purnima: colors.lav, ekadashi: colors.goldSoft,
};
const DOT_LABEL: Record<Exclude<TithiSpecial, null>, string> = {
  amavasya: 'Amāvasyā', purnima: 'Pūrṇimā', ekadashi: 'Ekādaśī',
};

export default function CalendarScreen() {
  const chart = useChart();
  const { profile } = useProfile();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<Date | null>(null);

  const { weeks, label } = useMemo(() => buildMonth(cursor.year, cursor.month, now), [cursor.year, cursor.month]);

  const location = profile.lat != null && profile.lon != null
    ? { lat: profile.lat, lon: profile.lon, tzOffsetMinutes: profile.tzOffsetMinutes }
    : undefined;
  const detail = useMemo(
    () => (selected ? dayDetail(selected, chart, location) : null),
    [selected, chart, location?.lat, location?.lon, location?.tzOffsetMinutes],
  );

  const shift = (delta: number) => setCursor(({ year, month }) => {
    const m = month + delta;
    return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
  });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Eyebrow>Vedic Calendar</Eyebrow>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text variant="tiny" color={colors.gold}>Close</Text></Pressable>
      </View>

      {/* Month header with prev/next */}
      <View style={styles.monthHeader}>
        <Pressable onPress={() => shift(-1)} hitSlop={12}><Text style={styles.arrow}>‹</Text></Pressable>
        <Text variant="screenTitle">{label}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={12}><Text style={styles.arrow}>›</Text></Pressable>
      </View>

      <Card style={{ marginTop: spacing.lg, paddingHorizontal: 8, paddingVertical: 10 }}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <View key={i} style={styles.cell}><Text variant="tiny" color={colors.muted} style={{ fontSize: 11 }}>{d}</Text></View>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((c: DayCell, di) => {
              const m = c.marker;
              const icon = m.observance?.kind === 'festival' ? '🪔' : m.observance?.kind === 'sankranti' ? '☀' : m.yogaMajor ? '⭐' : '';
              return (
                <Pressable
                  key={di}
                  onPress={() => c.inMonth && setSelected(c.date)}
                  style={[styles.cell, c.isToday && styles.cellToday]}
                  disabled={!c.inMonth}
                >
                  <Text
                    variant="tiny"
                    color={!c.inMonth ? colors.mutedDim : c.isToday ? colors.gold : colors.cream}
                    style={{ fontSize: 13.5, fontWeight: c.isToday ? '700' : '400' }}
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

      {/* Legend */}
      <View style={styles.legend}>
        {(['amavasya', 'purnima', 'ekadashi'] as const).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: DOT_COLOR[k] }]} />
            <Text variant="metadata" color={colors.muted}>{DOT_LABEL[k]}</Text>
          </View>
        ))}
        <View style={styles.legendItem}><Text style={{ fontSize: 11 }}>🪔</Text><Text variant="metadata" color={colors.muted}>Festival</Text></View>
        <View style={styles.legendItem}><Text style={{ fontSize: 11 }}>⭐</Text><Text variant="metadata" color={colors.muted}>Auspicious yoga</Text></View>
      </View>

      {/* Day detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={styles.sheet}>
            {detail ? (
              <>
                <View style={styles.sheetHeader}>
                  <Text variant="cardTitle" style={{ flex: 1 }}>{detail.dateLabel}</Text>
                  <Pressable onPress={() => setSelected(null)} hitSlop={12}><Text style={{ fontSize: 28, color: colors.gold }}>×</Text></Pressable>
                </View>
                <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
                  <Field label="Tithi" value={detail.tithi} note={detail.tithiMeaning} />
                  <Field label="Nakshatra" value={detail.nakshatra} note={detail.nakshatraMeaning} />
                  <Field label="Yoga" value={detail.yoga} note={detail.yogaNote} />
                  {detail.observance ? (
                    <Field label={detail.observance.kind === 'festival' ? 'Festival' : 'Observance'} value={detail.observance.name} note={detail.observance.significance} />
                  ) : null}

                  <Text variant="sectionHeader" color={colors.gold} style={styles.groupLabel}>Best hours</Text>
                  {detail.bestHours.map((b) => (
                    <View key={b.area} style={styles.hourRow}>
                      <Text variant="secondaryBody" color={colors.cream}>{b.area}</Text>
                      <Text variant="secondaryBody" color={b.window ? colors.goldSoft : colors.mutedDim}>{b.window ?? 'Set birth place'}</Text>
                    </View>
                  ))}

                  <Text variant="sectionHeader" color={colors.gold} style={styles.groupLabel}>Muhūrta windows</Text>
                  <View style={styles.hourRow}>
                    <Text variant="secondaryBody" color={colors.cream}>Abhijit (auspicious)</Text>
                    <Text variant="secondaryBody" color={detail.abhijit ? colors.sage : colors.mutedDim}>{detail.abhijit ?? 'Set birth place'}</Text>
                  </View>
                  <View style={styles.hourRow}>
                    <Text variant="secondaryBody" color={colors.cream}>Rāhukālam (avoid)</Text>
                    <Text variant="secondaryBody" color={detail.rahukalam ? colors.terra : colors.mutedDim}>{detail.rahukalam ?? 'Set birth place'}</Text>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Field({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text variant="caption" color={colors.muted}>{label}</Text>
      <Text variant="body" color={colors.goldSoft} style={{ marginTop: 2 }}>{value}</Text>
      <Text variant="secondaryBody" color={colors.cream} style={{ marginTop: 4 }}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, paddingHorizontal: 8 },
  arrow: { fontSize: 30, color: colors.gold, lineHeight: 32, paddingHorizontal: 8 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, aspectRatio: 0.92, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingTop: 4 },
  cellToday: { backgroundColor: 'rgba(205,163,73,0.12)', borderWidth: 1, borderColor: colors.line },
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3, height: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: spacing.lg, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 18, maxHeight: '84%', borderTopWidth: 1, borderColor: colors.line },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
  groupLabel: { marginTop: 20, marginBottom: 6 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)' },
});
