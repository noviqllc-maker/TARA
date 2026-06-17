// app/(onboarding)/wellness.tsx
import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton, GhostButton, Eyebrow } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useHealth } from '@/hooks/useHealth';
import { colors, radius, spacing } from '@/theme';

const SOURCES = [
  { id: 'apple', name: 'Apple Health', icon: '♥', color: '#ff4d6d' },
  { id: 'google', name: 'Google Health', icon: '❤', color: '#4caf72' },
  { id: 'oura', name: 'Oura', icon: '◯', color: '#cda3ff' },
  { id: 'whoop', name: 'WHOOP', icon: '⬡', color: '#e8e8e8' },
  { id: 'fitbit', name: 'Fitbit', icon: '◆', color: '#00b0b9' },
  { id: 'garmin', name: 'Garmin', icon: '▲', color: '#2e7bd6' },
];

export default function WellnessScreen() {
  const insets = useSafeAreaInsets();
  const { update } = useProfile();
  const { connectAppleHealth } = useHealth();
  const [sel, setSel] = useState<string[]>([]);
  const toggle = async (id: string) => {
    if (id === 'apple') {
      // Apple Health connects for real (in a dev/production build).
      const ok = await connectAppleHealth();
      if (ok || sel.includes('apple')) {
        setSel((s) => (s.includes('apple') ? s.filter((x) => x !== 'apple') : [...s, 'apple']));
      } else {
        // Not available (Expo Go / Android) — still let them mark intent.
        setSel((s) => (s.includes('apple') ? s.filter((x) => x !== 'apple') : [...s, 'apple']));
      }
      return;
    }
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const finish = (connected: string[]) => {
    update({ wellnessConnected: connected });
    router.replace('/loading');
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24, paddingHorizontal: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <Eyebrow>Step 5 of 5</Eyebrow>
          <Text variant="h1" style={{ marginTop: 12, marginBottom: 6 }}>
            Would you like Tara to understand your body rhythm too?
          </Text>
          <Text variant="tiny" style={{ marginBottom: 22 }}>
            Connect Apple Health to blend your real sleep, recovery and HRV with your chart. Others coming soon.
          </Text>

          {SOURCES.map((s) => {
            const on = sel.includes(s.id);
            return (
              <Pressable key={s.id} onPress={() => toggle(s.id)} style={[styles.row, on && styles.rowOn]}>
                <View style={styles.left}>
                  <View style={styles.iconBox}>
                    <Text style={{ fontSize: 18, color: s.color }}>{s.icon}</Text>
                  </View>
                  <Text variant="body">{s.name}</Text>
                </View>
                <View style={[styles.badge, on && styles.badgeOn]}>
                  <Text variant="tiny" color={on ? '#a8c6a3' : colors.goldSoft}>{on ? '✓ Connected' : 'Connect'}</Text>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>

        <View style={{ height: 18 }} />
        <GoldButton label={sel.length ? 'Connect Wellness' : 'Continue'} onPress={() => finish(sel)} />
        <View style={{ height: 10 }} />
        <GhostButton label="Skip For Now" onPress={() => finish([])} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
    marginBottom: 11, backgroundColor: colors.card,
  },
  rowOn: { borderColor: 'rgba(126,155,122,0.5)', backgroundColor: 'rgba(126,155,122,0.1)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  iconBox: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badge: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 14 },
  badgeOn: { borderColor: 'rgba(126,155,122,0.5)', backgroundColor: 'rgba(126,155,122,0.15)' },
});
