// app/(onboarding)/wellness.tsx
import React from 'react';
import { View, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton, GhostButton, Eyebrow } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useHealth } from '@/hooks/useHealth';
import { colors, radius, spacing } from '@/theme';

const SOURCES = [
  { id: 'apple', name: 'Apple Health', icon: '♥', color: '#ff4d6d', available: true },
  { id: 'oura', name: 'Oura', icon: '◯', color: '#cda3ff', available: false },
  { id: 'whoop', name: 'WHOOP', icon: '⬡', color: '#e8e8e8', available: false },
  { id: 'fitbit', name: 'Fitbit', icon: '◆', color: '#00b0b9', available: false },
  { id: 'garmin', name: 'Garmin', icon: '▲', color: '#2e7bd6', available: false },
];

export default function WellnessScreen() {
  const insets = useSafeAreaInsets();
  const { update } = useProfile();
  // Single source of truth: the connected state comes from the health hook, not a
  // local flag — so the badge reflects reality (the sheet actually appeared & the
  // flow completed) instead of optimistically showing "Connected".
  const { connected, connectAppleHealth } = useHealth();

  // Apple Health is the only real integration; it connects for real in a dev/
  // production build and safely no-ops in Expo Go (the user can still proceed).
  const connect = async () => {
    console.log('[Onboarding] Apple Health Connect tapped'); // task 3: confirms the tap registers
    const res = await connectAppleHealth();
    if (res === 'unavailable') {
      Alert.alert('Dev build required', 'Apple Health works in a development or production build (not Expo Go), on iPhone.');
    } else if (res === 'no-data') {
      Alert.alert('Enable Health data', 'Apple Health is connected, but Tara isn’t receiving data yet. You can turn on categories later in the Health app.');
    }
  };

  const finish = () => {
    update({ wellnessConnected: connected ? ['apple'] : [] });
    // Account step (Sign in with Apple) is the final onboarding step, before home.
    router.replace('/auth' as any);
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
            // Unbuilt integrations: non-tappable, muted "Coming soon".
            if (!s.available) {
              return (
                <View key={s.id} style={[styles.row, styles.rowDisabled]}>
                  <View style={styles.left}>
                    <View style={styles.iconBox}>
                      <Text style={{ fontSize: 18, color: s.color }}>{s.icon}</Text>
                    </View>
                    <Text variant="body" color={colors.muted}>{s.name}</Text>
                  </View>
                  <View style={styles.badgeSoon}>
                    <Text variant="tiny" color={colors.muted}>Coming soon</Text>
                  </View>
                </View>
              );
            }
            // Apple Health: real, tappable Connect. Connected state = the hook (truth).
            const on = connected;
            return (
              <Pressable key={s.id} onPress={connect} style={[styles.row, on && styles.rowOn]}>
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
        <GoldButton label="Continue" onPress={finish} />
        <View style={{ height: 10 }} />
        <GhostButton label="Skip For Now" onPress={finish} />
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
  rowDisabled: { opacity: 0.5 },
  badgeSoon: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill,
    paddingVertical: 7, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
