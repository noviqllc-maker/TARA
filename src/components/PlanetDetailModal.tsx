// src/components/PlanetDetailModal.tsx
// Tap-a-planet detail sheet: eight chart-specific life-area fields for the selected planet,
// from composePlanetDetails. Bottom-sheet Modal (tap outside or × to close), app-themed.
import React from 'react';
import { View, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { BirthChart, PlanetPosition } from '@/lib/vedic';
import { composePlanetDetails, PlanetDetails } from '@/lib/composePlanetDetails';
import { colors, radius } from '@/theme';

const FIELDS: [keyof PlanetDetails, string][] = [
  ['career', 'Career'],
  ['marriage', 'Marriage & Partnership'],
  ['money', 'Money'],
  ['health', 'Health'],
  ['strength', 'Strength'],
  ['weakness', 'Growth Edge'],
  ['remedies', 'Traditional Supports'],
  ['currentTransit', 'Right Now'],
];

export default function PlanetDetailModal({
  planet, chart, onClose,
}: { planet: PlanetPosition | null; chart: BirthChart; onClose: () => void }) {
  const details = planet ? composePlanetDetails(chart, planet.name) : null;
  return (
    <Modal visible={!!planet} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          {planet && details ? (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text variant="serif" style={styles.title}>{planet.glyph}  {planet.name}{planet.retrograde ? ' ℞' : ''}</Text>
                  <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 2, fontSize: 12 }}>
                    {planet.sign} {planet.degree} · House {planet.house} · D9 {planet.navamsaSign}
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                  <Text style={styles.close}>×</Text>
                </Pressable>
              </View>
              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
                {FIELDS.map(([key, label]) => (
                  <View key={key} style={styles.field}>
                    <Text variant="eyebrow" color={colors.gold} style={styles.fieldLabel}>{label}</Text>
                    <Text variant="tiny" color={colors.cream} style={styles.fieldValue}>{details[key]}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 18, maxHeight: '82%',
    borderTopWidth: 1, borderColor: colors.line,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingBottom: 14, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  title: { fontSize: 21 },
  close: { fontSize: 30, color: colors.gold, lineHeight: 30, marginTop: -4 },
  field: { marginTop: 16 },
  fieldLabel: { fontSize: 10.5, letterSpacing: 0.6 },
  fieldValue: { fontSize: 13.5, lineHeight: 20, color: colors.cream, marginTop: 5 },
});
