// app/(onboarding)/notifications.tsx
// Notification primer — shown once after sign-in, before Home (gated by
// shouldShowNotificationPrimer). Co-Star-style layout, restyled in Tara's brand.
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { enableDailyNotifications, markNotificationPrimerSeen } from '@/lib/notifications';
import { colors, radius, spacing } from '@/theme';

const CARDS = [
  'The Moon changed nakshatras overnight — your energy shifts with it.',
  'Something is working in your favor today.',
  'Before today gets busy, there’s one thing worth knowing.',
];

export default function NotificationsPrimer() {
  const insets = useSafeAreaInsets();
  const chart = useChart();
  const { profile } = useProfile();
  const [busy, setBusy] = useState(false);

  const finish = () => router.replace('/(tabs)/home');

  const onTurnOn = async () => {
    setBusy(true);
    await markNotificationPrimerSeen();
    await enableDailyNotifications(chart, profile.birthDate); // requests permission + schedules if granted
    setBusy(false);
    finish();
  };
  const onSkip = async () => { await markNotificationPrimerSeen(); finish(); };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <View style={[styles.root, { paddingTop: insets.top + 44, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
          <Text variant="h1" style={{ textAlign: 'center', fontSize: 30 }}>Let the stars find you.</Text>
          <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center', marginTop: 12, lineHeight: 20, paddingHorizontal: 16 }}>
            One thoughtful message each morning, written from your chart.
          </Text>
        </Animated.View>

        {/* Phone illustration with mocked notification cards */}
        <View style={styles.phoneWrap}>
          <Animated.View entering={FadeInUp.duration(600).delay(150)} style={styles.phone}>
            <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginBottom: 14, fontSize: 11 }}>9:41</Text>
            {CARDS.map((body, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.icon}><Text style={{ color: '#1a1018', fontSize: 13 }}>✦</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="tiny" color={colors.cream} style={{ fontWeight: '700', fontSize: 12 }}>Your day at a glance</Text>
                    <Text variant="tiny" color={colors.mutedDim} style={{ fontSize: 10 }}>now</Text>
                  </View>
                  <Text variant="tiny" color={colors.muted} style={{ marginTop: 3, lineHeight: 15, fontSize: 11.5 }}>{body}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </View>

        <View>
          <GoldButton label={busy ? 'Turning on…' : 'TURN ON NOTIFICATIONS'} onPress={onTurnOn} disabled={busy} />
          <Pressable onPress={onSkip} hitSlop={8} style={{ marginTop: 16 }} disabled={busy}>
            <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center' }}>Not right now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  phoneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phone: {
    width: 268, borderRadius: 32, paddingVertical: 20, paddingHorizontal: 14,
    backgroundColor: 'rgba(18,12,28,0.6)', borderColor: colors.line, borderWidth: 1,
  },
  card: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(244,236,225,0.06)', borderColor: colors.line, borderWidth: 1,
    borderRadius: 16, padding: 11, marginBottom: 10,
  },
  icon: {
    width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
});
