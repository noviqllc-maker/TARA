// app/practice/observances.tsx
// Observance calendar (free, no entitlement checks). The next 30 days of Vedic markers —
// Ekādaśī, Pūrṇimā, Amāvasyā, Sankrānti, and the major festivals derivable from the engine.
// Each entry is INFORMATIONAL: it describes tradition and never instructs the reader.
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { computeObservances, Observance, ObservanceKind } from '@/lib/observances';
import { colors, radius, spacing } from '@/theme';

const GLYPH: Record<ObservanceKind, string> = {
  ekadashi: '◔', purnima: '○', amavasya: '●', sankranti: '☉', festival: '✦',
};
const KIND_LABEL: Record<ObservanceKind, string> = {
  ekadashi: 'Ekādaśī', purnima: 'Full Moon', amavasya: 'New Moon', sankranti: 'Sankrānti', festival: 'Festival',
};

export default function Observances() {
  const list = useMemo(() => computeObservances(new Date(), 30), []);

  return (
    <Screen>
      <SubHeader eyebrow="Practice · Calendar" title="Observances" />
      <Text variant="tiny" color={colors.muted} style={{ marginBottom: spacing.lg, lineHeight: 18 }}>
        The next 30 days of lunar and solar observances, computed from the sky. Descriptions are shared in the spirit of tradition — informational, never prescriptive.
      </Text>

      {list.length === 0 ? (
        <Card><Text variant="tiny" color={colors.muted}>No marked observances fall in the next 30 days.</Text></Card>
      ) : (
        list.map((o, i) => <Row key={o.key} o={o} index={i} />)
      )}

      <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: spacing.lg, fontStyle: 'italic', lineHeight: 17 }}>
        Dates are computed from the panchānga and may differ by a day from your local almanac.
      </Text>
    </Screen>
  );
}

function Row({ o, index }: { o: Observance; index: number }) {
  const highlight = o.daysAway === 0;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 30).duration(320)}>
      <Card solid={highlight} glow={highlight} style={{ marginBottom: 12, borderColor: highlight ? colors.gold : colors.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18, color: colors.goldSoft }}>{GLYPH[o.kind]}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="serif" style={{ fontSize: 16 }}>{o.name}</Text>
            <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 11.5, marginTop: 2 }}>
              {o.dateLabel} · {highlight ? 'Today' : `in ${o.daysAway} day${o.daysAway === 1 ? '' : 's'}`}
            </Text>
          </View>
          <View style={styles.kindTag}><Text variant="tiny" color={colors.muted} style={{ fontSize: 9.5, letterSpacing: 0.3 }}>{KIND_LABEL[o.kind]}</Text></View>
        </View>

        <Text variant="tiny" color={colors.cream} style={{ marginTop: 12, fontSize: 13, lineHeight: 20 }}>{o.significance}</Text>

        <View style={styles.practice}>
          <Text variant="tiny" color={colors.gold} style={{ fontSize: 10, letterSpacing: 0.4, marginBottom: 4 }}>TRADITIONAL PRACTICE</Text>
          <Text variant="tiny" color={colors.muted} style={{ fontSize: 12.5, lineHeight: 18 }}>{o.practice}</Text>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  kindTag: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 },
  practice: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
});
