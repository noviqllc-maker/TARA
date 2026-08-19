// app/(tabs)/profile.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Switch, Alert, ScrollView, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, Divider } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { ShopProductId } from '@/lib/products';
import { PREMIUM_BENEFITS, PREMIUM_COPY } from '@/lib/premium';
import { lifePathNumber, chineseZodiac } from '@/lib/numerology';
import { colors, radius, spacing } from '@/theme';

// Non-consumable shop products. `id` MUST be a real product ID (typed against the
// single source of truth). The PRICE is never hardcoded — it comes from each
// product's RevenueCat priceString. Content lives here; price + ownership come from RC.
const SHOP_ITEMS: { id: ShopProductId; title: string; description: string; features: string; cta: string }[] = [
  {
    id: 'yearaheadtarareport1',
    title: 'Year Ahead',
    description: 'Your next 12 months, month by month: dasha periods, major transits, timing windows and a strength score for each. A living view that stays current, computed fresh from your chart every time you open it. Yours forever with one purchase; no subscription needed.',
    features: 'Living 12-month view • Dasha & transits • Timing windows • Month strength',
    cta: 'Unlock Your Year',
  },
  {
    id: 'birthblueprinttara1',
    title: 'Soul Blueprint',
    description: 'Your complete natal reading: core signature, all nine grahas by house and sign, the twelve houses, the notable yogas actually in your chart, and a navamsa lens. A permanent keepsake, computed from your birth chart.',
    features: 'Core signature • 9 grahas • 12 houses • Yogas • Navamsa',
    cta: 'Reveal My Blueprint',
  },
  {
    id: 'dosharemediestara1',
    title: 'Personal Remedies',
    description: 'Traditional guidance drawn from your chart: remedies for the planetary period you’re living through now (mantra, day, colour, donation) plus your Sade Sati status, the chart conditions actually present, a natal strengthening set, and a weekly rhythm. Stays current with your dasha.',
    features: 'Current dasha remedies • Sade Sati • Chart conditions • Gemstones • Weekly rhythm',
    cta: 'Get My Remedies',
  },
];

const SETTINGS_ROWS = [
  { label: 'Account', route: '/settings/account' },
  { label: 'Notifications', route: '/settings/notifications' },
  { label: 'Privacy', route: '/settings/privacy' },
  { label: 'Language', route: '/settings/language' },
];

export default function Profile() {
  const { profile, reset } = useProfile();
  const chart = useChart();
  const { isPremium, shopProducts, shopStatus, retryShop, owns, purchaseShop, restore, available } = useSubscription();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

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

  const onUnlock = async (item: { id: string; title: string }) => {
    if (!available) {
      Alert.alert(
        'Almost there',
        'In-app purchases activate in a production build with RevenueCat configured. See PREMIUM-SETUP.md.',
      );
      return;
    }
    setBusyId(item.id);
    try {
      const ok = await purchaseShop(item.id);
      if (ok) Alert.alert('Unlocked ✦', `${item.title} is now yours. Restore it anytime on any device.`);
      // ok === false → user cancelled → stay silent
    } catch {
      Alert.alert('Purchase failed', 'Something went wrong and no charge was made. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const onManageSubscription = () => {
    Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() =>
      Alert.alert('Manage subscription', 'Open the App Store, tap your account, then Subscriptions to manage or cancel.'),
    );
  };

  // All three reports are now rich, computed in-app experiences with their own screens
  // (no AI). Route each owner to its dedicated view.
  const REPORT_ROUTE: Record<string, string> = {
    yearaheadtarareport1: '/report/year-ahead',
    birthblueprinttara1: '/report/blueprint',
    dosharemediestara1: '/report/remedies',
  };
  const onView = (item: { id: string }) =>
    router.push((REPORT_ROUTE[item.id] ?? { pathname: '/report/[kind]', params: { kind: item.id } }) as any);
  // Dev-only: QA report content with real charts, without a purchase.
  const onPreview = (item: { id: string }) =>
    router.push({ pathname: '/report/[kind]', params: { kind: item.id, preview: '1' } } as any);

  const onRestore = async () => {
    if (!available) {
      Alert.alert('Restore purchases', 'Restore works in a production build with RevenueCat configured.');
      return;
    }
    setRestoring(true);
    const ok = await restore();
    setRestoring(false);
    Alert.alert(ok ? 'Restored ✦' : 'Nothing to restore', ok ? 'Your purchases are active on this device.' : 'No previous purchases found.');
  };

  const facts: [string, string][] = [
    ['Name', profile.name || '–'],
    ['Birth Date', profile.birthDate || '–'],
    ['Birth Time', profile.birthTime || '–'],
    ['Birth Place', profile.birthPlace || '–'],
    ['Sun Sign', chart?.sunSign ?? '–'],
    ['Moon Sign', chart?.moonSign ?? '–'],
    ['Rising Sign', chart?.ascendant.sign ?? '–'],
    ['Nakshatra', chart ? `${chart.nakshatra} (pada ${chart.nakshatraPada})` : '–'],
    ['Ruling Planet', chart?.rulingPlanet ?? '–'],
    ['Life Path Number', profile.birthDate ? String(lifePathNumber(profile.birthDate)) : '–'],
    ['Chinese Zodiac', profile.birthDate ? chineseZodiac(profile.birthDate) : '–'],
  ];

  const doReset = () =>
    Alert.alert('Log out & reset', 'This clears your local profile and restarts onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { reset(); router.replace('/intro'); } },
    ]);

  return (
    <Screen ref={scrollRef}>
      <Animated.View entering={FadeInDown.duration(500)} style={{ marginBottom: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Profile</Eyebrow>
          <Text variant="h1" style={{ marginTop: 8 }}>{profile.name || "Friend"}</Text>
        </View>
      </Animated.View>

      {/* Birth details & computed placements — read-only. */}
      <Card style={{ marginBottom: spacing.lg }}>
        {facts.map(([k, v], i) => (
          <View key={k} style={[styles.row, i === facts.length - 1 && { borderBottomWidth: 0 }]}>
            <Text variant="tiny" color={colors.muted}>{k}</Text>
            <Text variant="body" color={colors.goldSoft} style={{ fontSize: 13.5 }}>{v}</Text>
          </View>
        ))}
      </Card>

      {/* Shop */}
      <View onLayout={(e) => { shopY.current = e.nativeEvent.layout.y; maybeScrollToShop(); }}>
        <Eyebrow>Shop</Eyebrow>
        <View style={{ gap: 12, marginTop: 12 }}>
          {/* Premium subscription promo (free users only). Reports below are separate
              one-time purchases; this card never claims they are included. Price lives on
              the paywall, from RevenueCat. */}
          {!isPremium ? (
            <Card solid glow>
              <Eyebrow color={colors.gold}>Tara Premium</Eyebrow>
              <Text variant="serif" style={{ fontSize: 16.5, marginTop: 6 }}>Your chart, explained every day</Text>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 19 }}>
                Personalized Daily Panchāṅga and the Muhūrta Planner (auspicious dates for marriage, travel,
                business, moving, and more), plus Ask Tara all month, Weekly and Monthly Guidance, the full
                Daily Insights, and health-aware guidance.
              </Text>
              <Pressable style={styles.upgrade} onPress={() => router.push('/paywall')}>
                <Text variant="body" color="#1a1018" style={{ fontWeight: '600' }}>See Premium</Text>
              </Pressable>
            </Card>
          ) : null}
          {SHOP_ITEMS.map((item) => {
            const owned = owns(item.id);
            const busy = busyId === item.id;
            // Price is ALWAYS from RevenueCat (local currency) — never hardcoded.
            const priceString = shopProducts[item.id]?.priceString as string | undefined;
            const priceLoading = shopStatus === 'loading' && !priceString;
            // Fetch finished but returned no price → manual retry only (no auto-loop).
            const priceUnavailable = shopStatus === 'empty' && !priceString;

            // Verb is per-item; price is ALWAYS from RevenueCat. The button is only
            // actionable once we have a real price — otherwise it's a disabled state.
            const ctaLabel = busy
              ? 'Processing…'
              : priceLoading
                ? 'Loading…'
                : priceString
                  ? `${item.cta} · ${priceString}`
                  : item.cta;
            const ctaDisabled = busy || !priceString;

            return (
              <Card key={item.id}>
                <Text variant="serif" style={{ fontSize: 16 }}>{item.title}</Text>
                <Text variant="tiny" style={{ marginTop: 4, lineHeight: 17 }}>{item.description}</Text>
                <Text variant="tiny" color={colors.muted} style={{ marginTop: 6, fontSize: 11 }}>{item.features}</Text>
                {owned ? (
                  <View style={styles.shopRow}>
                    <Text variant="body" color={colors.sage} style={{ fontWeight: '600' }}>✓ Unlocked</Text>
                    <Pressable onPress={() => onView(item)} style={styles.unlockBtn}>
                      <Text variant="tiny" color="#1a1018" style={{ fontWeight: '600' }}>View</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={priceString ? () => onUnlock(item) : undefined}
                      disabled={ctaDisabled}
                      style={[styles.shopCta, ctaDisabled && styles.unlockBtnSoon]}
                    >
                      <Text variant="body" color={ctaDisabled ? colors.muted : '#1a1018'} style={{ fontWeight: '600' }}>
                        {ctaLabel}
                      </Text>
                    </Pressable>
                    {/* Single manual retry — never an automatic re-fetch loop. */}
                    {priceUnavailable && (
                      <Pressable onPress={retryShop} style={styles.previewBtn}>
                        <Text variant="tiny" color={colors.gold}>Prices unavailable: tap to retry</Text>
                      </Pressable>
                    )}
                  </>
                )}
                {__DEV__ && !owned && (
                  <Pressable onPress={() => onPreview(item)} style={styles.previewBtn}>
                    <Text variant="tiny" color={colors.muted}>Preview report (dev)</Text>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </View>
        <Pressable onPress={onRestore} disabled={restoring} style={{ marginTop: 12, marginBottom: spacing.lg }}>
          <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center' }}>
            {restoring ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>
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
            <Text variant="body" color={colors.goldSoft} style={{ marginTop: 6, fontSize: 14 }}>
              {PREMIUM_COPY.homeNudgeLine}
            </Text>
            {/* Same benefits as the paywall — single source of truth (PREMIUM_BENEFITS). */}
            <View style={{ marginTop: 12, gap: 8 }}>
              {PREMIUM_BENEFITS.map((b) => (
                <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: colors.gold, fontSize: 13 }}>✓</Text>
                  <Text variant="tiny" style={{ flex: 1, fontSize: 12.5 }}>{b}</Text>
                </View>
              ))}
            </View>
            {/* Prices are shown on the paywall, sourced only from RevenueCat offerings. */}
            <Pressable style={styles.upgrade} onPress={() => router.push('/paywall')}>
              <Text variant="body" color="#1a1018" style={{ fontWeight: '600' }}>Start Premium</Text>
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
          <Pressable style={styles.row} onPress={onManageSubscription}>
            <Text variant="body" style={{ fontSize: 14 }}>Manage Subscription</Text>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={onRestore} disabled={restoring}>
            <Text variant="body" style={{ fontSize: 14 }}>{restoring ? 'Restoring…' : 'Restore Purchases'}</Text>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </Pressable>
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
  shopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  shopCta: { marginTop: 14, alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.pill, paddingVertical: 11 },
  previewBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 4 },
  unlockBtn: { backgroundColor: colors.goldSoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  unlockBtnSoon: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  upgrade: {
    marginTop: 14, backgroundColor: colors.goldSoft, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
});
