// src/components/FlatCard.tsx
// Secondary list item for the temple-material system: a marigold-tinted icon circle,
// bold label and muted description on a translucent dark surface — for stone backgrounds.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ds, type as t, space, radii } from '@/theme';

type Props = {
  icon?: React.ReactNode; // an SVG/glyph node; falls back to a marigold dot
  label: string;
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export default function FlatCard({ icon, label, description, onPress, right, style }: Props) {
  const body = (
    <View style={[styles.row, style]}>
      <View style={styles.iconCircle}>
        {icon ?? <View style={styles.dot} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.75 } : null)}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: ds.stoneSurface,
    borderColor: ds.hairline,
    borderWidth: 1,
    borderRadius: radii.chip,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: radii.pill,
    backgroundColor: ds.marigoldTint,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: ds.marigold },
  label: { fontFamily: t.bodyBold, fontSize: 15, color: ds.onStone },
  desc: { fontFamily: t.body, fontSize: 12.5, lineHeight: 18, color: ds.onStoneMuted, marginTop: 2 },
  chevron: { fontFamily: t.body, fontSize: 22, color: ds.marigold, marginLeft: space.sm },
});
