// app/(tabs)/profile.tsx
import React from 'react';
import { View, Pressable, StyleSheet, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, Divider } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { lifePathNumber, chineseZodiac } from '@/lib/numerology';
import { colors, spacing } from '@/theme';

export default function Profile() {
  const { profile, reset } = useProfile();
  const chart = useChart();
  const { isPremium } = useSubscription();

  const facts: [string, string][] = [
    ['Name', profile.name || '—'],
    ['Birth Date', profile.birthDate || '—'],
    ['Birth Time', profile.birthTime || '—'],
    ['Birth Place', profile.birthPlace || '—'],
    ['Sun Sign', chart?.sunSign ?? '—'],
    ['Moon Sign', chart?.moonSign ?? '—'],
    ['Rising Sign', chart?.ascendant.sign ?? '—'],
    ['Nakshatra', chart ? `${chart.nakshatra} (pada ${chart.nakshatraPada})` : '—'],
    ['Ruling Planet', chart?.rulingPlanet ?? '—'],
    ['Life Path Number', profile.birthDate ? String(lifePathNumber(profile.birthDate)) : '—'],
    ['Chinese Zodiac', profile.birthDate ? chineseZodiac(profile.birthDate) : '—'],
  ];

  const settings = ['Saved Reports', 'Reading History', 'Notification Settings', 'Privacy Settings', 'Language'];

  const doReset = () =>
    Alert.alert('Log out & reset', 'This clears your local profile and restarts onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { reset(); router.replace('/intro'); } },
    ]);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Eyebrow>Profile</Eyebrow>
        <Text variant="h1" style={{ marginTop: 8, marginBottom: spacing.lg }}>{profile.name || "Friend"}</Text>
      </Animated.View>

      <Card style={{ marginBottom: spacing.lg }}>
        {facts.map(([k, v], i) => (
          <View key={k} style={[styles.row, i === facts.length - 1 && { borderBottomWidth: 0 }]}>
            <Text variant="tiny" color={colors.muted}>{k}</Text>
            <Text variant="body" color={colors.goldSoft} style={{ fontSize: 13.5 }}>{v}</Text>
          </View>
        ))}
      </Card>

      {/* Subscription */}
      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Subscription · {isPremium ? 'Premium ✦' : 'Free'}</Eyebrow>
        {isPremium ? (
          <>
            <Text variant="serif" style={{ fontSize: 17, marginTop: 8 }}>You're a Premium member</Text>
            <Text variant="tiny" style={{ marginTop: 6 }}>
              All features unlocked. Manage your subscription in your app store account settings.
            </Text>
          </>
        ) : (
          <>
            <Text variant="serif" style={{ fontSize: 17, marginTop: 8 }}>Unlock Tara Premium</Text>
            <Text variant="tiny" style={{ marginTop: 6 }}>
              Unlimited Tara AI, yearly forecast, deep compatibility, Life Timeline, AI memory, and no ads — $9.99/month.
            </Text>
            <Pressable style={styles.upgrade} onPress={() => router.push('/paywall')}>
              <Text variant="body" color="#1a1018" style={{ fontWeight: '600' }}>Upgrade to Premium</Text>
            </Pressable>
          </>
        )}
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        {settings.map((s, i) => (
          <Pressable key={s} style={[styles.row, i === settings.length - 1 && { borderBottomWidth: 0 }]}>
            <Text variant="body" style={{ fontSize: 14 }}>{s}</Text>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text variant="body" style={{ fontSize: 14 }}>Dark Mode</Text>
          <Switch value disabled trackColor={{ true: colors.gold }} />
        </View>
      </Card>

      <Pressable onPress={doReset}>
        <Text variant="body" color={colors.rose} style={{ textAlign: 'center' }}>Log Out</Text>
      </Pressable>

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)',
  },
  upgrade: {
    marginTop: 14, backgroundColor: colors.goldSoft, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
});
