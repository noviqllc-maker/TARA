// app/(tabs)/profile.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, Divider } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import ProfileEditForm from '@/components/ProfileEditForm';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { lifePathNumber, chineseZodiac } from '@/lib/numerology';
import { pricing } from '@/lib/pricing';
import { colors, radius, spacing } from '@/theme';

// In-app purchase product IDs (real IAP wired later).
const SHOP_PRODUCTS = {
  yearAhead: 'shop_year_ahead',
  birthBlueprint: 'shop_birth_blueprint',
  doshaRemedies: 'shop_dosha_remedies',
} as const;

const SHOP_ITEMS = [
  { id: SHOP_PRODUCTS.yearAhead, title: 'Year Ahead Report', desc: 'Your personalized forecast for the next 12 months.', price: '$7.99' },
  { id: SHOP_PRODUCTS.birthBlueprint, title: 'Birth Blueprint', desc: 'A deep reading of your natal chart.', price: '$6.99' },
  { id: SHOP_PRODUCTS.doshaRemedies, title: 'Dosha Remedies', desc: 'Discover the doshas in your chart and personalized remedies to restore balance.', price: '$7.99' },
];

const SETTINGS_ROWS = [
  { label: 'Notifications', route: '/settings/notifications' },
  { label: 'Privacy', route: '/settings/privacy' },
  { label: 'Language', route: '/settings/language' },
];

export default function Profile() {
  const { profile, reset } = useProfile();
  const chart = useChart();
  const { isPremium } = useSubscription();
  const [editing, setEditing] = useState(false);
  const [comingSoon, setComingSoon] = useState<string[]>([]);

  // Deep-link: Home's "Shop" Quick Action passes { scrollTo: 'shop' } to land here.
  const params = useLocalSearchParams<{ scrollTo?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const shopY = useRef(0);
  const didScroll = useRef(false);
  const maybeScrollToShop = () => {
    if (params.scrollTo === 'shop' && !didScroll.current && shopY.current > 0) {
      didScroll.current = true;
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ y: Math.max(0, shopY.current - 12), animated: true }),
      );
    }
  };
  useEffect(() => { maybeScrollToShop(); }, [params.scrollTo]);

  const onPurchase = (productId: string) => {
    console.log('[shop] unlock tapped:', productId); // TODO: real IAP
    setComingSoon((s) => (s.includes(productId) ? s : [...s, productId]));
  };

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

  const doReset = () =>
    Alert.alert('Log out & reset', 'This clears your local profile and restarts onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { reset(); router.replace('/intro'); } },
    ]);

  return (
    <Screen ref={scrollRef}>
      <Animated.View entering={FadeInDown.duration(500)} style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Profile</Eyebrow>
            <Text variant="h1" style={{ marginTop: 8 }}>{profile.name || "Friend"}</Text>
          </View>
          {!editing && (
            <Pressable onPress={() => setEditing(true)} style={styles.editBtn}>
              <Text variant="tiny" color="#1a1018" style={{ fontWeight: '600' }}>Edit</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {editing ? (
        <ProfileEditForm onDone={() => setEditing(false)} />
      ) : (
        <Card style={{ marginBottom: spacing.lg }}>
          {facts.map(([k, v], i) => (
            <View key={k} style={[styles.row, i === facts.length - 1 && { borderBottomWidth: 0 }]}>
              <Text variant="tiny" color={colors.muted}>{k}</Text>
              <Text variant="body" color={colors.goldSoft} style={{ fontSize: 13.5 }}>{v}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Shop */}
      <View onLayout={(e) => { shopY.current = e.nativeEvent.layout.y; maybeScrollToShop(); }}>
        <Eyebrow>Shop</Eyebrow>
        <View style={{ gap: 12, marginTop: 12, marginBottom: spacing.lg }}>
          {SHOP_ITEMS.map((item) => {
            const soon = comingSoon.includes(item.id);
            return (
              <Card key={item.id}>
                <Text variant="serif" style={{ fontSize: 16 }}>{item.title}</Text>
                <Text variant="tiny" style={{ marginTop: 4 }}>{item.desc}</Text>
                <View style={styles.shopRow}>
                  <Text variant="body" color={colors.goldSoft} style={{ fontWeight: '600' }}>{item.price}</Text>
                  <Pressable onPress={() => onPurchase(item.id)} style={[styles.unlockBtn, soon && styles.unlockBtnSoon]}>
                    <Text variant="tiny" color={soon ? colors.muted : '#1a1018'} style={{ fontWeight: '600' }}>
                      {soon ? 'Coming soon' : 'Unlock'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      </View>

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
              Unlimited Tara AI, yearly forecast, deep compatibility, Life Timeline, AI memory, and no ads — {pricing.monthly.display}/month or {pricing.annual.display}/year.
            </Text>
            <Pressable style={styles.upgrade} onPress={() => router.push('/paywall')}>
              <Text variant="body" color="#1a1018" style={{ fontWeight: '600' }}>Upgrade to Premium</Text>
            </Pressable>
          </>
        )}
      </Card>

      {/* Settings */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Settings</Eyebrow>
        <View style={{ marginTop: 6 }}>
          {SETTINGS_ROWS.map((r) => (
            <Pressable key={r.label} style={styles.row} onPress={() => router.push(r.route as any)}>
              <Text variant="body" style={{ fontSize: 14 }}>{r.label}</Text>
              <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
            </Pressable>
          ))}
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text variant="body" style={{ fontSize: 14 }}>Dark Mode</Text>
            <Switch value disabled trackColor={{ true: colors.gold }} />
          </View>
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
  editBtn: { backgroundColor: colors.goldSoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18, marginLeft: 12 },
  shopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  unlockBtn: { backgroundColor: colors.goldSoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  unlockBtnSoon: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  upgrade: {
    marginTop: 14, backgroundColor: colors.goldSoft, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
});
