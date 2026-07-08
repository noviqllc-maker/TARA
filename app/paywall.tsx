// app/paywall.tsx
// Prices come EXCLUSIVELY from RevenueCat (live, local-currency). There are zero
// hardcoded price numbers in this file — the savings % and effective monthly rate
// are derived from the live package prices.
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton } from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, radius, spacing } from '@/theme';

const FEATURES = [
  'Unlimited Tara AI conversations',
  'Full yearly forecast & timing windows',
  'Deep compatibility reports',
  'Complete Life Timeline & dashas',
  'AI memory across conversations',
  'No ads — ever',
];

type Tier = 'annual' | 'monthly';

// App Review 3.1.2: paywalls must link to a privacy policy and terms of use (EULA).
const PRIVACY_URL = 'https://tarawellness.org/privacy';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

// Format a computed amount in the store's currency. Prefers Intl.NumberFormat;
// falls back to reusing the currency symbol from a RevenueCat priceString.
function formatMoney(amount: number, currencyCode?: string, samplePriceString?: string): string {
  try {
    if (currencyCode) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    }
  } catch {}
  if (samplePriceString) {
    const symbol = samplePriceString.replace(/[\d.,\s ]/g, '');
    return `${symbol}${amount.toFixed(2)}`;
  }
  return amount.toFixed(2);
}

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { packages, purchase, restore, refresh, isPremium, loading } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Tier>('annual');

  // Resolve the monthly/annual packages from the current offering.
  const monthlyPkg =
    packages.find((p: any) => p.packageType === 'MONTHLY') ??
    packages.find((p: any) => p.identifier === '$rc_monthly');
  const annualPkg =
    packages.find((p: any) => p.packageType === 'ANNUAL') ??
    packages.find((p: any) => p.identifier === '$rc_annual');
  const plansReady = !!monthlyPkg?.product && !!annualPkg?.product;

  // Derive savings + effective monthly from the LIVE prices only.
  const monthlyPrice: number | undefined = monthlyPkg?.product?.price;
  const annualPrice: number | undefined = annualPkg?.product?.price;
  const currency: string | undefined = annualPkg?.product?.currencyCode;
  let savingsPct: number | null = null;
  let effectiveMonthly = '';
  if (typeof monthlyPrice === 'number' && typeof annualPrice === 'number' && monthlyPrice > 0) {
    savingsPct = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
    effectiveMonthly = formatMoney(annualPrice / 12, currency, annualPkg?.product?.priceString);
  }

  const onBuy = async () => {
    const pkg = selected === 'annual' ? annualPkg : monthlyPkg;
    if (!pkg) return;
    setBusy(true);
    try {
      const ok = await purchase(pkg); // passes the RevenueCat package object
      if (ok) { Alert.alert('Welcome to Premium ✦', 'All features unlocked.'); router.back(); }
      // ok === false → user cancelled → stay silent (no alert)
    } catch {
      Alert.alert('Purchase failed', 'Something went wrong and no charge was made. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    Alert.alert(ok ? 'Restored ✦' : 'Nothing to restore', ok ? 'Premium is active.' : 'No previous purchase found.');
    if (ok) router.back();
  };

  const onRetry = async () => {
    setBusy(true);
    await refresh();
    setBusy(false);
  };

  const TIERS: { key: Tier; label: string; period: string; pkg: any }[] = [
    { key: 'annual', label: 'Annual', period: 'year', pkg: annualPkg },
    { key: 'monthly', label: 'Monthly', period: 'month', pkg: monthlyPkg },
  ];

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 30 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 18 }}>
          <Text variant="body" color={colors.muted}>✕ Close</Text>
        </Pressable>

        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={{ fontSize: 30, lineHeight: 40, textAlign: 'center', includeFontPadding: false, color: colors.gold }}>✦</Text>
          <Text variant="h1" style={{ textAlign: 'center', marginTop: 12 }}>Tara Premium</Text>
          <Text variant="tiny" style={{ textAlign: 'center', marginTop: 8, marginBottom: 28 }}>
            Your full Vedic life guide — unlimited and ad-free.
          </Text>

          <View style={{ gap: 14, marginBottom: 28 }}>
            {FEATURES.map((f) => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: colors.gold, fontSize: 16 }}>✓</Text>
                <Text variant="body" style={{ flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>

          {isPremium ? (
            <Text variant="serif" style={{ textAlign: 'center', color: colors.sage, fontSize: 18 }}>
              ✦ You're a Premium member
            </Text>
          ) : loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.gold} />
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 10 }}>Loading plans…</Text>
            </View>
          ) : !plansReady ? (
            <View style={styles.stateBox}>
              <Text variant="serif" style={{ fontSize: 16, textAlign: 'center' }}>Unable to load plans</Text>
              <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center', marginTop: 6 }}>
                Please check your connection and try again.
              </Text>
              <Pressable onPress={onRetry} disabled={busy} style={styles.retryBtn}>
                {busy ? <ActivityIndicator color={colors.gold} size="small" /> : <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>Try again</Text>}
              </Pressable>
            </View>
          ) : (
            <>
              {/* Tiers — Annual selected by default */}
              <View style={{ gap: 12, marginBottom: 24 }}>
                {TIERS.map(({ key, label, period, pkg }) => {
                  const active = selected === key;
                  const isAnnual = key === 'annual';
                  return (
                    <Pressable key={key} onPress={() => setSelected(key)} style={[styles.tier, active && styles.tierActive]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text variant="serif" style={{ fontSize: 16 }}>{label}</Text>
                          {isAnnual && savingsPct != null && savingsPct > 0 && (
                            <View style={styles.badge}>
                              <Text variant="tiny" color="#1a1018" style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>
                                SAVE {savingsPct}%
                              </Text>
                            </View>
                          )}
                        </View>
                        {isAnnual && (
                          <Text variant="tiny" color={colors.muted} style={{ marginTop: 5, fontSize: 11.5, lineHeight: 16 }}>
                            1 Year Upfront{effectiveMonthly ? ` · just ${effectiveMonthly}/mo` : ''}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="serif" color={colors.goldSoft} style={{ fontSize: 17 }}>{pkg.product.priceString}</Text>
                        <Text variant="tiny" color={colors.muted}>per {period}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <GoldButton
                label={busy
                  ? <ActivityIndicator color="#1a1018" />
                  : `Start Premium — ${(selected === 'annual' ? annualPkg : monthlyPkg).product.priceString}/${selected === 'annual' ? 'year' : 'month'}`}
                onPress={onBuy}
                disabled={busy}
              />
              <Pressable onPress={onRestore} disabled={busy} style={{ marginTop: 16 }}>
                <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center' }}>Restore Purchases</Text>
              </Pressable>

              {/* App Review 3.1.2: price, period, auto-renew terms + Privacy/Terms links. */}
              <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: 18, fontSize: 10, lineHeight: 15 }}>
                {(selected === 'annual' ? annualPkg : monthlyPkg).product.priceString}/{selected === 'annual' ? 'year' : 'month'}, auto-renewing. Your Apple account is charged at confirmation and renews automatically unless canceled at least 24 hours before the end of the current period. Manage or cancel anytime in your account settings.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
                  <Text variant="tiny" color={colors.gold} style={{ fontSize: 10.5 }}>Privacy Policy</Text>
                </Pressable>
                <Text variant="tiny" color={colors.mutedDim} style={{ fontSize: 10.5 }}>·</Text>
                <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
                  <Text variant="tiny" color={colors.gold} style={{ fontSize: 10.5 }}>Terms of Use</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tier: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
    backgroundColor: colors.card, paddingVertical: 16, paddingHorizontal: 16,
  },
  tierActive: { borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.10)' },
  badge: {
    alignSelf: 'flex-start', backgroundColor: colors.goldSoft,
    borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9,
  },
  stateBox: { alignItems: 'center', paddingVertical: 28 },
  retryBtn: {
    marginTop: 16, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill,
    paddingVertical: 10, paddingHorizontal: 24,
  },
});
