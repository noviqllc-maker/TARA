// app/(onboarding)/notifications.tsx — Screen 3: notification primer + terminal
// onboarding step. Self-skips (straight to Home) if permission was already decided.
// Reuses the notification scheduling from @/lib/notifications (no duplication).
import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import {
  enableDailyNotifications, markNotificationPrimerSeen, shouldShowNotificationPrimer,
} from '@/lib/notifications';
import { colors, radius, spacing } from '@/theme';

// Mocked preview cards — show the new VARIED titles (not one fixed "day at a glance").
const CARDS = [
  { title: 'Planetary Shift', body: 'The Moon has entered a new nakshatra.' },
  { title: "Today's Cosmic Briefing", body: 'Your energy today looks different than yesterday.' },
  { title: 'Your Daily Guidance', body: 'Your personal guidance is ready.' },
];

export default function NotificationsPrimer() {
  const insets = useSafeAreaInsets();
  const chart = useChart();
  const { profile, update } = useProfile();
  const nav = useNavigation();
  const [ready, setReady] = useState(false); // primer gate resolved → show it
  const [busy, setBusy] = useState(false);

  useEffect(() => { nav.setOptions?.({ gestureEnabled: false }); }, [nav]);

  // Onboarding is complete once we leave this (final) screen for Home.
  const finishOnboarding = () => { update({ onboarded: true }); router.replace('/(tabs)/home'); };

  // Gate: never re-show once permission is granted/denied (or already primed) — skip
  // straight to Home in that case.
  useEffect(() => {
    (async () => { (await shouldShowNotificationPrimer()) ? setReady(true) : finishOnboarding(); })();
  }, []);

  const onTurnOn = async () => {
    setBusy(true);
    await markNotificationPrimerSeen();
    await enableDailyNotifications(chart, profile.birthDate, profile.userPriorities ?? []); // requests permission + schedules if granted
    setBusy(false);
    finishOnboarding();
  };
  const onSkip = async () => { await markNotificationPrimerSeen(); finishOnboarding(); };

  if (!ready) {
    return (
      <View style={{ flex: 1 }}>
        <CosmicBackground intense />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <View style={[styles.root, { paddingTop: insets.top + 44, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
          <Text variant="screenTitle" style={{ textAlign: 'center' }}>
            Never miss an important planetary shift.
          </Text>
          <Text variant="body" color={colors.muted} style={{ textAlign: 'center', marginTop: 12, paddingHorizontal: 12 }}>
            Tara will notify you when your chart reveals opportunities, challenges, or important timing for decisions.
          </Text>
        </Animated.View>

        {/* Phone illustration with mocked notification cards */}
        <View style={styles.phoneWrap}>
          <Animated.View entering={FadeInUp.duration(600).delay(150)} style={styles.phone}>
            <Text variant="metadata" color={colors.mutedDim} style={{ textAlign: 'center', marginBottom: 14 }}>9:41</Text>
            {CARDS.map((c, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.icon}><Text style={{ color: '#1a1018', fontSize: 13 }}>✦</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="caption" color={colors.cream}>{c.title}</Text>
                    <Text variant="metadata" color={colors.mutedDim}>now</Text>
                  </View>
                  <Text variant="metadata" color={colors.muted} style={{ marginTop: 3 }}>{c.body}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </View>

        <View>
          <GoldButton label={busy ? 'Turning on…' : 'TURN ON NOTIFICATIONS'} onPress={onTurnOn} disabled={busy} />
          <Pressable onPress={onSkip} hitSlop={8} style={{ marginTop: 16 }} disabled={busy}>
            <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>Not right now</Text>
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
