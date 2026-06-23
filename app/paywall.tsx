// app/paywall.tsx
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, Eyebrow, GoldButton } from '@/components/ui';
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

// Subscription tiers — prices + product IDs ready to wire to RevenueCat later.
const PRODUCTS = {
  monthly: { id: 'tara_premium_monthly', label: 'Monthly', price: '$4.99', period: 'month' },
  annual: { id: 'tara_premium_annual', label: 'Annual', price: '$39.99', period: 'year' },
} as const;
const ANNUAL_BADGE = 'Save 33% · 4 months free';
type Tier = keyof typeof PRODUCTS;

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { packages, purchase, restore, available, isPremium } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Tier>('annual');

  const pkg = packages[0]; // your offering's first package

  const onBuy = async () => {
    if (!available || !pkg) {
      Alert.alert(
        'Almost there',
        'In-app purchases activate in a production build with RevenueCat configured. See PREMIUM-SETUP.md.',
      );
      return;
    }
    setBusy(true);
    const ok = await purchase(pkg);
    setBusy(false);
    if (ok) { Alert.alert('Welcome to Premium ✦', 'All features unlocked.'); router.back(); }
    else Alert.alert('Purchase not completed', 'No charge was made.');
  };

  const onRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    Alert.alert(ok ? 'Restored ✦' : 'Nothing to restore', ok ? 'Premium is active.' : 'No previous purchase found.');
    if (ok) router.back();
  };

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
          ) : (
            <>
              {/* Subscription tiers — Annual selected by default */}
              <View style={{ gap: 12, marginBottom: 24 }}>
                {(['annual', 'monthly'] as const).map((key) => {
                  const t = PRODUCTS[key];
                  const active = selected === key;
                  return (
                    <Pressable key={key} onPress={() => setSelected(key)} style={[styles.tier, active && styles.tierActive]}>
                      <View style={{ flex: 1 }}>
                        <Text variant="serif" style={{ fontSize: 16 }}>{t.label}</Text>
                        {key === 'annual' && (
                          <View style={styles.badge}>
                            <Text variant="tiny" color="#1a1018" style={{ fontSize: 10, fontWeight: '600' }}>{ANNUAL_BADGE}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="serif" color={colors.goldSoft} style={{ fontSize: 17 }}>{t.price}</Text>
                        <Text variant="tiny" color={colors.muted}>per {t.period}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <GoldButton
                label={busy ? <ActivityIndicator color="#1a1018" /> : `Start Premium — ${PRODUCTS[selected].price}/${PRODUCTS[selected].period}`}
                onPress={onBuy}
                disabled={busy}
              />
              <Pressable onPress={onRestore} disabled={busy} style={{ marginTop: 16 }}>
                <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center' }}>Restore purchase</Text>
              </Pressable>
              <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: 18, fontSize: 10, lineHeight: 15 }}>
                Billed monthly through your app store. Cancel anytime in your account settings.
                Subscription auto-renews unless turned off at least 24h before the period ends.
              </Text>
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
    alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.goldSoft,
    borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9,
  },
});
