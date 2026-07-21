// app/insights/checkin-saved.tsx
// Confirmation after saving a Daily Check-in. Done returns Home; back-swipe returns to the
// journal (this screen is pushed on top of it). Accuracy can be rated here too — it upserts
// straight to today's daily_checkin row.
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, GoldButton } from '@/components/ui';
import { saveCheckin } from '@/lib/checkin';
import { colors, radius, spacing } from '@/theme';

const REPLAY = ['Accurate', 'Somewhat Accurate', 'Not Accurate'];

export default function CheckinSaved() {
  const { accuracy } = useLocalSearchParams<{ accuracy?: string }>();
  const [replay, setReplay] = useState(accuracy || '');

  const pick = (r: string) => { setReplay(r); saveCheckin({ accuracy: r }); };
  const done = () => router.dismissTo('/(tabs)/home' as any);

  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <Pressable onPress={done} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
        <Text variant="body" color={colors.muted}>✕ Close</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={{ fontSize: 34, lineHeight: 44, color: colors.gold }}>✦</Text>
        <Text variant="serif" style={{ fontSize: 24, marginTop: 10, textAlign: 'center' }}>Entry saved</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
          Thank you — come back tomorrow to journal your feelings.
        </Text>

        {/* Accuracy — reflects an earlier rating, or lets you rate now. */}
        <View style={{ alignSelf: 'stretch', marginTop: 30 }}>
          <Text variant="eyebrow" color={colors.muted} style={{ textAlign: 'center' }}>How accurate was Tara today?</Text>
          <View style={styles.opts}>
            {REPLAY.map((r) => (
              <Pressable key={r} onPress={() => pick(r)} style={[styles.opt, replay === r && styles.optOn]}>
                <Text variant="tiny" color={replay === r ? '#1a1018' : colors.cream}>{r}</Text>
              </Pressable>
            ))}
          </View>
          {replay ? (
            <Text variant="tiny" color={colors.sage} style={{ marginTop: 10, textAlign: 'center' }}>
              Thank you — Tara learns from this.
            </Text>
          ) : null}
        </View>

        <View style={{ alignSelf: 'stretch', marginTop: 30, paddingHorizontal: spacing.xl }}>
          <GoldButton label="Done" onPress={done} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  opts: { flexDirection: 'row', gap: 8, marginTop: 12 },
  opt: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  optOn: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft },
});
